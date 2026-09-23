const STORAGE_KEY = "zaheer-todo-items";
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const categorySelect = document.getElementById("todo-category");
const prioritySelect = document.getElementById("todo-priority");
const dateInput = document.getElementById("todo-date");
const searchInput = document.getElementById("todo-search");
const btnClearSearch = document.getElementById("btn-clear-search");
const sortSelect = document.getElementById("todo-sort");
const list = document.getElementById("todo-list");
const emptyMsg = document.getElementById("empty-msg");
const countAll = document.getElementById("count-all");
const countActive = document.getElementById("count-active");
const countDone = document.getElementById("count-done");
const clearDoneBtn = document.getElementById("clear-done-btn");
const btnMarkAll = document.getElementById("btn-mark-all");
const progressText = document.getElementById("progress-text");
const progressCounts = document.getElementById("progress-counts");
const progressFill = document.getElementById("progress-fill");
const btnCopyChecklist = document.getElementById("btn-copy-checklist");
const btnExportTasks = document.getElementById("btn-export-tasks");
const btnImportTasks = document.getElementById("btn-import-tasks");
const importFileInput = document.getElementById("import-file-input");
const btnResetDemo = document.getElementById("btn-reset-demo");
const btnSoundToggle = document.getElementById("btn-sound-toggle");
const soundIcon = document.getElementById("sound-icon");
const soundLabel = document.getElementById("sound-label");

let tasks = [];
let filter = "all";
let searchQuery = "";
let currentSort = "newest";
let editingTaskId = null;
let soundEnabled = localStorage.getItem("zaheer-todo-sound") !== "false";

// Web Audio API Chime Synth
let audioCtx = null;
function playChime(isDone) {
    if (!soundEnabled) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") audioCtx.resume();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (isDone) {
            // Ascending major chime for completion
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.3);
        } else {
            // Soft click for unchecking
            osc.type = "triangle";
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.16);
        }
    } catch {
        // Fallback: silent if audio not supported
    }
}

