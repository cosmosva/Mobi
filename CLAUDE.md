# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

墨笔 (MoBi) is a Typora-like Markdown editor for macOS built with Tauri 2.0, React 19, and TypeScript. It supports live preview, Mermaid diagrams, local image handling, and file associations.

## Commands

```bash
# Development
npm run tauri dev

# Build production app (outputs to src-tauri/target/release/bundle/)
npm run tauri build

# Frontend only (without Tauri)
npm run dev
npm run build
```

Note: Rust/Cargo must be installed and `~/.cargo/env` sourced for Tauri commands.

## Architecture

### Frontend (React + TypeScript)

**State Management**: Zustand stores in `src/stores/`
- `editorStore.ts` - Editor content, file path, workspace directory, modification state
- `settingsStore.ts` - Theme, font settings, image subfolder preferences

**Hooks** in `src/hooks/`:
- `useFileSystem.ts` - File operations (open, save, read directory) using `@tauri-apps/plugin-fs`
- `useImagePaste.ts` - Handles clipboard paste and drag-drop for images, saves to configurable subfolder (default: `assets/`)

**Components**:
- `MainLayout.tsx` - Main app shell, handles keyboard shortcuts (Cmd+S/O/N/B), Tauri drag-drop events
- `Editor.tsx` - MDEditor wrapper with custom `CustomImage` component that converts local paths via `convertFileSrc()`
- `MermaidRenderer.tsx` - Renders Mermaid diagram code blocks

### Backend (Rust/Tauri)

`src-tauri/src/lib.rs` - Handles macOS file associations ("Open With") via `RunEvent::Opened`, stores opened file path in `AppState`

### Key Tauri Configurations

**`src-tauri/tauri.conf.json`**:
- `security.assetProtocol` - Must have `enable: true` and `scope: ["**/*"]` for local image display
- `security.csp` - img-src must include `asset: http://asset.localhost`
- `bundle.fileAssociations` - Registers .md, .markdown, .txt file types

**`src-tauri/capabilities/default.json`**: File system permissions with broad scope (`/**`)

## Image Handling Flow

1. Paste/drag image triggers `useImagePaste` hook
2. Image saved to `{baseDir}/assets/` with generated filename
3. Markdown `![](assets/filename.png)` inserted at cursor position
4. Preview renders via `CustomImage` which uses `convertFileSrc()` to create `asset://localhost/...` URL

## Version Sync

Keep version numbers synchronized in:
- `package.json`
- `src-tauri/tauri.conf.json`
