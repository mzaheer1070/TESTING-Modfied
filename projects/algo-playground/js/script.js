/**
 * CS Algorithm Playground & VS Race - Interactive Suite
 * Author: Muhammad Zaheer
 */

document.addEventListener("DOMContentLoaded", () => {
    setupTabRouting();
    setupVsRace();
    setupSingleSorting();
    setupBfsMaze();
    setupNeuralGate();
});

// Tab Switcher
function setupTabRouting() {
    const tabs = document.querySelectorAll(".arena-tab");
    const panels = {
        "vs-algo": document.getElementById("panelVsAlgo"),
        "sorting": document.getElementById("panelSorting"),
        "pathfinding": document.getElementById("panelPathfinding"),
        "neural": document.getElementById("panelNeural")
    };

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => {
                t.classList.remove("is-active");
                t.setAttribute("aria-selected", "false");
            });
            tab.classList.add("is-active");
            tab.setAttribute("aria-selected", "true");

            Object.entries(panels).forEach(([key, panel]) => {
                if (panel) {
                    if (key === target) {
                        panel.classList.add("is-active");
                        panel.hidden = false;
                    } else {
                        panel.classList.remove("is-active");
                        panel.hidden = true;
                    }
                }
            });
        });
    });
}

/* ==========================================================================
   1. ALGORITHM VS (HEAD-TO-HEAD RACE)
   ========================================================================== */
