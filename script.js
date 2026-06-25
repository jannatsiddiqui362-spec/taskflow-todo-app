/* ============================================================
   TaskFlow — script.js
   ============================================================

   LEARNING TOPICS COVERED:
   1. How tasks are stored in arrays
   2. How Local Storage works
   3. How data persistence is achieved
   4. How task completion status is updated
   5. How filtering logic works

   ============================================================ */

'use strict'; // Catches common coding mistakes at runtime


/* ----------------------------------------------------------
 * 1. TASKS ARRAY
 *    All tasks live in a single JavaScript array called `tasks`.
 *    Each task is a plain object with this shape:
 *
 *    {
 *      id:        string  — unique identifier (timestamp + random)
 *      text:      string  — the task description entered by user
 *      done:      boolean — completion status (false = active)
 *      createdAt: string  — ISO 8601 date string of creation time
 *    }
 *
 *    This array is the single source of truth. Every UI change
 *    starts here and is reflected on screen via render().
 * ---------------------------------------------------------- */
let tasks = [];            // In-memory task array
let currentFilter = 'all'; // Currently selected filter tab
let pendingAction  = null; // Callback stored for the confirm dialog


/* ----------------------------------------------------------
 * 2 & 3. LOCAL STORAGE + DATA PERSISTENCE
 *
 *    localStorage is a browser built-in key/value store.
 *    Data survives page reloads AND browser restarts because
 *    it is written to disk (unlike regular JS variables which
 *    vanish when the page closes).
 *
 *    Workflow:
 *      - On every change  → saveTasks()  writes JSON to disk
 *      - On page load     → loadTasks()  reads JSON from disk
 *
 *    JSON is needed because localStorage only stores strings;
 *    JSON.stringify() converts our array → string for storage,
 *    and JSON.parse() converts the string → array on read.
 * ---------------------------------------------------------- */

/**
 * saveTasks
 * Serialises the `tasks` array to a JSON string and stores it
 * under the key 'taskflow_tasks' in localStorage.
 */
function saveTasks() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

/**
 * loadTasks
 * Reads 'taskflow_tasks' from localStorage and parses it back
 * into the `tasks` array. If nothing is stored yet (first visit),
 * tasks remains an empty array.
 */
function loadTasks() {
  const raw = localStorage.getItem('taskflow_tasks');
  if (raw) {
    tasks = JSON.parse(raw); // Convert string → array of objects
  }
}

/* Theme preference is also persisted in localStorage */
function saveTheme(isDark) {
  localStorage.setItem('taskflow_theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
  return localStorage.getItem('taskflow_theme') === 'dark';
}


/* ----------------------------------------------------------
 * UNIQUE ID GENERATOR
 *    Combines a base-36 timestamp with 4 random characters.
 *    This makes collisions practically impossible even if two
 *    tasks are added in the same millisecond.
 * ---------------------------------------------------------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}


/* ----------------------------------------------------------
 * ADDING A TASK
 *    1. Validate that the input is not empty.
 *    2. Create a new task object.
 *    3. Push it onto the tasks array (step 1 data structure).
 *    4. Save to localStorage (step 3 persistence).
 *    5. Re-render the UI.
 * ---------------------------------------------------------- */
function addTask(text) {
  text = text.trim();
  if (!text) return; // Guard: ignore empty or whitespace-only input

  const task = {
    id:        uid(),
    text:      text,
    done:      false,               // New tasks always start as active
    createdAt: new Date().toISOString()
  };

  tasks.push(task); // Append to the in-memory array
  saveTasks();       // Persist immediately
  render();
}


/* ----------------------------------------------------------
 * 4. TOGGLING COMPLETION STATUS
 *    Array.find() locates the task object by its unique id.
 *    Then the `done` boolean is simply flipped with the NOT
 *    operator (!). After updating, we save and re-render.
 *
 *    false → true  (marks task complete)
 *    true  → false (marks task active again)
 * ---------------------------------------------------------- */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done; // Flip the boolean
    saveTasks();
    render();
  }
}


/* ----------------------------------------------------------
 * DELETING A TASK
 *    Array.filter() returns a NEW array containing only tasks
 *    whose id does NOT match the one we want to remove.
 *    We reassign `tasks` to this filtered copy.
 * ---------------------------------------------------------- */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}


/* ----------------------------------------------------------
 * EDITING A TASK (inline, in-place)
 *    Finds the task by id, updates its text property, saves.
 * ---------------------------------------------------------- */
