use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use tauri::State;

use crate::filesystem::{describe, StudyFile};
use crate::paths::{unique_in_dir, DOCUMENTS_DIR, NOTES_DIR};
use crate::state::AppState;
use crate::text::truncate_chars;

const ENGINES: [&str; 5] = ["latexmk", "xelatex", "lualatex", "pdflatex", "tectonic"];
const COMPILE_TIMEOUT: Duration = Duration::from_secs(240);

#[derive(Serialize, Clone)]
pub struct TexEngine {
    pub name: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct CompileIssue {
    pub line: Option<u32>,
    pub message: String,
}

#[derive(Serialize)]
pub struct CompileResult {
    pub success: bool,
    pub engine: String,
    pub pdf: Option<StudyFile>,
    pub log: String,
    pub issues: Vec<CompileIssue>,
}

fn extra_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/Library/TeX/texbin"),
        PathBuf::from("/usr/local/texlive/bin"),
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
    ];
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join(".cargo").join("bin"));
        dirs.push(home.join("bin"));
    }
    if let Some(local) = dirs::data_local_dir() {
        dirs.push(
            local
                .join("Programs")
                .join("MiKTeX")
                .join("miktex")
                .join("bin")
                .join("x64"),
        );
    }
    if let Ok(entries) = std::fs::read_dir("/usr/local/texlive") {
        for entry in entries.flatten() {
            let bin = entry.path().join("bin");
            if let Ok(arches) = std::fs::read_dir(&bin) {
                dirs.extend(arches.flatten().map(|arch| arch.path()));
            }
        }
    }
    dirs
}

fn executable_name(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

fn find_executable(name: &str) -> Option<PathBuf> {
    let file = executable_name(name);
    let from_path = std::env::var_os("PATH")
        .map(|paths| std::env::split_paths(&paths).collect::<Vec<_>>())
        .unwrap_or_default();
    from_path
        .into_iter()
        .chain(extra_dirs())
        .map(|dir| dir.join(&file))
        .find(|candidate| candidate.is_file())
}

pub fn available_engines() -> Vec<TexEngine> {
    ENGINES
        .iter()
        .filter_map(|name| {
            find_executable(name).map(|path| TexEngine {
                name: (*name).to_string(),
                path: path.to_string_lossy().into_owned(),
            })
        })
        .collect()
}

#[tauri::command(async)]
pub fn detect_tex_engines() -> Vec<TexEngine> {
    available_engines()
}

pub fn needs_unicode_engine(source: &str) -> bool {
    let lower = source.to_lowercase();
    lower.contains("xepersian")
        || lower.contains("fontspec")
        || lower.contains("polyglossia")
        || lower.contains("unicode-math")
        || lower.contains("bidi")
        || source
            .chars()
            .any(|c| ('\u{0590}'..='\u{08FF}').contains(&c))
}

pub fn choose_engine(
    requested: Option<&str>,
    source: &str,
    engines: &[TexEngine],
) -> Option<TexEngine> {
    let find = |name: &str| engines.iter().find(|engine| engine.name == name).cloned();
    if let Some(name) = requested.filter(|name| *name != "auto") {
        return find(name);
    }
    let order: &[&str] = if needs_unicode_engine(source) {
        &["xelatex", "lualatex", "tectonic", "latexmk"]
    } else {
        &["pdflatex", "xelatex", "lualatex", "tectonic", "latexmk"]
    };
    order.iter().find_map(|name| find(name))
}

pub fn parse_issues(log: &str) -> Vec<CompileIssue> {
    let mut issues = Vec::new();
    let lines: Vec<&str> = log.lines().collect();
    for (index, line) in lines.iter().enumerate() {
        if issues.len() >= 20 {
            break;
        }
        if let Some(rest) = line.strip_prefix("! ") {
            let detail = lines.iter().skip(index + 1).take(4).find_map(|next| {
                next.strip_prefix("l.")
                    .and_then(|tail| tail.split_whitespace().next()?.parse::<u32>().ok())
            });
            issues.push(CompileIssue {
                line: detail,
                message: rest.trim().to_string(),
            });
            continue;
        }
        let parts: Vec<&str> = line.splitn(3, ':').collect();
        if parts.len() == 3 && parts[0].ends_with(".tex") {
            if let Ok(number) = parts[1].trim().parse::<u32>() {
                issues.push(CompileIssue {
                    line: Some(number),
                    message: parts[2].trim().to_string(),
                });
            }
        }
    }
    let mut seen = std::collections::HashSet::new();
    issues.retain(|issue| seen.insert((issue.line, issue.message.clone())));
    issues
}

fn run_with_timeout(mut command: Command) -> Result<(bool, String), String> {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start the TeX engine: {e}"))?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let reader = std::thread::spawn(move || {
        use std::io::Read;
        let mut text = String::new();
        if let Some(mut out) = stdout {
            let _ = out.read_to_string(&mut text);
        }
        if let Some(mut err) = stderr {
            let mut extra = String::new();
            let _ = err.read_to_string(&mut extra);
            text.push_str(&extra);
        }
        text
    });
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let output = reader.join().unwrap_or_default();
                return Ok((status.success(), output));
            }
            Ok(None) => {
                if started.elapsed() > COMPILE_TIMEOUT {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err("Compilation took too long and was stopped.".into());
                }
                std::thread::sleep(Duration::from_millis(120));
            }
            Err(err) => return Err(format!("The TeX engine failed: {err}")),
        }
    }
}

