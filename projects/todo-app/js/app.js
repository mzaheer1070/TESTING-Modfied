const STORAGE_KEY = "zaheer-todo-items";
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const prioritySelect = document.getElementById("todo-priority");
const list = document.getElementById("todo-list");
const emptyMsg = document.getElementById("empty-msg");
const countAll = document.getElementById("count-all");
const countActive = document.getElementById("count-active");
const countDone = document.getElementById("count-done");
const clearDoneBtn = document.getElementById("clear-done-btn");

let tasks = [];
let filter = "all";

const DEFAULT_TASKS = [
    { id: "seed-1", text: "Review Weather Dashboard Pro live analytics & soundscapes", priority: "high", done: true },
    { id: "seed-2", text: "Test API Status Dashboard latency against GitHub API", priority: "normal", done: false },
    { id: "seed-3", text: "Deploy updated portfolio projects with SVG v-shape arrows", priority: "urgent", done: false }
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

function updateCounts() {
    const total = tasks.length;
    const active = tasks.filter((t) => !t.done).length;
    const done = total - active;

    if (countAll) countAll.textContent = total;
    if (countActive) countActive.textContent = active;
    if (countDone) countDone.textContent = done;

    if (clearDoneBtn) {
        clearDoneBtn.style.display = done > 0 ? "inline-block" : "none";
    }
}

function visibleTasks() {
    if (filter === "active") return tasks.filter((task) => !task.done);
    if (filter === "done") return tasks.filter((task) => task.done);
    return tasks;
}

function render() {
    const items = visibleTasks();
    list.innerHTML = items.map((task) => {
        const priority = task.priority || "normal";
        return `
            <li class="${task.done ? "is-done" : ""}">
                <input type="checkbox" data-id="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark task done">
                <span class="priority-tag ${priority}">${priority}</span>
                <span>${escapeHtml(task.text)}</span>
                <button type="button" class="delete-btn" data-id="${task.id}">Delete</button>
            </li>
        `;
    }).join("");

    emptyMsg.hidden = tasks.length > 0;
    list.hidden = items.length === 0 && tasks.length > 0;
    updateCounts();
}

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const priority = prioritySelect ? prioritySelect.value : "normal";
    const taskId = (window.crypto && typeof window.crypto.randomUUID === "function")
        ? window.crypto.randomUUID()
        : "todo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);

    tasks.unshift({
        id: taskId,
        text,
        priority,
        done: false
    });

    input.value = "";
    saveTasks();
    render();
});

list.addEventListener("click", (event) => {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.matches('input[type="checkbox"]')) {
        tasks = tasks.map((task) => (task.id === id ? { ...task, done: target.checked } : task));
    }

    if (target.matches(".delete-btn")) {
        tasks = tasks.filter((task) => task.id !== id);
    }

    saveTasks();
    render();
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

loadTasks();
render();