function saveEdit(id, newText) {
  newText = newText.trim();
  if (!newText) return; // Guard: don't allow saving an empty task
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.text = newText;
    saveTasks();
    render();
  }
}


/* ----------------------------------------------------------
 * CLEAR ALL TASKS
 *    Resets the array to empty and persists the change.
 * ---------------------------------------------------------- */
function clearAll() {
  tasks = [];
  saveTasks();
  render();
}


/* ----------------------------------------------------------
 * 5. FILTERING LOGIC
 *    getFiltered() derives a subset of `tasks` based on the
 *    value of currentFilter without mutating the source array.
 *
 *    'all'       → return every task (no filter applied)
 *    'active'    → return tasks where done === false
 *    'completed' → return tasks where done === true
 *
 *    The filter is applied at render-time only; the underlying
 *    `tasks` array always holds ALL tasks so switching filters
 *    never loses data.
 * ---------------------------------------------------------- */
function getFiltered() {
  if (currentFilter === 'active')    return tasks.filter(t => !t.done);
  if (currentFilter === 'completed') return tasks.filter(t =>  t.done);
  return tasks; // 'all' — no filtering needed
}


/* ----------------------------------------------------------
 * DATE FORMATTER
 *    Converts an ISO 8601 date string to a human-readable
 *    local format using the browser's Intl API.
 * ---------------------------------------------------------- */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit'
  });
}


/* ----------------------------------------------------------
 * HTML ESCAPE HELPERS — prevent XSS attacks
 *    User-entered text must NEVER be injected raw into HTML.
 *    escHtml()  — for text content inside elements
 *    escAttr()  — for text inside HTML attribute values
 * ---------------------------------------------------------- */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return str
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ----------------------------------------------------------
 * RENDER — Central UI Update Function
 *    Reads the current state (tasks array + currentFilter),
 *    builds HTML, and injects it into the DOM.
 *    Called after EVERY state change to keep UI in sync.
 * ---------------------------------------------------------- */
