# To-Do List App

A client-side task manager built with vanilla HTML, CSS and JavaScript. No frameworks, no backend. Tasks persist across page reloads using `window.localStorage`.

**Live demo:** https://YOUR-USERNAME.github.io/todo-app/
**Repo:** https://github.com/YOUR-USERNAME/todo-app

## Features

- **Create** tasks with the input form
- **Read** tasks rendered from a single state object
- **Update** tasks by double-clicking: Enter saves, Esc cancels, clicking away saves
- **Delete** single tasks, or clear all completed tasks at once
- **Filter** by All, Active or Completed (the selected filter is remembered)
- **Persistence** via `localStorage`, so data survives reloads and syncs across open tabs
- **Backup** by exporting tasks to a JSON file and importing them back
- **Error handling:** a visible warning appears if storage is full or blocked

## Run locally

1. Clone or download the repo.
2. Open `index.html` in a browser. No build step or server is needed.

```bash
git clone https://github.com/YOUR-USERNAME/todo-app.git
cd todo-app
```

## Project structure

```
todo-app/
├── index.html   # markup
├── style.css    # styling
├── script.js    # state, rendering, events, persistence
└── README.md
```

## How it works

- **State:** a single `state` object holds the todos, the active filter and the id of the task being edited.
- **One update path:** every change goes through `commit()`, which saves to `localStorage` and then calls `render()`. State and DOM cannot drift apart.
- **Dynamic DOM:** `render()` builds list items with `document.createElement` and sets text with `textContent`, never `innerHTML`, so typed HTML cannot be injected.
- **Event delegation:** one `click`, `dblclick`, `keydown` and `focusout` listener on the `<ul>` handles every task, including ones added later.
- **Safe loading:** stored data is validated by `sanitize()` before use, so corrupted storage cannot break the page.

## Limitations

- Data is stored in one browser on one device. Clearing site data erases it, so use Export for backups.
- Import replaces the current list instead of merging.
- There is no account system or cross-device sync, because the project is intentionally client-side only.

## What I learned

- Managing UI from a single source of truth
- Event delegation versus per-element listeners
- Persisting and validating data with `localStorage`
- Avoiding XSS by never inserting user input as HTML