function setupVsRace() {
    const containerA = document.getElementById("vsBarsA");
    const containerB = document.getElementById("vsBarsB");
    const btnRun = document.getElementById("btnRunVsRace");
    const btnReset = document.getElementById("btnResetVsRace");
    const selectA = document.getElementById("vsAlgoLeft");
    const selectB = document.getElementById("vsAlgoRight");
    const speedRange = document.getElementById("vsSpeed");
    const nameA = document.getElementById("vsNameA");
    const nameB = document.getElementById("vsNameB");
    const compsA = document.getElementById("vsCompsA");
    const compsB = document.getElementById("vsCompsB");
    const swapsA = document.getElementById("vsSwapsA");
    const swapsB = document.getElementById("vsSwapsB");
    const statusA = document.getElementById("vsStatusA");
    const statusB = document.getElementById("vsStatusB");
    const timerA = document.getElementById("vsTimerA");
    const timerB = document.getElementById("vsTimerB");
    const verdictText = document.getElementById("vsVerdictText");
    const fighterCardA = document.getElementById("vsFighterLeft");
    const fighterCardB = document.getElementById("vsFighterRight");

    if (!containerA || !containerB || !btnRun) return;

    const ARRAY_SIZE = 24;
    let baseArray = [];
    let isRacing = false;
    let finishA = null;
    let finishB = null;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getDelay() {
        const val = speedRange ? parseInt(speedRange.value, 10) : 65;
        return Math.max(6, Math.floor(180 - (val * 1.65)));
    }

    function generateDataset() {
        baseArray = [];
        for (let i = 0; i < ARRAY_SIZE; i++) {
            baseArray.push(Math.floor(Math.random() * 140) + 15);
        }
        resetFighterA();
        resetFighterB();
        if (fighterCardA) fighterCardA.classList.remove("is-winner", "is-running");
        if (fighterCardB) fighterCardB.classList.remove("is-winner", "is-running");
        if (verdictText) {
            verdictText.textContent = "New dataset generated! Press 'Run VS Race' to benchmark time complexity live.";
        }
    }

    function renderBars(container, arr, highlights = {}) {
        if (!container) return;
        container.innerHTML = "";
        arr.forEach((val, idx) => {
            const bar = document.createElement("div");
            bar.className = "sort-bar";
            bar.style.height = `${(val / 160) * 100}%`;
            if (highlights.comparing && highlights.comparing.includes(idx)) {
                bar.classList.add("is-comparing");
            } else if (highlights.pivot === idx) {
                bar.classList.add("is-pivot");
            } else if (highlights.sorted && highlights.sorted.includes(idx)) {
                bar.classList.add("is-sorted");
            }
            container.appendChild(bar);
        });
    }

    function resetFighterA() {
        renderBars(containerA, [...baseArray]);
        if (compsA) compsA.textContent = "0";
        if (swapsA) swapsA.textContent = "0";
        if (statusA) statusA.textContent = "Ready";
        if (timerA) timerA.textContent = "-- ms";
        if (nameA && selectA) {
            nameA.textContent = selectA.options[selectA.selectedIndex].text.split(" ")[0];
        }
    }

    function resetFighterB() {
        renderBars(containerB, [...baseArray]);
        if (compsB) compsB.textContent = "0";
        if (swapsB) swapsB.textContent = "0";
        if (statusB) statusB.textContent = "Ready";
        if (timerB) timerB.textContent = "-- ms";
        if (nameB && selectB) {
            nameB.textContent = selectB.options[selectB.selectedIndex].text.split(" ")[0];
        }
    }

    async function runAlgoA(arr, algo) {
        let comps = 0;
        let swps = 0;
        const startTime = performance.now();

        if (algo === "mergesort") {
            await mergeSort(arr, 0, arr.length - 1);
        } else {
            await quickSort(arr, 0, arr.length - 1);
        }

        async function quickSort(a, start, end) {
            if (!isRacing || start >= end) return;
            const pivotVal = a[end];
            let pIndex = start;
            for (let i = start; i < end; i++) {
                if (!isRacing) return;
                comps++;
                if (compsA) compsA.textContent = comps.toLocaleString();
                renderBars(containerA, a, { comparing: [i, end], pivot: end });
                await sleep(getDelay());

                if (a[i] < pivotVal) {
                    swps++;
                    if (swapsA) swapsA.textContent = swps.toLocaleString();
                    const tmp = a[i]; a[i] = a[pIndex]; a[pIndex] = tmp;
                    pIndex++;
                    renderBars(containerA, a, { comparing: [i, pIndex], pivot: end });
                    await sleep(getDelay());
                }
            }
            swps++;
            if (swapsA) swapsA.textContent = swps.toLocaleString();
            const tmp = a[pIndex]; a[pIndex] = a[end]; a[end] = tmp;
            renderBars(containerA, a, { pivot: pIndex });
            await sleep(getDelay());

            await quickSort(a, start, pIndex - 1);
            await quickSort(a, pIndex + 1, end);
        }

        async function mergeSort(a, l, r) {
            if (!isRacing || l >= r) return;
            const m = Math.floor(l + (r - l) / 2);
            await mergeSort(a, l, m);
            await mergeSort(a, m + 1, r);

            const leftPart = a.slice(l, m + 1);
            const rightPart = a.slice(m + 1, r + 1);
            let i = 0, j = 0, k = l;
            while (i < leftPart.length && j < rightPart.length) {
                if (!isRacing) return;
                comps++;
                if (compsA) compsA.textContent = comps.toLocaleString();
                renderBars(containerA, a, { comparing: [k] });
                await sleep(getDelay());

                if (leftPart[i] <= rightPart[j]) {
                    a[k] = leftPart[i]; i++;
                } else {
                    a[k] = rightPart[j]; j++;
                    swps++;
                    if (swapsA) swapsA.textContent = swps.toLocaleString();
                }
                k++;
            }
            while (i < leftPart.length) {
                if (!isRacing) return;
                a[k++] = leftPart[i++];
                await sleep(getDelay());
            }
            while (j < rightPart.length) {
                if (!isRacing) return;
                a[k++] = rightPart[j++];
                await sleep(getDelay());
            }
            renderBars(containerA, a);
        }

        const endTime = performance.now();
        const elapsed = Math.round(endTime - startTime);
        finishA = { elapsed, comps, swps, algo };
        renderBars(containerA, arr, { sorted: Array.from({ length: arr.length }, (_, i) => i) });
        if (timerA) timerA.textContent = `${elapsed} ms`;
        if (statusA) statusA.textContent = "Done! ✨";
        checkWinner();
    }

    async function runAlgoB(arr, algo) {
        let comps = 0;
        let swps = 0;
        const startTime = performance.now();

        if (algo === "selectionsort") {
            const n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                let minIdx = i;
                for (let j = i + 1; j < n; j++) {
                    if (!isRacing) return;
                    comps++;
                    if (compsB) compsB.textContent = comps.toLocaleString();
                    renderBars(containerB, arr, { comparing: [j, minIdx] });
                    await sleep(getDelay());
                    if (arr[j] < arr[minIdx]) minIdx = j;
                }
                if (minIdx !== i) {
                    swps++;
                    if (swapsB) swapsB.textContent = swps.toLocaleString();
                    const tmp = arr[i]; arr[i] = arr[minIdx]; arr[minIdx] = tmp;
                    renderBars(containerB, arr, { comparing: [i, minIdx] });
                    await sleep(getDelay());
                }
            }
        } else {
            const n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                for (let j = 0; j < n - i - 1; j++) {
                    if (!isRacing) return;
                    comps++;
                    if (compsB) compsB.textContent = comps.toLocaleString();
                    renderBars(containerB, arr, { comparing: [j, j + 1] });
                    await sleep(getDelay());
                    if (arr[j] > arr[j + 1]) {
                        swps++;
                        if (swapsB) swapsB.textContent = swps.toLocaleString();
                        const tmp = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = tmp;
                        renderBars(containerB, arr, { comparing: [j, j + 1] });
                        await sleep(getDelay());
                    }
                }
            }
        }

        const endTime = performance.now();
        const elapsed = Math.round(endTime - startTime);
        finishB = { elapsed, comps, swps, algo };
        renderBars(containerB, arr, { sorted: Array.from({ length: arr.length }, (_, i) => i) });
        if (timerB) timerB.textContent = `${elapsed} ms`;
        if (statusB) statusB.textContent = "Done! ✨";
        checkWinner();
    }

    function checkWinner() {
        if (finishA && !finishB) {
            if (fighterCardA) fighterCardA.classList.add("is-winner");
            if (verdictText) {
                verdictText.innerHTML = `🏆 <strong>Contestant A (${selectA.value.toUpperCase()}) WON!</strong> Finished in ${finishA.elapsed}ms (${finishA.comps} comps). Contestant B is still computing quadratic passes...`;
            }
        } else if (finishB && !finishA) {
            if (fighterCardB) fighterCardB.classList.add("is-winner");
            if (verdictText) {
                verdictText.innerHTML = `🏆 <strong>Contestant B (${selectB.value.toUpperCase()}) WON!</strong> Finished in ${finishB.elapsed}ms.`;
            }
        } else if (finishA && finishB) {
            const faster = finishA.elapsed <= finishB.elapsed ? "A" : "B";
            const ratio = (Math.max(finishA.comps, finishB.comps) / Math.max(1, Math.min(finishA.comps, finishB.comps))).toFixed(1);
            if (verdictText) {
                verdictText.innerHTML = `🏁 <strong>Race Complete!</strong> Contestant ${faster} took 1st place! O(N log N) executed with <strong>${ratio}x fewer operations</strong> than brute-force quadratic sorting.`;
            }
        }
    }

    async function startRace() {
        if (isRacing) return;
        if (!baseArray.length) generateDataset();

        isRacing = true;
        finishA = null;
        finishB = null;
        btnRun.disabled = true;
        btnReset.disabled = true;
        if (selectA) selectA.disabled = true;
        if (selectB) selectB.disabled = true;

        if (fighterCardA) { fighterCardA.classList.remove("is-winner"); fighterCardA.classList.add("is-running"); }
        if (fighterCardB) { fighterCardB.classList.remove("is-winner"); fighterCardB.classList.add("is-running"); }

        if (statusA) statusA.textContent = "Racing... ⚡";
        if (statusB) statusB.textContent = "Racing... ⏳";
        if (verdictText) {
            verdictText.textContent = "⚔️ Race in progress! Compare operations and element transitions in real-time...";
        }

        const copyA = [...baseArray];
        const copyB = [...baseArray];
        const algoA = selectA ? selectA.value : "quicksort";
        const algoB = selectB ? selectB.value : "bubblesort";

        await Promise.all([
            runAlgoA(copyA, algoA),
            runAlgoB(copyB, algoB)
        ]);

        isRacing = false;
        btnRun.disabled = false;
        btnReset.disabled = false;
        if (selectA) selectA.disabled = false;
        if (selectB) selectB.disabled = false;
        if (fighterCardA) fighterCardA.classList.remove("is-running");
        if (fighterCardB) fighterCardB.classList.remove("is-running");
    }

    btnRun.addEventListener("click", () => startRace());
    btnReset.addEventListener("click", () => {
        if (!isRacing) generateDataset();
    });

    if (selectA) selectA.addEventListener("change", () => resetFighterA());
    if (selectB) selectB.addEventListener("change", () => resetFighterB());

    generateDataset();
}

