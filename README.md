# Annotate Studio

**Read. Annotate. Remember.**

Annotate Studio is a local-first learning application built around one idea: studying should happen in one place, with the tools you actually need.

It combines reading, annotation, AI assistance, flashcards, exams, focused study sessions, and personal study support into a single workspace.

The application is built with **Tauri + Rust** and **Next.js**, with local AI at its core.

## Features

### Canvas

Create a study canvas and bring your materials together.

* PDF documents
* Markdown notes and LaTeX documents
* Images
* An AI assistant connected to your study materials
* Explain concepts step by step
* Ask questions directly about your materials

The assistant can also help you:

* Summarize
* Extract key notes
* Compare and contrast
* Build timelines
* Create mind maps
* Answer "why" and "how" questions
* Create cheat sheets
* Find contradictions

Hold Ctrl and scroll over a note or PDF to make its text larger or smaller. This can be turned off in Settings.

### Markdown and LaTeX

Write notes in Markdown with LaTeX math, or work with complete LaTeX documents.

* Equations with numbering and references (`\label`, `\eqref`), theorem, definition and proof blocks, callouts and footnotes
* Your own LaTeX macros, command suggestions and a live preview of the formula you are typing
* Adjustable formula size, and any formula opens enlarged with a double-click
* `.tex` documents with a live preview and one-click compilation to PDF (requires TeX Live, MiKTeX or Tectonic)
* Export of any note to LaTeX

### Persian and right-to-left text

Persian, Arabic and mixed Persian–English text is laid out correctly, line by line in the editor and paragraph by paragraph in the preview. Formulas, code and LaTeX commands stay left-to-right inside Persian sentences, lists and equation numbers use Persian digits, and search treats Persian and Arabic letter forms as the same.

### AI agent

The assistant can work as an agent over your whole workspace. It decides what to search and read, and it can create and edit notes, flashcards and exams. Every change it makes can be undone.

* OCR of scanned PDFs and images with a vision model
* Turning dozens of files into one structured study booklet
* A routine model for everyday work and a reasoning model for proofs, papers and hard questions, with "Think deeper" and "Challenge"
* Turning Lean proofs into natural-language proofs, paraphrasing papers and checking solutions step by step
* A local search index and running summaries, so large libraries and long conversations keep their context

### Flashcards

Create flashcards manually or generate them with AI.

Annotate Studio uses spaced repetition to help you review what you are learning. Difficult cards come back more often, while easier cards gradually require less attention.

### Exams

Create practice exams manually or generate them with AI.

Both descriptive and multiple-choice questions are supported. AI can also help solve and evaluate your answers.

### Pomodoro

A built-in Pomodoro timer helps you structure study sessions with focused work periods and short or long breaks.

### Motivation

Studying is not always about productivity.

The Motivation page gives you a space to talk with AI about exams, stress, sleep, anxiety, motivation, or simply whatever is on your mind.

### AI Providers

Annotate Studio is designed around flexible AI providers.

You can use local AI through **Ollama**, or connect external providers such as **OpenAI**, **Gemini**, and other supported APIs.

When you add a provider, Annotate Studio can fetch its models and detect which ones can read images, use tools or reason.

Your learning workflow does not have to depend on a single provider.

## Local-first

Annotate Studio is designed to keep your learning environment under your control.

The goal is to make the application useful with local models and local data, while still allowing cloud AI providers when you choose to use them.

## Installation

Pre-built application binaries are currently distributed through **GitHub Actions workflow artifacts**.

Download the artifact from the latest successful workflow run.

## Development

Clone the repository:

```bash
git clone --depth 1 https://github.com/annotate-studio/annotate-studio
cd annotate-studio
```

Install dependencies:

```bash
npm install
```

Install the Tauri CLI:

```bash
cargo install tauri-cli
```

Run the application in development mode:

```bash
cargo tauri dev
```

Build the application:

```bash
cargo tauri build
```

## Project Status

Annotate Studio is an actively developed open-source project.

The application is currently **heavily AI-engineered**. AI has been an important part of getting the project from idea to a working product, but that is not the end goal.

Over time, we want to continuously refactor the codebase, improve its architecture and maintainability, and optimize performance.

The goal is simple: **use AI to build faster, then make the resulting software genuinely good.**

## Next Steps

Still evolving! Some of the things I want to explore next include:

* Presentation creation, making it possible to turn study materials into structured presentations.
* Document editing and export, including PPTX and DOCX formats compatible with Microsoft Office and Google Workspace.

The long-term goal is not simply to add more AI features, but to build a learning environment where AI can genuinely understand, organize, and work with the material you are studying.

## Credit

[I](https://github.com/tahadostifam) built Annotate Studio to bring together the study tools I personally needed in one place: spaced-repetition flashcards, exam practice, PDF annotation, a Pomodoro timer, and optional AI assistance. I decided to make it open source so that other students could benefit from it as well.

I also want to give my sincere thanks to [CluvexStudio](https://github.com/CluvexStudio) for the passionate work put into improving and testing Annotate Studio. His time, feedback, testing, and attention to detail have helped make the application better throughout its development. I genuinely appreciate the effort and care they have put into the project.

## Contribution

Annotate Studio is fully open source and distributed under a custom [license](https://github.com/annotate-studio/annotate-studio/blob/main/LICENSE).

Issues and PRs are welcome. Contributions are reviewed before being accepted.
