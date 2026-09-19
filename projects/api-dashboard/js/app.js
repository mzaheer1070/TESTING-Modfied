const PROBES = [
    { method: "GET", url: "https://jsonplaceholder.typicode.com/posts/1" },
    { method: "GET", url: "https://jsonplaceholder.typicode.com/users/1" },
    { method: "GET", url: "https://jsonplaceholder.typicode.com/todos/1" },
    { method: "GET", url: "https://api.github.com/zen" },
    {
        method: "POST",
        url: "https://jsonplaceholder.typicode.com/posts",
        body: JSON.stringify({ title: "health-check", body: "ping", userId: 1 }),
        headers: { "Content-Type": "application/json" }
    }
];

const statsGrid = document.getElementById("stats-grid");
const logList = document.getElementById("log-list");
const refreshButton = document.getElementById("refresh-log");
const statusLine = document.getElementById("dashboard-status");

let requestHistory = [];
let autoRefreshTimer = null;

function shortUrl(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.hostname}${parsed.pathname}`;
    } catch (error) {
        return url;
    }
}

function statusClass(status, ok) {
    if (!ok || status === 0) return "error";
    if (status >= 200 && status < 300) return "ok";
    if (status >= 400) return "warn";
    return "warn";
}

async function runProbe(probe) {
    const start = performance.now();
    const options = {
        method: probe.method,
        headers: { ...(probe.headers || {}) }
    };

    if (probe.body && ["POST", "PUT", "PATCH"].includes(probe.method)) {
        options.body = probe.body;
        if (!options.headers["Content-Type"]) {
            options.headers["Content-Type"] = "application/json";
        }
    }

    try {
        const response = await fetch(probe.url, options);
        const latency = Math.round(performance.now() - start);

        const responseHeaders = [];
        response.headers.forEach((val, key) => {
            responseHeaders.push({ name: key, value: val });
        });

        let bodyText = "";
        try {
            const raw = await response.text();
            try {
                const parsed = JSON.parse(raw);
                bodyText = JSON.stringify(parsed, null, 2);
            } catch {
                bodyText = raw || "(Empty body)";
            }
        } catch (readErr) {
            bodyText = "(Could not read body: " + (readErr?.message || "stream closed") + ")";
        }

        return {
            id: "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            method: probe.method,
            url: probe.url,
            status: response.status,
            statusText: response.statusText || (response.ok ? "OK" : "Error"),
            latency,
            ok: response.ok,
            headers: responseHeaders,
            body: bodyText,
            time: new Date()
        };
    } catch (error) {
        return {
            id: "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            method: probe.method,
            url: probe.url,
            status: 0,
            statusText: "Network Error / CORS Blocked",
            latency: Math.round(performance.now() - start),
            ok: false,
            headers: [],
            body: `Request failed: ${error?.message || "Network Error"}\n\nNote: Browsers block cross-origin requests without CORS headers. Try a CORS-friendly API like GitHub or Open-Meteo.`,
            time: new Date()
        };
    }
}

function renderStats(results) {
    const total = results.length;
    const successes = results.filter((item) => item.ok).length;
    const errors = total - successes;
    const avgLatency = total
        ? Math.round(results.reduce((sum, item) => sum + item.latency, 0) / total)
        : 0;
    const successRate = total ? ((successes / total) * 100).toFixed(1) : "0.0";

    const stats = [
        { label: "Requests (this scan)", value: total },
        { label: "Success rate", value: `${successRate}%` },
        { label: "Avg latency (real)", value: `${avgLatency} ms` },
        { label: "Failed requests", value: errors }
    ];

    statsGrid.innerHTML = stats.map((stat) => `
        <article class="stat-box">
            <span>${stat.label}</span>
            <strong>${stat.value}</strong>
        </article>
    `).join("");
}

function renderLog(entries) {
    if (!entries.length) {
        logList.innerHTML = `<li class="log-empty">No requests yet.</li>`;
        return;
    }

    logList.innerHTML = entries.map((entry) => {
        const label = statusClass(entry.status, entry.ok);
        const statusText = entry.status === 0 ? "ERR" : entry.status;

        return `
            <li data-request-id="${entry.id}" title="Click to inspect response & headers">
                <span class="status ${label}">${statusText}</span>
                <span>${entry.method} ${shortUrl(entry.url)}</span>
                <span>${entry.latency} ms</span>
            </li>
        `;
    }).join("");
}

// Inspector DOM Elements
const inspectorCard = document.getElementById("inspector-card");
const inspectorStatusBadge = document.getElementById("inspector-status-badge");
const inspectorUrl = document.getElementById("inspector-url");
const inspectorLatency = document.getElementById("inspector-latency");
const inspectorBodyCode = document.getElementById("inspector-body-code");
const inspectorHeadersBody = document.getElementById("inspector-headers-body");
const headersCount = document.getElementById("headers-count");
const btnCopyResponse = document.getElementById("btn-copy-response");
const btnCloseInspector = document.getElementById("btn-close-inspector");
const btnToggleOptions = document.getElementById("btn-toggle-options");
const probeAdvancedPanel = document.getElementById("probe-advanced-panel");
const probeHeaders = document.getElementById("probe-headers");
const probeBody = document.getElementById("probe-body");
const exportLogBtn = document.getElementById("export-log");

let currentInspectedResult = null;

function showInspector(result) {
    if (!inspectorCard || !result) return;
    currentInspectedResult = result;

    const label = statusClass(result.status, result.ok);
    const statusText = result.status === 0 ? "0 Network Error" : `${result.status} ${result.statusText || ""}`;

    inspectorStatusBadge.className = `inspector-badge ${label}`;
    inspectorStatusBadge.textContent = statusText;

    inspectorUrl.textContent = `${result.method} ${result.url}`;
    inspectorLatency.textContent = `⏱ ${result.latency} ms`;

    inspectorBodyCode.textContent = result.body || "(No response payload)";

    // Headers
    const headers = result.headers || [];
    headersCount.textContent = headers.length;
    if (headers.length > 0) {
        inspectorHeadersBody.innerHTML = headers.map(h => `
            <tr>
                <td>${escapeHtml(h.name)}</td>
                <td>${escapeHtml(h.value)}</td>
            </tr>
        `).join("");
    } else {
        inspectorHeadersBody.innerHTML = `<tr><td colspan="2" style="color: var(--muted); text-align: center;">No headers available</td></tr>`;
    }

    inspectorCard.hidden = false;
    inspectorCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

if (btnCloseInspector) {
    btnCloseInspector.addEventListener("click", () => {
        inspectorCard.hidden = true;
    });
}

if (btnCopyResponse) {
    btnCopyResponse.addEventListener("click", () => {
        if (!currentInspectedResult || !currentInspectedResult.body) return;
        navigator.clipboard.writeText(currentInspectedResult.body).then(() => {
            const prev = btnCopyResponse.textContent;
            btnCopyResponse.textContent = "Copied!";
            setTimeout(() => {
                btnCopyResponse.textContent = prev;
            }, 1800);
        });
    });
}

// Inspector Tabs
document.querySelectorAll(".inspector-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".inspector-tab").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");

        const targetTab = tab.dataset.tab;
        const tabBody = document.getElementById("tab-content-body");
        const tabHeaders = document.getElementById("tab-content-headers");

        if (targetTab === "headers") {
            tabBody.hidden = true;
            tabHeaders.hidden = false;
        } else {
            tabBody.hidden = false;
            tabHeaders.hidden = true;
        }
    });
});

// Advanced Options Toggle
if (btnToggleOptions && probeAdvancedPanel) {
    btnToggleOptions.addEventListener("click", () => {
        const isHidden = probeAdvancedPanel.hidden;
        probeAdvancedPanel.hidden = !isHidden;
        btnToggleOptions.textContent = isHidden ? "Advanced Options ▴" : "Advanced Options ▾";
    });
}

// Click history row to inspect
if (logList) {
    logList.addEventListener("click", (e) => {
        const li = e.target.closest("li[data-request-id]");
        if (!li) return;
        const id = li.dataset.requestId;
        const found = requestHistory.find(item => item.id === id);
        if (found) {
            showInspector(found);
        }
    });
}

// Export History as JSON
if (exportLogBtn) {
    exportLogBtn.addEventListener("click", () => {
        if (!requestHistory.length) {
            alert("No telemetry history to export yet.");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(requestHistory, null, 2));
        const dlAnchor = document.createElement("a");
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `api-telemetry-${new Date().toISOString().slice(0, 19)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });
}