/* ==========================================================================
   2. DEDICATED SINGLE SORTING VISUALIZER
   ========================================================================== */
function setupSingleSorting() {
    const container = document.getElementById("sortBarsContainer");
    const btnRun = document.getElementById("btnRunSort");
    const btnShuffle = document.getElementById("btnShuffleSort");
    const algoSelect = document.getElementById("sortAlgoSelect");
    const speedRange = document.getElementById("sortSpeedRange");
    const compEl = document.getElementById("sortComparisons");
    const swapEl = document.getElementById("sortSwaps");
    const statusEl = document.getElementById("sortStatus");
    const complexEl = document.getElementById("sortComplexity");

    if (!container || !btnRun) return;

    const NUM_BARS = 32;
    let array = [];
    let isSorting = false;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getDelay() {
        const val = speedRange ? parseInt(speedRange.value, 10) : 50;
        return Math.max(5, Math.floor(160 - (val * 1.5)));
    }

    function generateArray() {
        array = [];
        for (let i = 0; i < NUM_BARS; i++) {
            array.push(Math.floor(Math.random() * 140) + 15);
        }
        renderBars();
        if (compEl) compEl.textContent = "0";
        if (swapEl) swapEl.textContent = "0";
        if (statusEl) statusEl.textContent = "Ready";
    }

    function renderBars(highlights = {}) {
        container.innerHTML = "";
        array.forEach((val, idx) => {
            const bar = document.createElement("div");
            bar.className = "sort-bar";
            bar.style.height = `${(val / 160) * 100}%`;
            if (highlights.comparing && highlights.comparing.includes(idx)) {
                bar.classList.add("is-comparing");
            } else if (highlights.pivot === idx) {
                bar.classList.add("is-pivot");
            } else if (highlights.sorted && highlights.sorted.includes(idx)) {
                bar.classList.add("is-sorted");
            }
            container.appendChild(bar);
        });
    }

    async function bubbleSort() {
        let comps = 0, swps = 0;
        const n = array.length;
        for (let i = 0; i < n - 1; i++) {
            for (let j = 0; j < n - i - 1; j++) {
                if (!isSorting) return;
                comps++;
                if (compEl) compEl.textContent = comps.toLocaleString();
                renderBars({ comparing: [j, j + 1] });
                await sleep(getDelay());

                if (array[j] > array[j + 1]) {
                    swps++;
                    if (swapEl) swapEl.textContent = swps.toLocaleString();
                    const tmp = array[j]; array[j] = array[j + 1]; array[j + 1] = tmp;
                    renderBars({ comparing: [j, j + 1] });
                    await sleep(getDelay());
                }
            }
        }
    }

    async function selectionSort() {
        let comps = 0, swps = 0;
        const n = array.length;
        for (let i = 0; i < n - 1; i++) {
            let minIdx = i;
            for (let j = i + 1; j < n; j++) {
                if (!isSorting) return;
                comps++;
                if (compEl) compEl.textContent = comps.toLocaleString();
                renderBars({ comparing: [j, minIdx] });
                await sleep(getDelay());
                if (array[j] < array[minIdx]) minIdx = j;
            }
            if (minIdx !== i) {
                swps++;
                if (swapEl) swapEl.textContent = swps.toLocaleString();
                const tmp = array[i]; array[i] = array[minIdx]; array[minIdx] = tmp;
                renderBars({ comparing: [i, minIdx] });
                await sleep(getDelay());
            }
        }
    }

    async function quickSort(start = 0, end = array.length - 1, state = { comps: 0, swps: 0 }) {
        if (start >= end || !isSorting) return;
        const pivotVal = array[end];
        let pIndex = start;

        for (let i = start; i < end; i++) {
            if (!isSorting) return;
            state.comps++;
            if (compEl) compEl.textContent = state.comps.toLocaleString();
            renderBars({ comparing: [i, end], pivot: end });
            await sleep(getDelay());

            if (array[i] < pivotVal) {
                state.swps++;
                if (swapEl) swapEl.textContent = state.swps.toLocaleString();
                const tmp = array[i]; array[i] = array[pIndex]; array[pIndex] = tmp;
                pIndex++;
                renderBars({ comparing: [i, pIndex], pivot: end });
                await sleep(getDelay());
            }
        }
        state.swps++;
        if (swapEl) swapEl.textContent = state.swps.toLocaleString();
        const tmp = array[pIndex]; array[pIndex] = array[end]; array[end] = tmp;
        renderBars({ pivot: pIndex });
        await sleep(getDelay());

        await quickSort(start, pIndex - 1, state);
        await quickSort(pIndex + 1, end, state);
    }

    btnRun.addEventListener("click", async () => {
        if (isSorting) return;
        isSorting = true;
        btnRun.disabled = true;
        btnShuffle.disabled = true;
        if (statusEl) statusEl.textContent = "Executing...";

        const algo = algoSelect ? algoSelect.value : "quicksort";
        if (algo === "bubblesort") {
            if (complexEl) complexEl.textContent = "O(N²)";
            await bubbleSort();
        } else if (algo === "selectionsort") {
            if (complexEl) complexEl.textContent = "O(N²)";
            await selectionSort();
        } else {
            if (complexEl) complexEl.textContent = "O(N log N)";
            await quickSort();
        }

        renderBars({ sorted: Array.from({ length: array.length }, (_, i) => i) });
        if (statusEl) statusEl.textContent = "Finished ✨";
        isSorting = false;
        btnRun.disabled = false;
        btnShuffle.disabled = false;
    });

    btnShuffle.addEventListener("click", () => {
        if (!isSorting) generateArray();
    });

    if (algoSelect) {
        algoSelect.addEventListener("change", () => {
            if (complexEl) {
                complexEl.textContent = algoSelect.value === "quicksort" ? "O(N log N)" : "O(N²)";
            }
        });
    }

    generateArray();
}

