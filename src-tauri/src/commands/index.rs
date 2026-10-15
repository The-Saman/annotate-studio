use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use tauri::State;

use crate::filesystem::{list_study_files, FileType, StudyFile};
use crate::search_index::{
    segments_from_text, split_segments, IndexEntry, IndexedDocument, SearchHit, SegmentInput,
};
use crate::state::{lock_error, AppState};
use crate::storage::{read_json, write_json};
use crate::text::text_from_file;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshResult {
    pub indexed: usize,
    pub removed: usize,
    pub pending_pdfs: Vec<StudyFile>,
}

#[tauri::command(async)]
pub fn index_status(state: State<'_, AppState>) -> Result<Vec<IndexEntry>, String> {
    Ok(state.search_index.lock().map_err(lock_error)?.entries())
}

#[tauri::command(async)]
pub fn index_refresh(state: State<'_, AppState>) -> Result<RefreshResult, String> {
    let files = list_study_files(&state.workspace)?;
    let mut indexed = 0;
    let mut pending = Vec::new();
    let mut work: Vec<(StudyFile, Option<String>)> = Vec::new();
    {
        let mut index = state.search_index.lock().map_err(lock_error)?;
        for file in &files {
            let current = index.modified_of(&file.path);
            if current.as_deref() == Some(file.modified_at.as_str()) {
                continue;
            }
            match file.file_type {
                FileType::Pdf => pending.push(file.clone()),
                FileType::Image | FileType::Unknown => {}
                _ => work.push((file.clone(), current)),
            }
        }
    }
    for (file, _) in work {
        let Ok(full) = state.workspace.resolve_user_file(&file.path) else {
            continue;
        };
        let Ok(bytes) = std::fs::read(&full) else {
            continue;
        };
        let segments = text_from_file(&full, &bytes)
            .map(|text| segments_from_text(&text))
            .unwrap_or_default();
        let document = IndexedDocument {
            path: file.path.clone(),
            modified: file.modified_at.clone(),
            pages: None,
            empty_pages: Vec::new(),
            segments,
        };
        state
            .search_index
            .lock()
            .map_err(lock_error)?
            .put(document)?;
        indexed += 1;
    }
    let mut index = state.search_index.lock().map_err(lock_error)?;
    let present: std::collections::HashSet<&str> = files.iter().map(|f| f.path.as_str()).collect();
    let stale: Vec<String> = index
        .entries()
        .into_iter()
        .map(|entry| entry.path)
        .filter(|path| !present.contains(path.as_str()))
        .collect();
    for path in &stale {
        index.remove(path);
    }
    Ok(RefreshResult {
        indexed,
        removed: stale.len(),
        pending_pdfs: pending,
    })
}

#[tauri::command(async)]
pub fn index_document(
    state: State<'_, AppState>,
    path: String,
    modified: String,
    pages: Option<u32>,
    empty_pages: Option<Vec<u32>>,
    segments: Vec<SegmentInput>,
) -> Result<usize, String> {
    state.workspace.resolve_user_file(&path)?;
    let document = IndexedDocument {
        path,
        modified,
        pages,
        empty_pages: empty_pages.unwrap_or_default(),
        segments: split_segments(segments),
    };
    let count = document.segments.len();
    state
        .search_index
        .lock()
        .map_err(lock_error)?
        .put(document)?;
    Ok(count)
}

#[tauri::command(async)]
pub fn index_get_document(
    state: State<'_, AppState>,
    path: String,
) -> Result<Option<IndexedDocument>, String> {
    Ok(state
        .search_index
        .lock()
        .map_err(lock_error)?
        .document(&path))
}

#[tauri::command(async)]
pub fn search_workspace(
    state: State<'_, AppState>,
    query: String,
    limit: Option<usize>,
    paths: Option<Vec<String>>,
) -> Result<Vec<SearchHit>, String> {
    let limit = limit.unwrap_or(8).clamp(1, 40);
    Ok(state
        .search_index
        .lock()
        .map_err(lock_error)?
        .search(&query, limit, paths.as_deref()))
}

#[derive(Serialize, Deserialize, Default)]
struct OcrCache {
    modified: String,
    pages: BTreeMap<u32, String>,
}

fn ocr_path(state: &AppState, path: &str) -> std::path::PathBuf {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    state
        .workspace
        .join("ocr")
        .join(format!("{:016x}.json", hasher.finish()))
}

#[tauri::command(async)]
pub fn ocr_cache_get(
    state: State<'_, AppState>,
    path: String,
    modified: String,
) -> Result<BTreeMap<u32, String>, String> {
    state.workspace.resolve_user_file(&path)?;
    let cache = read_json::<OcrCache>(&ocr_path(&state, &path)).unwrap_or_default();
    Ok(if cache.modified == modified {
        cache.pages
    } else {
        BTreeMap::new()
    })
}

#[tauri::command(async)]
pub fn ocr_cache_put(
    state: State<'_, AppState>,
    path: String,
    modified: String,
    page: u32,
    text: String,
) -> Result<(), String> {
    state.workspace.resolve_user_file(&path)?;
    let file = ocr_path(&state, &path);
    let mut cache = read_json::<OcrCache>(&file).unwrap_or_default();
    if cache.modified != modified {
        cache = OcrCache {
            modified,
            pages: BTreeMap::new(),
        };
    }
    cache.pages.insert(page, text);
    write_json(&file, &cache)
}
