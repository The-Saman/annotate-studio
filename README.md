<div align="center">
  <img src="src-tauri/icons/128x128.png" alt="Annotate Studio logo" width="112" height="112">
  <h1>Annotate Studio</h1>
  <p>A local-first study workspace for the desktop: an infinite canvas for PDFs and notes, Markdown and LaTeX writing with first-class right-to-left support, spaced-repetition flashcards, practice exams, a Pomodoro timer and an optional AI agent that works with your whole library.</p>
</div>

Everything runs on your machine. Documents, notes, canvas layouts, flashcards, exams and settings are plain files in one data folder, and the app works fully offline. AI features are opt-in and talk directly to the provider you configure (a local Ollama model or a cloud API).

Built with [Tauri 2](https://tauri.app) (Rust) and [Next.js 15](https://nextjs.org) / React 19.

## Features

### Canvas

- Infinite canvas with a dot grid, smooth zoom around the pointer (Ctrl + scroll or trackpad pinch) and panning by dragging the background, holding <kbd>Space</kbd>, the middle mouse button or two-finger scrolling.
- Windows for PDFs, Markdown notes and images that drag and resize precisely at any zoom level, come to the front when clicked, maximize to fill the view (double-click the title bar or press the maximize button, <kbd>Esc</kbd> restores) and minimize to a dock.
- Minimap, “fit all” (<kbd>Shift</kbd>+<kbd>1</kbd>), zoom to the selected window (<kbd>Shift</kbd>+<kbd>2</kbd>), one-click layouts (side by side, stacked, grid) and a lock to freeze the view.
- Hold <kbd>Ctrl</kbd> and scroll over the active note or PDF to change its text size or zoom instead of the canvas zoom (can be turned off in Settings → Interface → “Ctrl + mouse wheel zoom”).
- Undo and redo for layout changes (<kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>).
- Multiple workspaces, each with its own layout.
- Drop files from your file manager, paste an image or text, double-click the background for a quick note, or right-click for more actions. Importing the same file twice reuses the existing copy instead of duplicating it.

### PDF reader and annotation

- Rendering by PDFium (via EmbedPDF), shared by all PDF windows and running in a Web Worker when available, with sharp re-rendering while the canvas is zoomed.
- Tools: select, highlight text, pen, marker, text, rectangle, ellipse, arrow and eraser, with colors and stroke widths. Keyboard shortcuts: <kbd>V</kbd> <kbd>H</kbd> <kbd>P</kbd> <kbd>M</kbd> <kbd>T</kbd> <kbd>R</kbd> <kbd>O</kbd> <kbd>A</kbd> <kbd>E</kbd>.
- Annotations are saved back into the workspace copy of the PDF automatically, with their own undo history; “Export” saves an annotated copy anywhere.
- Selecting text shows a menu to copy, highlight, underline, ask the assistant, get a step-by-step explanation or turn the passage into flashcards.
- Links inside PDFs work: table-of-contents entries and references jump to their page, and web links open in your browser.
- Page navigation, zoom controls and fit-to-width.

### Notes

- Notes are real Markdown files in the `notes` folder, edited with CodeMirror: syntax highlighting (including math), list continuation, search, formatting shortcuts (<kbd>Ctrl</kbd>+<kbd>B</kbd>/<kbd>I</kbd>/<kbd>E</kbd>/<kbd>K</kbd>/<kbd>M</kbd>) and autosave.
- Edit, split and preview modes. The preview renders headings, nested and task lists, tables with alignment, code blocks with a copy button, block quotes, callouts (`> [!tip]`, `> [!warning]`, `> [!formula]` and more, also foldable), footnotes, `==highlights==`, images from the workspace and KaTeX math.
- Each note window has its own text size (<kbd>Ctrl</kbd>+<kbd>=</kbd>/<kbd>-</kbd>/<kbd>0</kbd> or <kbd>Ctrl</kbd> + scroll) and a button to present it step by step.
- `[[Wiki links]]` autocomplete from your library; clicking one opens the file on the canvas or offers to create the note.
- Windows line endings are kept when a note is saved, and text files in other encodings open read-only so their characters are never damaged.

### LaTeX and math

- Math in `$…$`, `$$…$$`, `\(…\)`, `\[…\]` and LaTeX environments written directly in a note (`equation`, `align`, `gather`, `multline`, `alignat`, `cases`, matrices…), with chemistry via `\ce{…}`.
- Numbered equations and references: `\label{eq:x}` with `\eqref{eq:x}` / `\ref{…}` jump to the equation; theorem-style blocks (`theorem`, `lemma`, `definition`, `proof` with ∎, `example`, `exercise`, `solution` and more) are numbered and can be referenced too. In Persian notes their titles and numbers are written in Persian.
- Macros: `\newcommand`, `\renewcommand`, `\def`, `\let` and `\DeclareMathOperator` defined in a note apply to the whole note, and macros from Settings → Writing & math apply everywhere.
- Writing help: typing `\` inside math suggests commands and environments with snippets and a rendered preview, and a live preview of the formula under the cursor shows errors as you type. An insert menu adds numbered equations, theorem/definition/proof blocks, callouts, footnotes and tables.
- Formula size is adjustable (Settings → Writing & math), and double-clicking a formula opens it enlarged with a zoom and “Copy LaTeX”.
- LaTeX documents (`.tex`) open as notes with LaTeX highlighting and a live preview (sections, lists, theorems, equations, tables, figures, footnotes, title page). With TeX Live, MiKTeX or Tectonic installed, “PDF” compiles them (XeLaTeX is chosen for Persian documents) and opens the result next to the source; errors are listed with line numbers.
- Any Markdown note can be exported to a LaTeX document; Persian notes use XePersian when it is installed and fall back to `bidi` otherwise.

### Right-to-left and Persian

- Direction is detected per line in the editor and per paragraph, list item, table and block in the preview, so Persian lines that start with an English word, mixed lists and tables all lay out correctly. Inline math, code and links stay left-to-right inside Persian text.
- A per-note direction switch (automatic, right-to-left, left-to-right) for documents where automatic detection is not enough.
- Numbered lists, equation numbers, references and footnotes use Persian digits in Persian notes.
- Search everywhere (library, files to attach, wiki links, flashcards, the agent’s workspace search) ignores the differences between Arabic and Persian letters (ي/ی, ك/ک), diacritics, zero-width non-joiners and Persian/Arabic digits.
- <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>2</kbd> inserts a zero-width non-joiner (نیم‌فاصله).

### Library

- Every PDF, note, image and document in the workspace, searchable, filterable by type and sortable by recent use, modification date, name or size.
- Open on the canvas, rename, delete, summarize, explain or make flashcards from any file.
- Select several files (<kbd>Ctrl</kbd> + click or the checkbox on a card) to turn them into a study booklet, transcribe scanned ones with OCR or hand them to the agent.

### Flashcards

- Collections, manual cards with Markdown and math, and AI generation from pasted text or a document (PDF, Markdown, text, DOCX, ODT). Long documents are processed in parts with progress and a stop button.
- Anki-style SM-2 scheduling: “Again” relearns after ten minutes, “Hard” grows the interval slowly, “Good” keeps the ease, “Easy” grows faster. The next interval is shown on each button.
- Review sessions with a flip card and keyboard control (<kbd>Space</kbd> to flip, <kbd>1</kbd>–<kbd>4</kbd> to rate); failed cards come back at the end of the session.
- “Practice all” lets you go through cards that are not due yet without changing their schedule.

### Exams

- Write exams by hand or generate them with AI from a topic or one of your documents (number of questions, difficulty and time limit are adjustable).
- Timed attempts that keep running if you switch tabs, keyboard answering, optional instant feedback, and a results page with explanations and attempt history.
- Written answers can be graded by you or by the AI with feedback.

### Pomodoro

- Focus and break timers that keep running anywhere in the app (the remaining time is shown in the title bar), configurable durations, long-break interval and auto-start, synthesized sounds and desktop notifications, plus today’s focus statistics.

### AI agent

- The assistant works as an agent over the whole workspace: it sees the list of your files and decides by itself what to search, which pages to read and what to write. You can still point it at files with `@name`.
- Tools: full-text search across all documents and notes (Persian and English), reading PDFs page by page and notes in sections, PDF outlines and note headings, looking at pages and images, creating notes (Markdown or LaTeX), appending, editing or rewriting notes, renaming files, creating flashcards and practice exams, opening and arranging files on the canvas, exporting to LaTeX or PDF, OCR and booklets. Every change to an existing note can be undone from the chat, and Settings → Assistant can turn writing off or ask before each edit.
- OCR: scanned PDF pages and images are transcribed with a vision model (Markdown with LaTeX formulas, original language kept). Transcriptions are cached and indexed, so they are searchable afterwards.
- Study booklets: `/booklet` (or “Make a study booklet” in the library) reads dozens of files, including scanned ones, extracts notes from each part, plans an outline and writes one structured booklet note section by section with key-formula boxes, worked examples, a summary and self-test questions.
- Two model roles: a fast routine model for managing files, notes and flashcards, and a reasoning model for proofs, papers and hard questions. The agent can hand a task to the reasoning model (for example turning a Lean proof into a natural-language proof or paraphrasing a paper), “Think deeper” answers with the reasoning model and extended thinking, and “Challenge” asks it to find weaknesses in an answer. A vision model can be set separately.
- Commands: `/booklet`, `/ocr`, `/lean`, `/paraphrase`, `/critique`, `/verify`, `/steps`, `/deep` and `/flashcards`. Answers written as `## Step 1 …` can be presented step by step.
- Long context: documents are indexed locally for search, long documents are read in page ranges, older tool output is shortened automatically, and long conversations are condensed into a running summary instead of being cut off.
- Answers stream live, including the model’s visible reasoning when it provides it, and can be stopped at any time.
- Providers: OpenAI, Anthropic, Google Gemini, Ollama, OpenRouter, Groq, DeepSeek, Mistral, Together, xAI, Perplexity and Cohere, with tool calling and image input where the model supports them. “Fetch models” lists the models of a provider and detects which ones can read images, use tools or reason (and their context size); you can correct this per model. Models without tool support still work as agents through a text protocol.

### Motivation and settings

- A motivation corner with quotes, quick resets and a supportive study coach.
- Eight themes including a dark theme, any accent color, interface scaling, notifications, backup to a single `.anos` file and restore (a safety copy of the current data is made first).

## Keyboard shortcuts

| Shortcut | Action |
| :-- | :-- |
| <kbd>Ctrl</kbd>+<kbd>1</kbd>…<kbd>6</kbd>, <kbd>Ctrl</kbd>+<kbd>,</kbd> | Switch between Canvas, Library, Flashcards, Exams, Pomodoro, Motivation, Settings |
| <kbd>Ctrl</kbd>+<kbd>J</kbd> | Toggle the assistant |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>N</kbd> | New note |
| <kbd>Ctrl</kbd>+<kbd>=</kbd> / <kbd>-</kbd> / <kbd>0</kbd> | Zoom in, out, reset (acts on the PDF when a PDF window is active) |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Undo / redo |
| <kbd>Shift</kbd>+<kbd>1</kbd> / <kbd>Shift</kbd>+<kbd>2</kbd> | Fit all windows / zoom to the selected window |
| <kbd>Shift</kbd> while dragging | Snap windows to a 20 px grid |
| <kbd>Ctrl</kbd> + scroll, <kbd>Ctrl</kbd>+<kbd>=</kbd>/<kbd>-</kbd>/<kbd>0</kbd> in a note | Note text size |
| <kbd>Ctrl</kbd>+<kbd>M</kbd> | Wrap the selection in math |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>2</kbd> | Zero-width non-joiner |
| Double-click a formula | Enlarge it |

The full list is under Settings → Shortcuts.

## Getting started

### Prerequisites

- Node.js 18 or newer and Yarn 1
- Rust (stable)
- The [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your platform (on Linux: WebKitGTK 4.1, libsoup 3, GTK 3)
- With Nix: `nix develop` provides everything
- Optional: TeX Live, MiKTeX or Tectonic to compile LaTeX notes to PDF (XeLaTeX and the `xepersian` package for Persian documents)

### Run

```bash
yarn install
yarn tauri dev
```

### Build

```bash
yarn tauri build
```

Installers are written to `src-tauri/target/release/bundle/`.

### Checks

```bash
yarn typecheck                 # TypeScript
yarn test                      # parser and helper tests (Node 22+)
cd src-tauri && cargo test     # backend tests
```

## Where your data lives

All data is stored under your local data directory in `annotate-studio/` (for example `~/.local/share/annotate-studio` on Linux, `%LOCALAPPDATA%\annotate-studio` on Windows and `~/Library/Application Support/annotate-studio` on macOS):

| Path | Contents |
| :-- | :-- |
| `documents/` | Imported PDFs, images and documents (annotations are saved into these copies) |
| `notes/` | Markdown notes |
| `canvas/state.json` | Workspaces and window layouts |
| `settings.json` | Appearance, timer and assistant preferences |
| `flashcards.json`, `collections.json` | Cards with their schedules, and collections |
| `exams_data.json` | Exams and results |
| `chat_sessions.json`, `motivation_sessions.json` | Conversations |
| `providers.json` | AI provider configuration, including API keys (readable only by your user account on Linux and macOS) |
| `model_info.json` | What each configured model supports (vision, tools, reasoning, context size) |
| `index/`, `ocr/` | The local search index and cached OCR transcriptions (rebuilt automatically when missing) |
| `build/` | Temporary LaTeX build files |
| `analytics/activities.jsonl` | Study activity log |
| `backups/` | Safety copies made before restoring a backup |

Files are written atomically, and a file that cannot be parsed is kept as `*.corrupt-<date>` instead of being overwritten. Data from earlier versions is migrated automatically.

## Project structure

```
src/
  app/                  Next.js entry, global styles and fonts
  components/
    app/                App-wide effects: loading, timers, notifications, shortcuts
    canvas/             Canvas viewport, windows, PDF, note and image views, minimap, dock
    chatbot/            Assistant panel, chat engine and lesson view
    markdown/           Markdown renderer and CodeMirror editor
    study/              Library, flashcards, exams, Pomodoro, motivation, settings
    layout/             Title bar and sidebar
    ui/                 Dialogs, toasts, menus, popovers, pickers
  lib/                  IPC bridge, Markdown and LaTeX parsing and conversion, bidi helpers, PDF engine, utilities
    agent/              Agent loop, tools, prompts, context management, OCR and booklets
  store/                Zustand stores with debounced persistence
src-tauri/src/
  commands/             Tauri commands: files, data, flashcards, AI, search index, LaTeX, backup
  ai_router.rs          Provider configuration and one-shot requests
  ai_turn.rs            Streaming chat with tools, images and reasoning for every provider
  ai_models.rs          Model listing and capability detection
  search_index.rs       Local full-text search (BM25 with Persian normalization)
  ai_json.rs            Robust parsing of AI output
  spaced_repetition.rs  Scheduling engine
  paths.rs, storage.rs  Workspace path safety and atomic storage
  text.rs               Text extraction and chunking
  filesystem.rs, analytics.rs, state.rs
```

## Planned

- Creating presentations from study material, and export to PPTX and DOCX.

## Credits

**Idea and feature design**: Taha Dostifam. The application was conceived for personal use, collecting the study tools needed in one place: flashcards with spaced repetition, exam practice, PDF annotation, a Pomodoro timer and optional AI assistance.

[License](./LICENSE)