/* ==========================================================================
   3. BFS MAZE SOLVER & PATHFINDING
   ========================================================================== */
function setupBfsMaze() {
    const gridEl = document.getElementById("pathGrid");
    const btnRun = document.getElementById("btnRunBFS");
    const btnMaze = document.getElementById("btnMazeBFS");
    const btnClear = document.getElementById("btnClearBFS");
    const exploredEl = document.getElementById("bfsExplored");
    const pathLenEl = document.getElementById("bfsPathLen");
    const statusEl = document.getElementById("bfsStatus");

    if (!gridEl || !btnRun) return;

    const COLS = 28;
    const ROWS = 14;
    let startNode = { r: 1, c: 1 };
    let endNode = { r: ROWS - 2, c: COLS - 2 };
    let walls = new Set();
    let isMouseDown = false;
    let isRunning = false;

    function coordKey(r, c) { return `${r},${c}`; }

    function renderGrid() {
        gridEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement("div");
                cell.className = "grid-cell";
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (r === startNode.r && c === startNode.c) {
                    cell.classList.add("cell-start");
                } else if (r === endNode.r && c === endNode.c) {
                    cell.classList.add("cell-end");
                } else if (walls.has(coordKey(r, c))) {
                    cell.classList.add("cell-wall");
                }

                cell.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    if (isRunning) return;
                    isMouseDown = true;
                    toggleWall(r, c, cell);
                });

                cell.addEventListener("mouseenter", () => {
                    if (isMouseDown && !isRunning) {
                        toggleWall(r, c, cell);
                    }
                });

                gridEl.appendChild(cell);
            }
        }
    }

    document.addEventListener("mouseup", () => { isMouseDown = false; });

    function toggleWall(r, c, el) {
        if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) return;
        const k = coordKey(r, c);
        if (walls.has(k)) {
            walls.delete(k);
            el.classList.remove("cell-wall");
        } else {
            walls.add(k);
            el.classList.add("cell-wall");
        }
    }

    function clearPathHighlights() {
        gridEl.querySelectorAll(".cell-visited, .cell-path").forEach(cell => {
            cell.classList.remove("cell-visited", "cell-path");
        });
        if (exploredEl) exploredEl.textContent = "0";
        if (pathLenEl) pathLenEl.textContent = "0 steps";
    }

    async function runBFS() {
        if (isRunning) return;
        isRunning = true;
        clearPathHighlights();
        btnRun.disabled = true;
        if (btnMaze) btnMaze.disabled = true;
        if (btnClear) btnClear.disabled = true;
        if (statusEl) statusEl.textContent = "Exploring frontier queue (BFS)...";

        const queue = [[startNode.r, startNode.c]];
        const visited = new Set([coordKey(startNode.r, startNode.c)]);
        const parentMap = new Map();
        const dr = [-1, 1, 0, 0];
        const dc = [0, 0, -1, 1];
        let found = false;
        let exploredCount = 0;

        while (queue.length > 0) {
            const [cr, cc] = queue.shift();
            if (cr === endNode.r && cc === endNode.c) {
                found = true;
                break;
            }

            for (let i = 0; i < 4; i++) {
                const nr = cr + dr[i];
                const nc = cc + dc[i];
                const nk = coordKey(nr, nc);

                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !walls.has(nk) && !visited.has(nk)) {
                    visited.add(nk);
                    parentMap.set(nk, [cr, cc]);
                    queue.push([nr, nc]);
                    exploredCount++;

                    if (!(nr === endNode.r && nc === endNode.c)) {
                        const cell = gridEl.children[nr * COLS + nc];
                        if (cell) cell.classList.add("cell-visited");
                    }
                }
            }

            if (exploredEl) exploredEl.textContent = exploredCount.toString();
            await new Promise(r => setTimeout(r, 14));
        }

        if (found) {
            let curr = [endNode.r, endNode.c];
            let pathLen = 0;
            while (curr) {
                const [pr, pc] = curr;
                if (!(pr === startNode.r && pc === startNode.c) && !(pr === endNode.r && pc === endNode.c)) {
                    const cell = gridEl.children[pr * COLS + pc];
                    if (cell) cell.classList.add("cell-path");
                }
                pathLen++;
                const p = parentMap.get(coordKey(pr, pc));
                if (!p) break;
                curr = p;
                await new Promise(r => setTimeout(r, 22));
            }
            if (pathLenEl) pathLenEl.textContent = `${pathLen} nodes`;
            if (statusEl) statusEl.textContent = "Optimal path discovered! 🎯";
        } else {
            if (statusEl) statusEl.textContent = "No path possible (Target is completely blocked).";
        }

        isRunning = false;
        btnRun.disabled = false;
        if (btnMaze) btnMaze.disabled = false;
        if (btnClear) btnClear.disabled = false;
    }

    btnRun.addEventListener("click", () => runBFS());

    if (btnMaze) {
        btnMaze.addEventListener("click", () => {
            if (isRunning) return;
            walls.clear();
            clearPathHighlights();
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) continue;
                    if (Math.random() < 0.28) {
                        walls.add(coordKey(r, c));
                    }
                }
            }
            renderGrid();
            if (statusEl) statusEl.textContent = "Random obstacle labyrinth generated.";
        });
    }

    if (btnClear) {
        btnClear.addEventListener("click", () => {
            if (isRunning) return;
            walls.clear();
            clearPathHighlights();
            renderGrid();
            if (statusEl) statusEl.textContent = "Grid reset (All walls removed).";
        });
    }

    renderGrid();
}