async function scanApis() {
    refreshButton.disabled = true;
    refreshButton.textContent = "Scanning…";

    if (statusLine) {
        statusLine.textContent = "Calling live public APIs (JSONPlaceholder & GitHub)…";
        statusLine.dataset.type = "info";
    }

    const results = await Promise.all(PROBES.map((probe) => runProbe(probe)));

    requestHistory = [...results, ...requestHistory].slice(0, 15);
    renderStats(results);
    renderLog(requestHistory);

    const failures = results.filter((item) => !item.ok).length;

    if (statusLine) {
        statusLine.textContent = failures
            ? `${failures} request(s) failed — status codes and latency above are from real network calls.`
            : "All probes succeeded. Status codes and latency are from real network calls.";
        statusLine.dataset.type = failures ? "warn" : "success";
    }

    refreshButton.disabled = false;
    refreshButton.textContent = "Scan again";
}

const customForm = document.getElementById("custom-probe-form");
const probeMethod = document.getElementById("probe-method");
const probeUrl = document.getElementById("probe-url");
const btnProbe = document.getElementById("btn-probe");
const clearLogBtn = document.getElementById("clear-log");
const autoRefreshSelect = document.getElementById("auto-refresh-select");

refreshButton.addEventListener("click", () => {
    scanApis();
});

