const STORAGE_KEY = "zaheer-todo-items";
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const prioritySelect = document.getElementById("todo-priority");
const dateInput = document.getElementById("todo-date");
const searchInput = document.getElementById("todo-search");
const btnClearSearch = document.getElementById("btn-clear-search");
const list = document.getElementById("todo-list");
const emptyMsg = document.getElementById("empty-msg");
const countAll = document.getElementById("count-all");
const countActive = document.getElementById("count-active");
const countDone = document.getElementById("count-done");
const clearDoneBtn = document.getElementById("clear-done-btn");
const progressText = document.getElementById("progress-text");
const progressCounts = document.getElementById("progress-counts");
const progressFill = document.getElementById("progress-fill");
const btnCopyChecklist = document.getElementById("btn-copy-checklist");
const btnExportTasks = document.getElementById("btn-export-tasks");

let tasks = [];
let filter = "all";
let searchQuery = "";
let editingTaskId = null;

const DEFAULT_TASKS = [
    { id: "seed-1", text: "Review Weather Dashboard Pro live analytics & soundscapes", priority: "high", dueDate: "", done: true },
    { id: "seed-2", text: "Test API Status Dashboard latency against GitHub API", priority: "normal", dueDate: new Date().toISOString().slice(0, 10), done: false },
    { id: "seed-3", text: "Deploy updated portfolio projects with SVG v-shape arrows", priority: "urgent", dueDate: "", done: false }
];

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            tasks = JSON.parse(saved);
        } else {
            tasks = DEFAULT_TASKS;
            saveTasks();
        }
    } catch (error) {
        tasks = DEFAULT_TASKS;
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function updateProgress() {
    const total = tasks.length;
    const active = tasks.filter((t) => !t.done).length;
    const done = total - active;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    if (progressText) progressText.textContent = `${pct}% Completed`;
    if (progressCounts) progressCounts.textContent = `${done} of ${total} tasks done`;
    if (progressFill) progressFill.style.width = `${pct}%`;

    if (countAll) countAll.textContent = total;
    if (countActive) countActive.textContent = active;
    if (countDone) countDone.textContent = done;

    if (clearDoneBtn) {
        clearDoneBtn.style.display = done > 0 ? "inline-block" : "none";
    }
}

function getDueDateBadge(dateStr, isDone) {
    if (!dateStr) return "";
    const today = new Date().toISOString().slice(0, 10);

    if (isDone) {
        return `<span class="due-tag">📅 ${escapeHtml(dateStr)}</span>`;
    }

    if (dateStr < today) {
        return `<span class="due-tag overdue">⚠️ Overdue (${escapeHtml(dateStr)})</span>`;
    } else if (dateStr === today) {
        return `<span class="due-tag today">⏰ Due Today</span>`;
    } else {
        return `<span class="due-tag">📅 Due ${escapeHtml(dateStr)}</span>`;
    }
}

function visibleTasks() {
    return tasks.filter((task) => {
        // Tab filter
        if (filter === "active" && task.done) return false;
        if (filter === "done" && !task.done) return false;

        // Search query filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const textMatch = task.text.toLowerCase().includes(query);
            const priorityMatch = (task.priority || "").toLowerCase().includes(query);
            const dateMatch = (task.dueDate || "").includes(query);
            if (!textMatch && !priorityMatch && !dateMatch) return false;
        }

        return true;
    });
}