/* ==========================================================================
   4. NEURAL LOGIC GATE SIMULATOR
   ========================================================================== */
function setupNeuralGate() {
    const pills = document.querySelectorAll(".gate-pill");
    const bitX1 = document.getElementById("bitX1");
    const bitX2 = document.getElementById("bitX2");
    const neuralSum = document.getElementById("neuralSum");
    const neuralSigmoid = document.getElementById("neuralSigmoid");
    const neuralOutput = document.getElementById("neuralOutput");
    const canvas = document.getElementById("neuralCanvas");

    if (!bitX1 || !bitX2 || !canvas) return;

    const ctx = canvas.getContext("2d");
    let currentGate = "AND";
    let x1 = 0;
    let x2 = 0;

    const gateWeights = {
        AND: { w1: 2.0, w2: 2.0, b: -3.0 },
        OR: { w1: 2.5, w2: 2.5, b: -1.2 },
        NAND: { w1: -2.0, w2: -2.0, b: 3.0 },
        XOR: { w1: 0, w2: 0, b: 0 } // non-linear
    };

    function sigmoid(z) {
        return 1 / (1 + Math.exp(-z));
    }

    function calculateGate() {
        let y = 0;
        let z = 0;
        let sig = 0;

        if (currentGate === "XOR") {
            y = (x1 !== x2) ? 1 : 0;
            z = 0;
            sig = y;
            if (neuralSum) neuralSum.textContent = "Non-linear (Requires Multi-Layer MLP)";
            if (neuralSigmoid) neuralSigmoid.textContent = "Non-separable boundary";
        } else {
            const weights = gateWeights[currentGate];
            z = (x1 * weights.w1) + (x2 * weights.w2) + weights.b;
            sig = sigmoid(z);
            y = sig >= 0.5 ? 1 : 0;

            if (neuralSum) neuralSum.textContent = `z = (${x1} × ${weights.w1}) + (${x2} × ${weights.w2}) + (${weights.b}) = ${z.toFixed(2)}`;
            if (neuralSigmoid) neuralSigmoid.textContent = `σ(z) = 1 / (1 + e^(${-z.toFixed(2)})) = ${sig.toFixed(3)}`;
        }

        if (neuralOutput) {
            neuralOutput.textContent = y.toString();
            neuralOutput.style.color = y === 1 ? "#10b981" : "#ef4444";
        }

        drawDecisionBoundary();
    }

    function drawDecisionBoundary() {
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Coordinate axes
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 20); ctx.lineTo(40, h - 30);
        ctx.lineTo(w - 20, h - 30);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "11px monospace";
        ctx.fillText("X₁", w - 15, h - 34);
        ctx.fillText("X₂", 22, 26);

        // Truth table points (0,0), (0,1), (1,0), (1,1)
        const coords = [
            { x: 0, y: 0, px: 80, py: h - 60 },
            { x: 0, y: 1, px: 80, py: 60 },
            { x: 1, y: 0, px: w - 80, py: h - 60 },
            { x: 1, y: 1, px: w - 80, py: 60 }
        ];

        coords.forEach(pt => {
            let active = 0;
            if (currentGate === "AND") active = (pt.x && pt.y) ? 1 : 0;
            else if (currentGate === "OR") active = (pt.x || pt.y) ? 1 : 0;
            else if (currentGate === "NAND") active = !(pt.x && pt.y) ? 1 : 0;
            else if (currentGate === "XOR") active = (pt.x !== pt.y) ? 1 : 0;

            const isCurrent = (pt.x === x1 && pt.y === x2);

            ctx.beginPath();
            ctx.arc(pt.px, pt.py, isCurrent ? 11 : 7, 0, Math.PI * 2);
            ctx.fillStyle = active === 1 ? "#10b981" : "#ef4444";
            ctx.fill();

            if (isCurrent) {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.font = "10px monospace";
            ctx.fillText(`(${pt.x},${pt.y})`, pt.px - 14, pt.py + 18);
        });

        // Linear hyperplane
        if (currentGate !== "XOR") {
            ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            if (currentGate === "AND") {
                ctx.moveTo(w - 120, h - 30);
                ctx.lineTo(40, 40);
            } else if (currentGate === "OR") {
                ctx.moveTo(50, h - 30);
                ctx.lineTo(w - 60, 40);
            } else if (currentGate === "NAND") {
                ctx.moveTo(w - 120, h - 30);
                ctx.lineTo(40, 40);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    pills.forEach(pill => {
        pill.addEventListener("click", () => {
            pills.forEach(p => p.classList.remove("is-active"));
            pill.classList.add("is-active");
            currentGate = pill.dataset.gate;
            calculateGate();
        });
    });

    bitX1.addEventListener("click", () => {
        x1 = x1 === 0 ? 1 : 0;
        bitX1.textContent = x1.toString();
        bitX1.classList.toggle("is-high", x1 === 1);
        calculateGate();
    });

    bitX2.addEventListener("click", () => {
        x2 = x2 === 0 ? 1 : 0;
        bitX2.textContent = x2.toString();
        bitX2.classList.toggle("is-high", x2 === 1);
        calculateGate();
    });

    calculateGate();
}