if (clearLogBtn) {
    clearLogBtn.addEventListener("click", () => {
        requestHistory = [];
        renderLog(requestHistory);
        if (inspectorCard) inspectorCard.hidden = true;
    });
}

if (customForm) {
    customForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = probeUrl.value.trim();
        const method = probeMethod.value;
        if (!url) return;

        // Parse optional custom headers
        let headers = {};
        if (probeHeaders && probeHeaders.value.trim()) {
            const raw = probeHeaders.value.trim();
            try {
                headers = JSON.parse(raw);
            } catch {
                raw.split("\n").forEach(line => {
                    const idx = line.indexOf(":");
                    if (idx > 0) {
                        const k = line.slice(0, idx).trim();
                        const v = line.slice(idx + 1).trim();
                        if (k && v) headers[k] = v;
                    }
                });
            }
        }

        // Parse optional body
        let body = null;
        if (probeBody && probeBody.value.trim() && ["POST", "PUT", "PATCH"].includes(method)) {
            body = probeBody.value.trim();
        }

        btnProbe.disabled = true;
        btnProbe.textContent = "Probing…";
        if (statusLine) {
            statusLine.textContent = `Probing custom endpoint ${method} ${url}…`;
            statusLine.dataset.type = "info";
        }

        const result = await runProbe({ method, url, headers, body });
        requestHistory.unshift(result);
        requestHistory = requestHistory.slice(0, 25);
        renderLog(requestHistory);
        showInspector(result);

        if (statusLine) {
            statusLine.textContent = `Probed ${method} ${shortUrl(url)}: HTTP ${result.status || 'ERR'} (${result.latency}ms)`;
            statusLine.dataset.type = result.ok ? "success" : "warn";
        }

        btnProbe.disabled = false;
        btnProbe.textContent = "Test Endpoint";
    });
}

document.querySelectorAll(".preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
        const url = chip.dataset.presetUrl;
        if (url && probeUrl) {
            probeUrl.value = url;
            if (customForm) customForm.dispatchEvent(new Event("submit"));
        }
    });
});

if (autoRefreshSelect) {
    autoRefreshSelect.addEventListener("change", () => {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        const interval = parseInt(autoRefreshSelect.value, 10);
        if (interval > 0) {
            autoRefreshTimer = window.setInterval(scanApis, interval);
        }
    });
}

scanApis();
autoRefreshTimer = window.setInterval(scanApis, 30000);