const DEFAULT_TASKS = [
    { id: "seed-1", text: "Review Weather Dashboard Pro live analytics & soundscapes", category: "project", priority: "high", dueDate: "", done: true, createdAt: Date.now() - 3600000 * 24 },
    { id: "seed-2", text: "Test API Status Dashboard latency against GitHub API", category: "work", priority: "normal", dueDate: new Date().toISOString().slice(0, 10), done: false, createdAt: Date.now() - 3600000 * 12 },
    { id: "seed-3", text: "Benchmark CS Algorithm Playground HeapSort & Search Duel", category: "study", priority: "urgent", dueDate: "", done: false, createdAt: Date.now() - 3600000 * 4 },
    { id: "seed-4", text: "Organize weekend developer showcase & code documentation", category: "personal", priority: "normal", dueDate: "", done: false, createdAt: Date.now() }
];

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            tasks = JSON.parse(saved);
            // Ensure default fields for older saved items
            tasks.forEach(t => {
                if (!t.category) t.category = "project";
                if (!t.createdAt) t.createdAt = Date.now();
            });
        } else {
            tasks = DEFAULT_TASKS;
            saveTasks();
        }
    } catch {
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

    if (btnMarkAll) {
        btnMarkAll.textContent = active === 0 && total > 0 ? "Mark All Active" : "Mark All Done";
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

const CATEGORY_NAMES = {
    work: "💼 Work",
    study: "🎓 Study",
    project: "💻 Project",
    personal: "🏠 Personal",
    general: "⚡ General"
};

function visibleTasks() {
    let filtered = tasks.filter((task) => {
        // Tab filter
        if (filter === "active" && task.done) return false;
        if (filter === "done" && !task.done) return false;

        // Search query filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const textMatch = task.text.toLowerCase().includes(query);
            const priorityMatch = (task.priority || "").toLowerCase().includes(query);
            const categoryMatch = (task.category || "").toLowerCase().includes(query);
            const dateMatch = (task.dueDate || "").includes(query);
            if (!textMatch && !priorityMatch && !categoryMatch && !dateMatch) return false;
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (currentSort === "oldest") {
            return (a.createdAt || 0) - (b.createdAt || 0);
        } else if (currentSort === "due") {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        } else if (currentSort === "priority") {
            const prioRank = { urgent: 3, high: 2, normal: 1 };
            return (prioRank[b.priority] || 1) - (prioRank[a.priority] || 1);
        } else if (currentSort === "alpha") {
            return a.text.localeCompare(b.text);
        } else {
            // newest
            return (b.createdAt || 0) - (a.createdAt || 0);
        }
    });

    return filtered;
}

function render() {
    const items = visibleTasks();
    list.innerHTML = items.map((task) => {
        const priority = task.priority || "normal";
        const catKey = task.category || "project";
        const isEditing = editingTaskId === task.id;
        const dueBadge = getDueDateBadge(task.dueDate, task.done);
        const catLabel = CATEGORY_NAMES[catKey] || "⚡ General";

        return `
            <li class="${task.done ? "is-done" : ""}" data-id="${task.id}">
                <input type="checkbox" data-id="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark task done">
                
                <div class="item-content-wrap">
                    <div class="task-main-line">
                        <span class="category-tag ${catKey}">${catLabel}</span>
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
            editInput.select();
        }
    }
}

function escapeHtml(string) {
    return String(string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Add task
if (form) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        const priority = prioritySelect ? prioritySelect.value : "normal";
        const category = categorySelect ? categorySelect.value : "project";
        const dueDate = dateInput ? dateInput.value : "";

        tasks.unshift({
            id: "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            text,
            category,
            priority,
            dueDate,
            done: false,
            createdAt: Date.now()
        });

        saveTasks();
        input.value = "";
        if (dateInput) dateInput.value = "";
        render();
        playChime(true);
    });
}

// Search tasks
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        if (btnClearSearch) {
            btnClearSearch.hidden = !searchQuery;
        }
        render();
    });
}

if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        searchQuery = "";
        btnClearSearch.hidden = true;
        render();
    });
}

// Sort tasks
if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        render();
    });
}

// List actions: Checkbox, Edit, Delete
list.addEventListener("click", (event) => {
    const target = event.target;

    // Toggle done
    if (target.matches("input[type='checkbox']")) {
        const id = target.dataset.id;
        const task = tasks.find((t) => t.id === id);
        if (task) {
            task.done = target.checked;
            saveTasks();
            render();
            playChime(task.done);
        }
        return;
    }

    // Delete
    if (target.closest(".delete-btn")) {
        const id = target.closest(".delete-btn").dataset.id;
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks();
        render();
        return;
    }

    // Edit button
    if (target.closest(".edit-btn")) {
        const id = target.closest(".edit-btn").dataset.id;
        if (editingTaskId === id) {
            // Clicked save
            commitEdit(id);
        } else {
            // Start editing
            editingTaskId = id;
            render();
        }
    }
});

function commitEdit(id) {
    const editInput = list.querySelector(`.inline-edit-input[data-id="${id}"]`);
    if (editInput) {
        const newText = editInput.value.trim();
        if (newText) {
            const task = tasks.find((t) => t.id === id);
            if (task) {
                task.text = newText;
                saveTasks();
            }
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

// Clear completed tasks
if (clearDoneBtn) {
    clearDoneBtn.addEventListener("click", () => {
        tasks = tasks.filter((task) => !task.done);
        saveTasks();
        render();
    });
}

// Mark All Completed / Active
if (btnMarkAll) {
    btnMarkAll.addEventListener("click", () => {
        const hasActive = tasks.some(t => !t.done);
        tasks.forEach(t => {
            t.done = hasActive;
        });
        saveTasks();
        render();
        playChime(hasActive);
    });
}

// Filter tabs
document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
        filter = button.dataset.filter;
        document.querySelectorAll(".filter-btn").forEach((item) => {
            item.classList.toggle("is-active", item === button);
        });
        render();
    });
});

// Sound toggle
if (btnSoundToggle) {
    btnSoundToggle.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem("zaheer-todo-sound", soundEnabled ? "true" : "false");
        if (soundIcon) soundIcon.textContent = soundEnabled ? "🔔" : "🔕";
        if (soundLabel) soundLabel.textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
        if (soundEnabled) playChime(true);
    });
    // Set initial UI
    if (soundIcon) soundIcon.textContent = soundEnabled ? "🔔" : "🔕";
    if (soundLabel) soundLabel.textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
}

// Copy Checklist
if (btnCopyChecklist) {
    btnCopyChecklist.addEventListener("click", () => {
        if (!tasks.length) {
            alert("No tasks to copy.");
            return;
        }

        const lines = tasks.map(t => {
            const check = t.done ? "[x]" : "[ ]";
            const due = t.dueDate ? ` (Due: ${t.dueDate})` : "";
            const cat = `[${(t.category || "project").toUpperCase()}]`;
            const prio = `[${(t.priority || "normal").toUpperCase()}]`;
            return `${check} ${cat} ${prio} ${t.text}${due}`;
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
        dlAnchor.setAttribute("download", `todo-tasks-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });
}

// Import Tasks from JSON
if (btnImportTasks && importFileInput) {
    btnImportTasks.addEventListener("click", () => {
        importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    // Valid array of tasks
                    const validTasks = imported.map((item, idx) => ({
                        id: item.id || `imported-${Date.now()}-${idx}`,
                        text: String(item.text || "Untitled Task"),
                        category: item.category || "project",
                        priority: ["urgent", "high", "normal"].includes(item.priority) ? item.priority : "normal",
                        dueDate: item.dueDate || "",
                        done: Boolean(item.done),
                        createdAt: item.createdAt || Date.now()
                    }));

                    tasks = validTasks;
                    saveTasks();
                    render();
                    playChime(true);
                    alert(`Successfully imported ${validTasks.length} tasks!`);
                } else {
                    alert("Invalid JSON format: Expected an array of tasks.");
                }
            } catch (err) {
                alert("Failed to parse JSON file: " + err.message);
            }
            importFileInput.value = "";
        };
        reader.readAsText(file);
    });
}

// Reset Demo Tasks
if (btnResetDemo) {
    btnResetDemo.addEventListener("click", () => {
        if (confirm("Reset to default demo tasks? Any custom tasks will be overwritten.")) {
            tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
            saveTasks();
            render();
            playChime(true);
        }
    });
}

loadTasks();
render();
