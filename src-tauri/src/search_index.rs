use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use crate::text::truncate_chars;

const SEGMENT_CHARS: usize = 1400;
const K1: f64 = 1.4;
const B: f64 = 0.75;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub line: Option<u32>,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexedDocument {
    pub path: String,
    pub modified: String,
    #[serde(default)]
    pub pages: Option<u32>,
    #[serde(default)]
    pub empty_pages: Vec<u32>,
    pub segments: Vec<Segment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SegmentInput {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub line: Option<u32>,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexEntry {
    pub path: String,
    pub modified: String,
    pub pages: Option<u32>,
    pub empty_pages: Vec<u32>,
    pub segments: usize,
    pub chars: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub path: String,
    pub page: Option<u32>,
    pub line: Option<u32>,
    pub snippet: String,
    pub score: f64,
}

pub fn normalize(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        let mapped = match c {
            '\u{064A}' | '\u{0649}' => Some('\u{06CC}'),
            '\u{0643}' => Some('\u{06A9}'),
            '\u{0623}' | '\u{0625}' | '\u{0622}' | '\u{0671}' => Some('\u{0627}'),
            '\u{0629}' => Some('\u{0647}'),
            '\u{0624}' => Some('\u{0648}'),
            '\u{064B}'..='\u{065F}'
            | '\u{0670}'
            | '\u{0640}'
            | '\u{200C}'
            | '\u{200D}'
            | '\u{200E}'
            | '\u{200F}' => None,
            '\u{06F0}'..='\u{06F9}' => char::from_digit(c as u32 - 0x06F0, 10),
            '\u{0660}'..='\u{0669}' => char::from_digit(c as u32 - 0x0660, 10),
            other => Some(other),
        };
        if let Some(mapped) = mapped {
            out.extend(mapped.to_lowercase());
        }
    }
    out
}

fn stem(token: &str) -> String {
    let chars: Vec<char> = token.chars().collect();
    let persian = chars.iter().any(|c| ('\u{0600}'..='\u{06FF}').contains(c));
    if persian {
        for suffix in ["هایی", "های", "ها", "ترین", "تر"] {
            let suffix_len = suffix.chars().count();
            if chars.len() > suffix_len + 2 && token.ends_with(suffix) {
                return chars[..chars.len() - suffix_len].iter().collect();
            }
        }
        return token.to_string();
    }
    if chars.len() > 4 && token.ends_with("ies") {
        return format!("{}y", &token[..token.len() - 3]);
    }
    if chars.len() > 3
        && token.ends_with('s')
        && !token.ends_with("ss")
        && !token.ends_with("us")
        && !token.ends_with("is")
    {
        return token[..token.len() - 1].to_string();
    }
    token.to_string()
}

pub fn tokenize(text: &str) -> Vec<String> {
    normalize(text)
        .split(|c: char| !c.is_alphanumeric())
        .filter(|token| {
            !token.is_empty()
                && (token.chars().count() > 1 || token.chars().all(|c| c.is_ascii_digit()))
        })
        .map(stem)
        .collect()
}

pub fn split_segments(inputs: Vec<SegmentInput>) -> Vec<Segment> {
    let mut segments = Vec::new();
    for input in inputs {
        let text = input.text.trim();
        if text.is_empty() {
            continue;
        }
        for piece in crate::text::chunk_text(text, SEGMENT_CHARS) {
            segments.push(Segment {
                page: input.page,
                line: input.line,
                text: piece,
            });
        }
    }
    segments
}

pub fn segments_from_text(text: &str) -> Vec<Segment> {
    let mut inputs = Vec::new();
    let mut current = String::new();
    let mut start_line = 1u32;
    for (index, line) in text.lines().enumerate() {
        let number = index as u32 + 1;
        if current.is_empty() {
            start_line = number;
        }
        current.push_str(line);
        current.push('\n');
        if current.chars().count() >= SEGMENT_CHARS
            || (line.trim().is_empty() && current.chars().count() > SEGMENT_CHARS / 2)
        {
            inputs.push(SegmentInput {
                page: None,
                line: Some(start_line),
                text: std::mem::take(&mut current),
            });
        }
    }
    if !current.trim().is_empty() {
        inputs.push(SegmentInput {
            page: None,
            line: Some(start_line),
            text: current,
        });
    }
    split_segments(inputs)
}

struct Postings {
    terms: HashMap<String, Vec<(usize, usize, u32)>>,
    lengths: Vec<Vec<u32>>,
    average: f64,
    total: usize,
}

pub struct SearchIndex {
    dir: PathBuf,
    documents: Vec<IndexedDocument>,
    loaded: bool,
    postings: Option<Postings>,
}

fn file_key(path: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

impl SearchIndex {
    pub fn new(dir: PathBuf) -> Self {
        Self {
            dir,
            documents: Vec::new(),
            loaded: false,
            postings: None,
        }
    }

    fn ensure_loaded(&mut self) {
        if self.loaded {
            return;
        }
        self.loaded = true;
        let Ok(entries) = std::fs::read_dir(&self.dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            if let Some(document) = crate::storage::read_json::<IndexedDocument>(&path) {
                self.documents.push(document);
            }
        }
        self.documents.sort_by(|a, b| a.path.cmp(&b.path));
    }

    pub fn entries(&mut self) -> Vec<IndexEntry> {
        self.ensure_loaded();
        self.documents
            .iter()
            .map(|doc| IndexEntry {
                path: doc.path.clone(),
                modified: doc.modified.clone(),
                pages: doc.pages,
                empty_pages: doc.empty_pages.clone(),
                segments: doc.segments.len(),
                chars: doc.segments.iter().map(|s| s.text.chars().count()).sum(),
            })
            .collect()
    }

    pub fn modified_of(&mut self, path: &str) -> Option<String> {
        self.ensure_loaded();
        self.documents
            .iter()
            .find(|d| d.path == path)
            .map(|d| d.modified.clone())
    }

    pub fn put(&mut self, document: IndexedDocument) -> Result<(), String> {
        self.ensure_loaded();
        std::fs::create_dir_all(&self.dir)
            .map_err(|e| format!("Could not create the search index: {e}"))?;
        crate::storage::write_json(
            &self.dir.join(format!("{}.json", file_key(&document.path))),
            &document,
        )?;
        self.documents.retain(|d| d.path != document.path);
        self.documents.push(document);
        self.documents.sort_by(|a, b| a.path.cmp(&b.path));
        self.postings = None;
        Ok(())
    }

    pub fn remove(&mut self, path: &str) {
        self.ensure_loaded();
        let before = self.documents.len();
        self.documents.retain(|d| d.path != path);
        if before != self.documents.len() {
            let _ = std::fs::remove_file(self.dir.join(format!("{}.json", file_key(path))));
            self.postings = None;
        }
    }

    pub fn rename(&mut self, from: &str, to: &str) -> Result<(), String> {
        self.ensure_loaded();
        let Some(mut document) = self.documents.iter().find(|d| d.path == from).cloned() else {
            return Ok(());
        };
        self.remove(from);
        document.path = to.to_string();
        self.put(document)
    }

    pub fn document(&mut self, path: &str) -> Option<IndexedDocument> {
        self.ensure_loaded();
        self.documents.iter().find(|d| d.path == path).cloned()
    }

    fn postings(&mut self) -> &Postings {
        self.ensure_loaded();
        if self.postings.is_none() {
            let mut terms: HashMap<String, Vec<(usize, usize, u32)>> = HashMap::new();
            let mut lengths = Vec::with_capacity(self.documents.len());
            let mut sum = 0u64;
            let mut total = 0usize;
            for (doc_index, document) in self.documents.iter().enumerate() {
                let mut doc_lengths = Vec::with_capacity(document.segments.len());
                for (segment_index, segment) in document.segments.iter().enumerate() {
                    let tokens = tokenize(&segment.text);
                    doc_lengths.push(tokens.len() as u32);
                    sum += tokens.len() as u64;
                    total += 1;
                    let mut counts: HashMap<String, u32> = HashMap::new();
                    for token in tokens {
                        *counts.entry(token).or_insert(0) += 1;
                    }
                    for (token, count) in counts {
                        terms
                            .entry(token)
                            .or_default()
                            .push((doc_index, segment_index, count));
                    }
                }
                lengths.push(doc_lengths);
            }
            let average = if total == 0 {
                1.0
            } else {
                sum as f64 / total as f64
            };
            self.postings = Some(Postings {
                terms,
                lengths,
                average,
                total,
            });
        }
        self.postings.as_ref().expect("postings were just built")
    }

    pub fn search(
        &mut self,
        query: &str,
        limit: usize,
        paths: Option<&[String]>,
    ) -> Vec<SearchHit> {
        let mut query_terms = tokenize(query);
        query_terms.sort();
        query_terms.dedup();
        if query_terms.is_empty() {
            return Vec::new();
        }
        let allowed: Option<HashSet<usize>> = paths.map(|list| {
            self.ensure_loaded();
            self.documents
                .iter()
                .enumerate()
                .filter(|(_, d)| list.iter().any(|p| p == &d.path))
                .map(|(i, _)| i)
                .collect()
        });
        let postings = self.postings();
        let total = postings.total.max(1) as f64;
        let mut scores: HashMap<(usize, usize), (f64, usize)> = HashMap::new();
        for term in &query_terms {
            let Some(list) = postings.terms.get(term) else {
                continue;
            };
            let idf = ((total - list.len() as f64 + 0.5) / (list.len() as f64 + 0.5) + 1.0).ln();
            for &(doc, segment, tf) in list {
                if allowed.as_ref().is_some_and(|set| !set.contains(&doc)) {
                    continue;
                }
                let length = postings.lengths[doc][segment] as f64;
                let tf = tf as f64;
                let score =
                    idf * (tf * (K1 + 1.0)) / (tf + K1 * (1.0 - B + B * length / postings.average));
                let entry = scores.entry((doc, segment)).or_insert((0.0, 0));
                entry.0 += score;
                entry.1 += 1;
            }
        }
        let wanted = query_terms.len();
        let mut ranked: Vec<((usize, usize), f64)> = scores
            .into_iter()
            .map(|(key, (score, matched))| (key, score * (1.0 + matched as f64 / wanted as f64)))
            .collect();
        ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        let mut per_document: HashMap<usize, usize> = HashMap::new();
        let mut hits = Vec::new();
        for ((doc, segment), score) in ranked {
            let count = per_document.entry(doc).or_insert(0);
            if *count >= 4 {
                continue;
            }
            *count += 1;
            let document = &self.documents[doc];
            let part = &document.segments[segment];
            hits.push(SearchHit {
                path: document.path.clone(),
                page: part.page,
                line: part.line,
                snippet: snippet(&part.text, &query_terms),
                score: (score * 1000.0).round() / 1000.0,
            });
            if hits.len() >= limit {
                break;
            }
        }
        hits
    }
}

fn snippet(text: &str, terms: &[String]) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return String::new();
    }
    let position = words
        .iter()
        .position(|word| tokenize(word).iter().any(|token| terms.contains(token)))
        .unwrap_or(0);
    let start = position.saturating_sub(40);
    let end = (position + 80).min(words.len());
    let mut out = words[start..end].join(" ");
    if start > 0 {
        out = format!("… {out}");
    }
    if end < words.len() {
        out.push_str(" …");
    }
    truncate_chars(&out, 900).to_string()
}