fn search_path(dirs: &[&Path]) -> String {
    let separator = if cfg!(windows) { ";" } else { ":" };
    let mut joined = dirs
        .iter()
        .map(|dir| dir.to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join(separator);
    joined.push_str(separator);
    joined
}

fn engine_command(engine: &TexEngine, source: &Path, build: &Path, unicode: bool) -> Command {
    let mut command = Command::new(&engine.path);
    let file = source
        .file_name()
        .map(|n| n.to_os_string())
        .unwrap_or_default();
    match engine.name.as_str() {
        "tectonic" => {
            command
                .arg("-X")
                .arg("compile")
                .arg(&file)
                .arg("--untrusted")
                .arg("--outdir")
                .arg(build);
        }
        "latexmk" => {
            command
                .arg(if unicode { "-xelatex" } else { "-pdf" })
                .arg("-interaction=nonstopmode")
                .arg("-halt-on-error")
                .arg("-file-line-error")
                .arg(format!("-outdir={}", build.display()))
                .arg(&file);
        }
        _ => {
            command
                .arg("-interaction=nonstopmode")
                .arg("-halt-on-error")
                .arg("-file-line-error")
                .arg("-no-shell-escape")
                .arg(format!("-output-directory={}", build.display()))
                .arg(&file);
        }
    }
    command
}

fn compile_blocking(
    root: PathBuf,
    source: PathBuf,
    requested: Option<String>,
) -> Result<CompileResult, String> {
    let text = std::fs::read_to_string(&source)
        .map_err(|e| format!("Could not read the LaTeX file: {e}"))?;
    let engines = available_engines();
    let Some(engine) = choose_engine(requested.as_deref(), &text, &engines) else {
        return Err(match requested.as_deref().filter(|name| *name != "auto") {
            Some(name) => format!("{name} was not found on this computer."),
            None => "No LaTeX engine was found. Install TeX Live, MiKTeX or Tectonic to compile LaTeX files.".into(),
        });
    };
    let stem = source
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "document".into());
    let build = root.join("build").join("latex").join(build_key(&source));
    std::fs::create_dir_all(&build)
        .map_err(|e| format!("Could not prepare the build folder: {e}"))?;
    let source_dir = source
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| root.join(NOTES_DIR));
    let documents = root.join(DOCUMENTS_DIR);
    let notes = root.join(NOTES_DIR);
    let inputs = search_path(&[&source_dir, &notes, &documents]);
    let unicode = needs_unicode_engine(&text);
    let mut log = String::new();
    let mut success = false;
    let passes = if engine.name == "latexmk" || engine.name == "tectonic" {
        1
    } else {
        2
    };
    for pass in 0..passes {
        let mut command = engine_command(&engine, &source, &build, unicode);
        command
            .current_dir(&source_dir)
            .env("TEXINPUTS", &inputs)
            .env("BIBINPUTS", &inputs);
        let (ok, output) = run_with_timeout(command)?;
        let tex_log =
            std::fs::read_to_string(build.join(format!("{stem}.log"))).unwrap_or_default();
        log = if tex_log.is_empty() { output } else { tex_log };
        success = ok;
        if !ok {
            break;
        }
        let rerun = log.contains("Rerun to get") || log.contains("Label(s) may have changed");
        if pass == 0 && !rerun {
            break;
        }
    }
    let issues = parse_issues(&log);
    let produced = build.join(format!("{stem}.pdf"));
    let mut pdf = None;
    if success && produced.is_file() {
        std::fs::create_dir_all(&documents)
            .map_err(|e| format!("Could not create the documents folder: {e}"))?;
        let marker = build.join("target.txt");
        let previous = std::fs::read_to_string(&marker).ok().map(PathBuf::from);
        let direct = documents.join(format!("{stem}.pdf"));
        let target = match previous.filter(|p| p.starts_with(&documents)) {
            Some(path) => path,
            None if !direct.exists() => direct,
            None => unique_in_dir(&documents, &format!("{stem}.pdf")),
        };
        std::fs::copy(&produced, &target).map_err(|e| format!("Could not save the PDF: {e}"))?;
        let _ = std::fs::write(&marker, target.to_string_lossy().as_bytes());
        pdf = Some(target);
    }
    let tail_start = log.chars().count().saturating_sub(6000);
    let log_tail: String = log.chars().skip(tail_start).collect();
    let workspace = crate::paths::Workspace::new(root);
    let pdf = pdf.and_then(|path| describe(&workspace, &path));
    Ok(CompileResult {
        success: success && pdf.is_some(),
        engine: engine.name.clone(),
        pdf,
        log: truncate_chars(&log_tail, 6000).to_string(),
        issues,
    })
}

