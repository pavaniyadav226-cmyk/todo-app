'use strict';

/* ---------- Constants & state ---------- */
const TODOS_KEY = 'todo-app:todos';
const FILTER_KEY = 'todo-app:filter';
const FILTERS = ['all', 'active', 'completed'];

const state = {
  todos: loadTodos(),        // [{ id, text, completed }]
  filter: loadFilter(),      // 'all' | 'active' | 'completed'
  editingId: null            // id of the todo being edited, or null
};

/* ---------- DOM references ---------- */
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const filtersNav = document.getElementById('filters');
const list = document.getElementById('task-list');
const emptyMsg = document.getElementById('empty');
const countEl = document.getElementById('count');
const clearBtn = document.getElementById('clear-completed');
const statusEl = document.getElementById('status');
const exportBtn = document.getElementById('export');
const importBtn = document.getElementById('import');
const importFile = document.getElementById('import-file');

/* ---------- Persistence ---------- */
// Drop anything malformed so bad data can't break rendering
function sanitize(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(t => t && typeof t.id === 'string' && typeof t.text === 'string')
    .map(t => ({ id: t.id, text: t.text.slice(0, 200), completed: Boolean(t.completed) }));
}

function loadTodos() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(TODOS_KEY)));
  } catch {
    return [];
  }
}

// crypto.randomUUID only exists in secure contexts (https/localhost), so fall back
function makeId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function loadFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);
    return FILTERS.includes(saved) ? saved : 'all';
  } catch {
    return 'all';
  }
}

function save() {
  try {
    localStorage.setItem(TODOS_KEY, JSON.stringify(state.todos));
    localStorage.setItem(FILTER_KEY, state.filter);
    statusEl.hidden = true;
  } catch (err) {
    console.error('Could not save to localStorage:', err);
    showStatus('Changes are not being saved (storage is full or blocked). Export a backup now.');
  }
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.hidden = false;
}

/* ---------- State updates (every change goes through here) ---------- */
function commit() {
  save();
  render();
}

function addTodo(text) {
  state.todos.push({ id: makeId(), text, completed: false });
  commit();
}

function toggleTodo(id) {
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  commit();
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  commit();
}

function updateTodo(id, text) {
  const trimmed = text.trim();
  if (!trimmed) return deleteTodo(id);   // empty edit = delete
  const todo = state.todos.find(t => t.id === id);
  if (todo) todo.text = trimmed;
  commit();
}

function setFilter(filter) {
  if (!FILTERS.includes(filter)) return;
  state.filter = filter;
  commit();
}

function clearCompleted() {
  state.todos = state.todos.filter(t => !t.completed);
  commit();
}

/* ---------- Rendering ---------- */
function visibleTodos() {
  switch (state.filter) {
    case 'active':    return state.todos.filter(t => !t.completed);
    case 'completed': return state.todos.filter(t => t.completed);
    default:          return state.todos;
  }
}

function createItem(todo) {
  const li = document.createElement('li');
  li.className = 'item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'toggle';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.completed ? 'active' : 'completed'}`);
  li.append(checkbox);

  if (state.editingId === todo.id) {
    const editor = document.createElement('input');
    editor.type = 'text';
    editor.className = 'edit';
    editor.value = todo.text;
    editor.maxLength = 200;
    editor.setAttribute('aria-label', 'Edit task');
    li.append(editor);
  } else {
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = todo.text;      // textContent, never innerHTML: no XSS
    li.append(title);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = '×';
    del.setAttribute('aria-label', `Delete "${todo.text}"`);
    li.append(del);
  }
  return li;
}

function render() {
  const items = visibleTodos();

  // List
  const fragment = document.createDocumentFragment();
  items.forEach(todo => fragment.append(createItem(todo)));
  list.replaceChildren(fragment);

  // Focus the editor if one was just created
  const editor = list.querySelector('.edit');
  if (editor) {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }

  // Empty message
  const messages = {
    all: 'No tasks yet. Add one above.',
    active: 'Nothing active. Everything is done.',
    completed: 'No completed tasks yet.'
  };
  emptyMsg.hidden = items.length > 0;
  emptyMsg.textContent = messages[state.filter];

  // Filter buttons
  filtersNav.querySelectorAll('button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
  });

  // Footer
  const left = state.todos.filter(t => !t.completed).length;
  countEl.textContent = `${left} ${left === 1 ? 'task' : 'tasks'} left`;
  clearBtn.disabled = !state.todos.some(t => t.completed);
}

/* ---------- Event listeners ---------- */

// Create
form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTodo(text);
  input.value = '';
  input.focus();
});

// Delegated: toggle + delete (one listener for the whole list)
list.addEventListener('click', e => {
  const li = e.target.closest('.item');
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.matches('.toggle')) toggleTodo(id);
  else if (e.target.matches('.delete')) deleteTodo(id);
});

// Delegated: double-click a title to start editing
list.addEventListener('dblclick', e => {
  const title = e.target.closest('.title');
  if (!title) return;
  state.editingId = title.closest('.item').dataset.id;
  render();
});

// Delegated: Enter saves, Escape cancels
list.addEventListener('keydown', e => {
  if (!e.target.matches('.edit')) return;
  const id = e.target.closest('.item').dataset.id;

  if (e.key === 'Enter') {
    const value = e.target.value;
    state.editingId = null;       // clear first so the blur handler below ignores it
    updateTodo(id, value);
  } else if (e.key === 'Escape') {
    state.editingId = null;
    render();
  }
});

// Delegated: clicking away saves (focusout bubbles, blur does not)
list.addEventListener('focusout', e => {
  if (!e.target.matches('.edit')) return;
  const id = e.target.closest('.item').dataset.id;
  if (state.editingId !== id) return;   // already handled by Enter/Escape
  const value = e.target.value;
  state.editingId = null;
  updateTodo(id, value);
});

// Filters
filtersNav.addEventListener('click', e => {
  const btn = e.target.closest('button[data-filter]');
  if (btn) setFilter(btn.dataset.filter);
});

// Clear completed
clearBtn.addEventListener('click', clearCompleted);

// Keep multiple tabs in sync
window.addEventListener('storage', e => {
  if (e.key === TODOS_KEY || e.key === FILTER_KEY) {
    state.todos = loadTodos();
    state.filter = loadFilter();
    state.editingId = null;
    render();
  }
});

// Backup: export to a JSON file
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.todos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks-backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Backup: import from a JSON file (replaces current tasks)
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  importFile.value = '';
  if (!file) return;
  try {
    const imported = sanitize(JSON.parse(await file.text()));
    if (!confirm(`Replace your current tasks with ${imported.length} imported task(s)?`)) return;
    state.todos = imported;
    state.editingId = null;
    commit();
  } catch {
    showStatus('That file is not a valid tasks backup.');
  }
});

/* ---------- Init ---------- */
// Ask the browser not to evict our data under storage pressure (best effort)
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

render();