pub fn index_dir(root: &Path) -> PathBuf {
    root.join("index")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn document(path: &str, texts: &[(&str, Option<u32>)]) -> IndexedDocument {
        IndexedDocument {
            path: path.into(),
            modified: "t".into(),
            pages: Some(texts.len() as u32),
            empty_pages: vec![],
            segments: texts
                .iter()
                .map(|(text, page)| Segment {
                    page: *page,
                    line: None,
                    text: text.to_string(),
                })
                .collect(),
        }
    }

    #[test]
    fn normalizes_persian_text() {
        assert_eq!(normalize("كتاب‌هاي ۱۲"), "کتابهای 12");
        assert_eq!(tokenize("کتاب‌های فیزیک"), vec!["کتاب", "فیزیک"]);
        assert_eq!(
            tokenize("Charges and batteries"),
            vec!["charge", "and", "battery"]
        );
    }

    #[test]
    fn ranks_matching_segments() {
        let dir = std::env::temp_dir().join(format!("annotate-index-{}", uuid::Uuid::new_v4()));
        let mut index = SearchIndex::new(dir.clone());
        index
            .put(document(
                "documents/physics.pdf",
                &[
                    (
                        "Coulomb's law describes the electric force between two charges.",
                        Some(1),
                    ),
                    ("Ohm's law relates voltage and current.", Some(2)),
                ],
            ))
            .unwrap();
        index
            .put(document(
                "notes/fa.md",
                &[("قانون کولن نیروی الکتریکی بین بارها را توصیف می‌کند", None)],
            ))
            .unwrap();
        let hits = index.search("electric charge force", 5, None);
        assert_eq!(hits[0].path, "documents/physics.pdf");
        assert_eq!(hits[0].page, Some(1));
        let persian = index.search("نيروي الكتريكي", 5, None);
        assert_eq!(persian[0].path, "notes/fa.md");
        let scoped = index.search("law", 5, Some(&["notes/fa.md".to_string()]));
        assert!(scoped.is_empty());
        let mut reloaded = SearchIndex::new(dir.clone());
        assert_eq!(reloaded.entries().len(), 2);
        reloaded.rename("notes/fa.md", "notes/coulomb.md").unwrap();
        assert!(reloaded.document("notes/coulomb.md").is_some());
        reloaded.remove("documents/physics.pdf");
        assert_eq!(reloaded.entries().len(), 1);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn segments_text_with_line_numbers() {
        let text = format!("{}\n\n{}", "alpha ".repeat(300), "beta ".repeat(300));
        let segments = segments_from_text(&text);
        assert!(segments.len() >= 2);
        assert_eq!(segments[0].line, Some(1));
        assert!(segments
            .iter()
            .all(|s| s.text.chars().count() <= SEGMENT_CHARS));
    }
}