function render() {
    const items = visibleTasks();
    list.innerHTML = items.map((task) => {
        const priority = task.priority || "normal";
        const isEditing = editingTaskId === task.id;
        const dueBadge = getDueDateBadge(task.dueDate, task.done);

        return `
            <li class="${task.done ? "is-done" : ""}" data-id="${task.id}">
                <input type="checkbox" data-id="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark task done">
                
                <div class="item-content-wrap">
                    <div class="task-main-line">
                        <span class="priority-tag ${priority}">${priority}</span>
                        ${isEditing 
                            ? `<input type="text" class="inline-edit-input" data-id="${task.id}" value="${escapeHtml(task.text)}" maxlength="120">`
                            : `<span class="task-text">${escapeHtml(task.text)}</span>`
                        }
                    </div>
                    ${dueBadge ? `<div>${dueBadge}</div>` : ""}
                </div>

                <div class="item-actions">
                    ${isEditing 
                        ? `<button type="button" class="edit-btn save-edit-btn" data-id="${task.id}">Save</button>`
                        : `<button type="button" class="edit-btn" data-id="${task.id}">Edit</button>`
                    }
                    <button type="button" class="delete-btn" data-id="${task.id}" aria-label="Delete task">Delete</button>
                </div>
            </li>
        `;
    }).join("");

    emptyMsg.hidden = items.length > 0;
    if (searchQuery && items.length === 0) {
        emptyMsg.textContent = `No tasks matching "${searchQuery}".`;
    } else {
        emptyMsg.textContent = "No tasks yet — add one above.";
    }

    updateProgress();

    // Auto-focus input if editing
    if (editingTaskId) {
        const editInput = list.querySelector(`.inline-edit-input[data-id="${editingTaskId}"]`);
        if (editInput) {
            editInput.focus();
            editInput.selectionStart = editInput.selectionEnd = editInput.value.length;
        }
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const priority = prioritySelect ? prioritySelect.value : "normal";
    const dueDate = dateInput ? dateInput.value : "";
    const taskId = (window.crypto && typeof window.crypto.randomUUID === "function")
        ? window.crypto.randomUUID()
        : "todo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);

    tasks.unshift({
        id: taskId,
        text,
        priority,
        dueDate,
        done: false
    });

    input.value = "";
    if (dateInput) dateInput.value = "";
    saveTasks();
    render();
});

// Search input listener
if (searchInput) {
    searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.trim();
        if (btnClearSearch) {
            btnClearSearch.hidden = !searchQuery;
        }
        render();
    });
}

if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
        searchQuery = "";
        searchInput.value = "";
        btnClearSearch.hidden = true;
        render();
    });
}

// List actions: checkbox, edit, save edit, delete
list.addEventListener("click", (event) => {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.matches('input[type="checkbox"]')) {
        tasks = tasks.map((task) => (task.id === id ? { ...task, done: target.checked } : task));
        saveTasks();
        render();
        return;
    }

    if (target.matches(".edit-btn:not(.save-edit-btn)")) {
        editingTaskId = id;
        render();
        return;
    }

    if (target.matches(".save-edit-btn")) {
        commitEdit(id);
        return;
    }

    if (target.matches(".delete-btn")) {
        tasks = tasks.filter((task) => task.id !== id);
        if (editingTaskId === id) editingTaskId = null;
        saveTasks();
        render();
        return;
    }
});

function commitEdit(id) {
    const editInput = list.querySelector(`.inline-edit-input[data-id="${id}"]`);
    if (editInput) {
        const newText = editInput.value.trim();
        if (newText) {
            tasks = tasks.map(t => t.id === id ? { ...t, text: newText } : t);
            saveTasks();
        }
    }
    editingTaskId = null;
    render();
}

// Support Enter and Escape key in inline edit input
list.addEventListener("keydown", (event) => {
    if (event.target.matches(".inline-edit-input")) {
        if (event.key === "Enter") {
            event.preventDefault();
            commitEdit(event.target.dataset.id);
        } else if (event.key === "Escape") {
            editingTaskId = null;
            render();
        }
    }
});

if (clearDoneBtn) {
    clearDoneBtn.addEventListener("click", () => {
        tasks = tasks.filter((task) => !task.done);
        saveTasks();
        render();
    });
}

document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
        filter = button.dataset.filter;
        document.querySelectorAll(".filter-btn").forEach((item) => {
            item.classList.toggle("is-active", item === button);
        });
        render();
    });
});

// Copy Checklist to clipboard
if (btnCopyChecklist) {
    btnCopyChecklist.addEventListener("click", () => {
        if (!tasks.length) {
            alert("No tasks to copy.");
            return;
        }

        const lines = tasks.map(t => {
            const check = t.done ? "[x]" : "[ ]";
            const due = t.dueDate ? ` (Due: ${t.dueDate})` : "";
            const prio = `[${t.priority.toUpperCase()}]`;
            return `${check} ${prio} ${t.text}${due}`;
        });

        navigator.clipboard.writeText(lines.join("\n")).then(() => {
            const span = btnCopyChecklist.querySelector("span");
            const prev = span ? span.textContent : "Copy Checklist";
            if (span) span.textContent = "Copied!";
            setTimeout(() => {
                if (span) span.textContent = prev;
            }, 1800);
        });
    });
}

// Export Tasks as JSON
if (btnExportTasks) {
    btnExportTasks.addEventListener("click", () => {
        if (!tasks.length) {
            alert("No tasks to export.");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
        const dlAnchor = document.createElement("a");
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `todo-backup-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });
}

loadTasks();
render();