fn build_key(source: &Path) -> String {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    source.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

#[tauri::command]
pub async fn compile_latex(
    state: State<'_, AppState>,
    path: String,
    engine: Option<String>,
) -> Result<CompileResult, String> {
    let source = state.workspace.resolve_user_file(&path)?;
    if !source.is_file() {
        return Err(format!("File not found: {path}"));
    }
    let root = state.workspace.root().to_path_buf();
    tauri::async_runtime::spawn_blocking(move || compile_blocking(root, source, engine))
        .await
        .map_err(|e| format!("Compilation failed: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn engine(name: &str) -> TexEngine {
        TexEngine {
            name: name.into(),
            path: format!("/usr/bin/{name}"),
        }
    }

    #[test]
    fn prefers_unicode_engines_for_persian_documents() {
        let engines = vec![engine("pdflatex"), engine("xelatex")];
        assert_eq!(
            choose_engine(None, "\\usepackage{xepersian} سلام", &engines)
                .unwrap()
                .name,
            "xelatex"
        );
        assert_eq!(
            choose_engine(None, "\\documentclass{article} hello", &engines)
                .unwrap()
                .name,
            "pdflatex"
        );
        assert_eq!(
            choose_engine(Some("xelatex"), "hello", &engines)
                .unwrap()
                .name,
            "xelatex"
        );
        assert!(choose_engine(Some("tectonic"), "hello", &engines).is_none());
        assert_eq!(
            choose_engine(Some("auto"), "hello", &engines).unwrap().name,
            "pdflatex"
        );
    }

    #[test]
    fn reads_errors_from_logs() {
        let log = "This is pdfTeX\n./paper.tex:12: Undefined control sequence.\nl.12 \\foo\n! Missing $ inserted.\n<inserted text>\nl.20 x^2\n";
        let issues = parse_issues(log);
        assert_eq!(issues.len(), 2);
        assert_eq!(issues[0].line, Some(12));
        assert!(issues[0].message.contains("Undefined control sequence"));
        assert_eq!(issues[1].line, Some(20));
        assert_eq!(issues[1].message, "Missing $ inserted.");
    }
}