function render() {
  const list     = document.getElementById('taskList');
  const filtered = getFiltered(); // Apply active filter (step 5)

  /* --- Update stats counters --- */
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent  = done;
  document.getElementById('statLeft').textContent  = total - done;

  /* --- Empty state message --- */
  if (filtered.length === 0) {
    const msgs = {
      all:       ['No tasks yet',          'Add your first task above to get started.'],
      active:    ['No active tasks',       'All your tasks are completed — great work!'],
      completed: ['No completed tasks',    'Complete a task and it will appear here.']
    };
    const [title, sub] = msgs[currentFilter];
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9744;</div>
        <h3>${title}</h3>
        <p>${sub}</p>
      </div>`;
    return;
  }

  /* --- Build and inject task card HTML --- */
  list.innerHTML = filtered.map(task => `
    <div class="task-card ${task.done ? 'done' : ''}" data-id="${task.id}">
      <div class="check-wrap">
        <input
          type="checkbox"
          class="task-check"
          ${task.done ? 'checked' : ''}
          title="Mark as ${task.done ? 'active' : 'complete'}"
          onchange="toggleTask('${task.id}')"
        />
      </div>
      <div class="task-body">
        <div class="task-text"
             title="Double-click to edit"
             ondblclick="startEdit('${task.id}')">
          ${escHtml(task.text)}
        </div>
        <div class="task-date">Added ${formatDate(task.createdAt)}</div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-btn"
                onclick="startEdit('${task.id}')"
                title="Edit task">&#9998;</button>
        <button class="icon-btn delete-btn"
                onclick="confirmDelete('${task.id}')"
                title="Delete task">&#128465;</button>
      </div>
    </div>
  `).join('');
}


/* ----------------------------------------------------------
 * INLINE EDITING
 *    Swaps the task text div for a text input inside the card,
 *    letting the user edit without leaving the page.
 *    Enter key or the save button commits the change.
 *    Escape key or the cancel button reverts via render().
 * ---------------------------------------------------------- */
function startEdit(id) {
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (!card) return;

  const textEl = card.querySelector('.task-text');
  const actEl  = card.querySelector('.task-actions');
  const task   = tasks.find(t => t.id === id);

  // Replace static text div with an editable input
  textEl.outerHTML = `
    <input class="edit-input"
           id="edit_${id}"
           value="${escAttr(task.text)}"
           onkeydown="handleEditKey(event, '${id}')"
           maxlength="200"
    />`;

  // Replace action buttons with Save / Cancel
  actEl.innerHTML = `
    <button class="icon-btn save-btn"
            onclick="finishEdit('${id}')"
            title="Save">&#10003;</button>
    <button class="icon-btn delete-btn"
            onclick="render()"
            title="Cancel">&#10005;</button>`;

  // Focus the input and place the cursor at the end
  const inp = document.getElementById(`edit_${id}`);
  inp.focus();
  inp.setSelectionRange(inp.value.length, inp.value.length);
}

/** Enter = commit edit | Escape = cancel without saving */
function handleEditKey(e, id) {
  if (e.key === 'Enter')  finishEdit(id);
  if (e.key === 'Escape') render();
}

function finishEdit(id) {
  const inp = document.getElementById(`edit_${id}`);
  if (inp) saveEdit(id, inp.value);
}


/* ----------------------------------------------------------
 * CONFIRM DIALOG (reusable modal)
 *    Accepts a title, message, confirm button label, and a
 *    callback function to run when the user confirms.
 *    The callback is stored in `pendingAction` and executed
 *    when the confirm button is clicked.
 * ---------------------------------------------------------- */
function showConfirm(title, msg, confirmLabel, onConfirm) {
  document.getElementById('dialogTitle').textContent   = title;
  document.getElementById('dialogMsg').textContent     = msg;
  document.getElementById('dialogConfirm').textContent = confirmLabel;
  pendingAction = onConfirm;
  document.getElementById('overlay').classList.add('show');
}

function confirmDelete(id) {
  const task = tasks.find(t => t.id === id);
  showConfirm(
    'Delete Task',
    `Delete "${task ? task.text.slice(0, 60) : 'this task'}"?`,
    'Delete',
    () => deleteTask(id)
  );
}

function confirmClearAll() {
  if (!tasks.length) return; // Nothing to clear
  showConfirm(
    'Clear All Tasks',
    `Permanently delete all ${tasks.length} task${tasks.length !== 1 ? 's' : ''}? This cannot be undone.`,
    'Clear All',
    clearAll
  );
}

function closeDialog() {
  document.getElementById('overlay').classList.remove('show');
  pendingAction = null;
}


/* ----------------------------------------------------------
 * THEME MANAGEMENT
 *    Applies dark/light mode by toggling a CSS class on <html>.
 *    CSS variables in style.css change automatically via the
 *    html.dark selector.
 * ---------------------------------------------------------- */
function applyTheme(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('themeLabel').textContent  = isDark ? 'Light Mode' : 'Dark Mode';
  document.querySelector('.theme-icon').innerHTML    = isDark ? '&#9728;' : '&#9790;';
}


/* ----------------------------------------------------------
 * EVENT LISTENERS
 *    All event bindings are grouped here, registered once
 *    after the DOM is ready (script uses defer attribute).
 * ---------------------------------------------------------- */

/* Add Task button */
document.getElementById('addBtn').addEventListener('click', () => {
  const inp = document.getElementById('taskInput');
  addTask(inp.value);
  inp.value = '';
  inp.focus();
});

/* Press Enter inside the input field to add a task */
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    addTask(e.target.value);
    e.target.value = '';
  }
});

/* Filter tab buttons — update currentFilter and re-render */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter; // Read data-filter attribute
    // Update active styling
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render(); // Re-render with new filter applied (step 5)
  });
});

/* Clear All button */
document.getElementById('clearAllBtn').addEventListener('click', confirmClearAll);

/* Dialog: Confirm button runs the stored callback */
document.getElementById('dialogConfirm').addEventListener('click', () => {
  if (pendingAction) pendingAction();
  closeDialog();
});

/* Dialog: Cancel and overlay-click both close without action */
document.getElementById('dialogCancel').addEventListener('click', closeDialog);
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('overlay')) closeDialog();
});

/* Theme toggle button */
document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = !document.documentElement.classList.contains('dark');
  applyTheme(isDark);
  saveTheme(isDark); // Persist choice to localStorage
});


/* ----------------------------------------------------------
 * INIT — Runs once on page load
 *    1. loadTasks()   → restores persisted data from localStorage
 *    2. applyTheme()  → restores saved theme preference
 *    3. render()      → draws the initial UI from loaded data
 * ---------------------------------------------------------- */
(function init() {
  loadTasks();             // Step 3: load persisted tasks
  applyTheme(loadTheme()); // Restore dark/light preference
  render();                // Draw UI with loaded data
})();
