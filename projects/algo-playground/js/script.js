/**
 * CS Algorithm Playground & VS Race - Interactive Suite
 * Author: Muhammad Zaheer
 */

document.addEventListener("DOMContentLoaded", () => {
    setupAudioEngine();
    setupTabRouting();
    setupVsRace();
    setupSingleSorting();
    setupSearchDuel();
    setupBfsMaze();
    setupNeuralGate();
});

/* ==========================================================================
   0. AUDIO SONIFICATION ENGINE (Web Audio API)
   ========================================================================== */
let audioCtx = null;
let isAudioActive = false;

function setupAudioEngine() {
    const btnAudio = document.getElementById("btnAudioToggle");
    const audioIcon = document.getElementById("audioIcon");
    const audioLabel = document.getElementById("audioLabel");

    if (!btnAudio) return;

    btnAudio.addEventListener("click", () => {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        isAudioActive = !isAudioActive;
        btnAudio.classList.toggle("is-active", isAudioActive);
        btnAudio.setAttribute("aria-pressed", isAudioActive ? "true" : "false");

        if (audioIcon) audioIcon.textContent = isAudioActive ? "🔊" : "🔈";
        if (audioLabel) audioLabel.textContent = isAudioActive ? "Sound FX: ON" : "Sound FX: OFF";

        if (isAudioActive) {
            playTone(80, 160);
        }
    });
}

function playTone(val, maxVal = 160) {
    if (!isAudioActive) return;
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx.state === "suspended") audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Frequency mapping between 200Hz and 850Hz
        const ratio = Math.max(0.05, Math.min(val / maxVal, 1));
        const freq = 200 + ratio * 650;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.045);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.045);
    } catch (e) {
        // AudioContext silent fallthrough if restricted
    }
}

/* ==========================================================================
   TAB ROUTING
   ========================================================================== */
function setupTabRouting() {
    const tabs = document.querySelectorAll(".arena-tab");
    const panels = {
        "vs-algo": document.getElementById("panelVsAlgo"),
        "sorting": document.getElementById("panelSorting"),
        "search": document.getElementById("panelSearch"),
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates adaptive delay down to 1ms for TRUE PEAK SPEED
 */
function getSpeedDelay(val) {
    if (val >= 98) return 1;       // Peak / Max Speed
    if (val >= 88) return 3;       // Turbo
    if (val >= 70) return 10;      // Fast
    if (val >= 50) return 30;      // Medium
    if (val >= 30) return 70;      // Relaxed
    return Math.round(180 - (val * 1.5)); // Slow Mo
}

function getSpeedBadgeText(val) {
    if (val >= 98) return "🚀 Peak (100%)";
    if (val >= 85) return `⚡ Turbo (${val}%)`;
    if (val >= 65) return `⚡ Fast (${val}%)`;
    if (val >= 40) return `Normal (${val}%)`;
    return `Slow Mo (${val}%)`;
}

function buildDataset(preset, count) {
    const arr = [];
    if (preset === "reversed") {
        const step = 130 / count;
        for (let i = 0; i < count; i++) {
            arr.push(Math.round(150 - (i * step)));
        }
    } else if (preset === "nearly-sorted") {
        const step = 130 / count;
        for (let i = 0; i < count; i++) {
            arr.push(Math.round(20 + (i * step)));
        }
        // Introduce 2 adjacent perturbations
        for (let k = 0; k < 2; k++) {
            const idx = Math.floor(Math.random() * (count - 1));
            const tmp = arr[idx]; arr[idx] = arr[idx + 1]; arr[idx + 1] = tmp;
        }
    } else if (preset === "mountain") {
        const half = Math.floor(count / 2);
        for (let i = 0; i < half; i++) {
            arr.push(Math.round(20 + (i * (130 / half))));
        }
        for (let i = half; i < count; i++) {
            arr.push(Math.round(150 - ((i - half) * (130 / (count - half)))));
        }
    } else {
        // Random
        for (let i = 0; i < count; i++) {
            arr.push(Math.floor(Math.random() * 140) + 15);
        }
    }
    return arr;
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
    const speedLabel = document.getElementById("vsSpeedLabel");
    const presetPills = document.querySelectorAll("#vsPresetPills .preset-pill");
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

    const ARRAY_SIZE = 26;
    let currentPreset = "random";
    let baseArray = [];
    let isRacing = false;
    let finishA = null;
    let finishB = null;

    if (speedRange) {
        speedRange.addEventListener("input", () => {
            const val = parseInt(speedRange.value, 10);
            if (speedLabel) speedLabel.textContent = getSpeedBadgeText(val);
        });
    }

    presetPills.forEach(pill => {
        pill.addEventListener("click", () => {
            if (isRacing) return;
            presetPills.forEach(p => p.classList.remove("is-active"));
            pill.classList.add("is-active");
            currentPreset = pill.dataset.preset;
            generateDataset();
        });
    });

    function getDelay() {
        const val = speedRange ? parseInt(speedRange.value, 10) : 70;
        return getSpeedDelay(val);
    }

    function generateDataset() {
        baseArray = buildDataset(currentPreset, ARRAY_SIZE);
        resetFighterA();
        resetFighterB();
        if (fighterCardA) fighterCardA.classList.remove("is-winner", "is-running");
        if (fighterCardB) fighterCardB.classList.remove("is-winner", "is-running");
        if (verdictText) {
            verdictText.innerHTML = `Dataset loaded [${currentPreset}]. Click <strong>Run VS Race</strong> to benchmark live execution.`;
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

    // Generic Runner for any sorting algorithm
    async function executeAlgo(arr, algo, container, compEl, swapEl, statusEl, timerEl, cardEl, onFinish) {
        let comps = 0;
        let swps = 0;
        const startTime = performance.now();

        function markComp(...indices) {
            comps++;
            if (compEl) compEl.textContent = comps.toLocaleString();
            renderBars(container, arr, { comparing: indices });
            if (indices[0] !== undefined) playTone(arr[indices[0]]);
        }

        function markSwap(i, j) {
            swps++;
            if (swapEl) swapEl.textContent = swps.toLocaleString();
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            renderBars(container, arr, { comparing: [i, j] });
            playTone(arr[i]);
        }

        if (algo === "quicksort") {
            await quickSort(0, arr.length - 1);
        } else if (algo === "mergesort") {
            await mergeSort(0, arr.length - 1);
        } else if (algo === "heapsort") {
            await heapSort();
        } else if (algo === "shellsort") {
            await shellSort();
        } else if (algo === "insertionsort") {
            await insertionSort();
        } else if (algo === "selectionsort") {
            await selectionSort();
        } else if (algo === "radixsort") {
            await radixSort();
        } else {
            await bubbleSort();
        }

        const elapsed = (performance.now() - startTime).toFixed(1);
        if (timerEl) timerEl.textContent = `${elapsed} ms`;
        if (statusEl) statusEl.textContent = "Done 🏁";
        renderBars(container, arr, { sorted: arr.map((_, i) => i) });
        onFinish(elapsed, comps, swps);

        // --- ALGORITHMS IMPLEMENTATION ---
        async function quickSort(start, end) {
            if (!isRacing || start >= end) return;
            const pivotVal = arr[end];
            let pIndex = start;
            for (let i = start; i < end; i++) {
                if (!isRacing) return;
                markComp(i, end);
                await sleep(getDelay());
                if (arr[i] < pivotVal) {
                    markSwap(i, pIndex);
                    pIndex++;
                    await sleep(getDelay());
                }
            }
            markSwap(pIndex, end);
            await sleep(getDelay());
            await quickSort(start, pIndex - 1);
            await quickSort(pIndex + 1, end);
        }

        async function mergeSort(l, r) {
            if (!isRacing || l >= r) return;
            const m = Math.floor(l + (r - l) / 2);
            await mergeSort(l, m);
            await mergeSort(m + 1, r);

            const left = arr.slice(l, m + 1);
            const right = arr.slice(m + 1, r + 1);
            let i = 0, j = 0, k = l;
            while (i < left.length && j < right.length) {
                if (!isRacing) return;
                comps++;
                if (compEl) compEl.textContent = comps.toLocaleString();
                playTone(left[i]);
                if (left[i] <= right[j]) {
                    arr[k] = left[i++];
                } else {
                    arr[k] = right[j++];
                }
                swps++;
                if (swapEl) swapEl.textContent = swps.toLocaleString();
                renderBars(container, arr, { comparing: [k] });
                k++;
                await sleep(getDelay());
            }
            while (i < left.length) {
                if (!isRacing) return;
                arr[k++] = left[i++];
                swps++;
                renderBars(container, arr, { comparing: [k - 1] });
                await sleep(getDelay());
            }
            while (j < right.length) {
                if (!isRacing) return;
                arr[k++] = right[j++];
                swps++;
                renderBars(container, arr, { comparing: [k - 1] });
                await sleep(getDelay());
            }
        }

        async function heapSort() {
            const n = arr.length;
            for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
                if (!isRacing) return;
                await siftDown(n, i);
            }
            for (let i = n - 1; i > 0; i--) {
                if (!isRacing) return;
                markSwap(0, i);
                await sleep(getDelay());
                await siftDown(i, 0);
            }

            async function siftDown(size, root) {
                let largest = root;
                const left = 2 * root + 1;
                const right = 2 * root + 2;

                if (left < size) {
                    markComp(left, largest);
                    await sleep(getDelay());
                    if (arr[left] > arr[largest]) largest = left;
                }
                if (right < size) {
                    markComp(right, largest);
                    await sleep(getDelay());
                    if (arr[right] > arr[largest]) largest = right;
                }
                if (largest !== root) {
                    markSwap(root, largest);
                    await sleep(getDelay());
                    await siftDown(size, largest);
                }
            }
        }

        async function shellSort() {
            const n = arr.length;
            for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
                for (let i = gap; i < n; i++) {
                    if (!isRacing) return;
                    const temp = arr[i];
                    let j = i;
                    while (j >= gap && arr[j - gap] > temp) {
                        if (!isRacing) return;
                        markComp(j, j - gap);
                        arr[j] = arr[j - gap];
                        swps++;
                        if (swapEl) swapEl.textContent = swps.toLocaleString();
                        renderBars(container, arr, { comparing: [j, j - gap] });
                        await sleep(getDelay());
                        j -= gap;
                    }
                    arr[j] = temp;
                }
            }
        }

        async function insertionSort() {
            const n = arr.length;
            for (let i = 1; i < n; i++) {
                const key = arr[i];
                let j = i - 1;
                while (j >= 0 && arr[j] > key) {
                    if (!isRacing) return;
                    markComp(j, j + 1);
                    arr[j + 1] = arr[j];
                    swps++;
                    if (swapEl) swapEl.textContent = swps.toLocaleString();
                    renderBars(container, arr, { comparing: [j, j + 1] });
                    await sleep(getDelay());
                    j--;
                }
                arr[j + 1] = key;
                renderBars(container, arr, { comparing: [j + 1] });
                await sleep(getDelay());
            }
        }

        async function selectionSort() {
            const n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                let minIdx = i;
                for (let j = i + 1; j < n; j++) {
                    if (!isRacing) return;
                    markComp(j, minIdx);
                    await sleep(getDelay());
                    if (arr[j] < arr[minIdx]) minIdx = j;
                }
                if (minIdx !== i) {
                    markSwap(i, minIdx);
                    await sleep(getDelay());
                }
            }
        }

        async function bubbleSort() {
            const n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                let swapped = false;
                for (let j = 0; j < n - i - 1; j++) {
                    if (!isRacing) return;
                    markComp(j, j + 1);
                    await sleep(getDelay());
                    if (arr[j] > arr[j + 1]) {
                        markSwap(j, j + 1);
                        swapped = true;
                        await sleep(getDelay());
                    }
                }
                if (!swapped) break;
            }
        }

        async function radixSort() {
            const max = Math.max(...arr);
            for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
                if (!isRacing) return;
                const output = new Array(arr.length).fill(0);
                const count = new Array(10).fill(0);

                for (let i = 0; i < arr.length; i++) {
                    comps++;
                    const digit = Math.floor(arr[i] / exp) % 10;
                    count[digit]++;
                }
                for (let i = 1; i < 10; i++) count[i] += count[i - 1];
                for (let i = arr.length - 1; i >= 0; i--) {
                    const digit = Math.floor(arr[i] / exp) % 10;
                    output[count[digit] - 1] = arr[i];
                    count[digit]--;
                }
                for (let i = 0; i < arr.length; i++) {
                    if (!isRacing) return;
                    arr[i] = output[i];
                    swps++;
                    renderBars(container, arr, { comparing: [i] });
                    playTone(arr[i]);
                    await sleep(getDelay());
                }
            }
        }
    }

    function checkVerdict() {
        if (!finishA || !finishB) return;
        const timeA = parseFloat(finishA.time);
        const timeB = parseFloat(finishB.time);
        const nameTextA = selectA.options[selectA.selectedIndex].text;
        const nameTextB = selectB.options[selectB.selectedIndex].text;

        let winner = "Tie";
        if (timeA < timeB) {
            winner = "A";
            if (fighterCardA) fighterCardA.classList.add("is-winner");
        } else if (timeB < timeA) {
            winner = "B";
            if (fighterCardB) fighterCardB.classList.add("is-winner");
        }

        if (verdictText) {
            if (winner === "A") {
                const ratio = finishA.comps > 0 ? (finishB.comps / finishA.comps).toFixed(1) : "N/A";
                verdictText.innerHTML = `🏆 <strong>Contestant A (${nameTextA.split(" ")[0]}) WON!</strong> Finished in ${finishA.time}ms with <strong>${ratio}x fewer operations</strong> than Contestant B.`;
            } else if (winner === "B") {
                const ratio = finishB.comps > 0 ? (finishA.comps / finishB.comps).toFixed(1) : "N/A";
                verdictText.innerHTML = `🏆 <strong>Contestant B (${nameTextB.split(" ")[0]}) WON!</strong> Finished in ${finishB.time}ms with <strong>${ratio}x fewer operations</strong> than Contestant A.`;
            } else {
                verdictText.innerHTML = `🤝 <strong>Dead Heat!</strong> Both contestants finished almost simultaneously.`;
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
            verdictText.textContent = "⚔️ Race underway! Observe operational divergence live...";
        }

        const copyA = [...baseArray];
        const copyB = [...baseArray];
        const algoA = selectA ? selectA.value : "quicksort";
        const algoB = selectB ? selectB.value : "bubblesort";

        await Promise.all([
            executeAlgo(copyA, algoA, containerA, compsA, swapsA, statusA, timerA, fighterCardA, (time, comps, swps) => {
                finishA = { time, comps, swps };
                checkVerdict();
            }),
            executeAlgo(copyB, algoB, containerB, compsB, swapsB, statusB, timerB, fighterCardB, (time, comps, swps) => {
                finishB = { time, comps, swps };
                checkVerdict();
            })
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
    const btnPause = document.getElementById("btnPauseSort");
    const btnStep = document.getElementById("btnStepSort");
    const btnShuffle = document.getElementById("btnShuffleSort");
    const algoSelect = document.getElementById("sortAlgoSelect");
    const speedRange = document.getElementById("sortSpeedRange");
    const speedLabel = document.getElementById("sortSpeedLabel");
    const sizeRange = document.getElementById("sortSizeRange");
    const sizeLabel = document.getElementById("sortSizeLabel");
    const presetPills = document.querySelectorAll("#sortPresetPills .preset-pill");
    const compEl = document.getElementById("sortComparisons");
    const swapEl = document.getElementById("sortSwaps");
    const statusEl = document.getElementById("sortStatus");
    const complexEl = document.getElementById("sortComplexity");

    // Algorithm Info elements
    const infoName = document.getElementById("algoInfoName");
    const infoParadigm = document.getElementById("algoInfoParadigm");
    const infoBest = document.getElementById("algoBestTime");
    const infoAvg = document.getElementById("algoAvgTime");
    const infoWorst = document.getElementById("algoWorstTime");
    const infoSpace = document.getElementById("algoSpace");
    const infoStable = document.getElementById("algoStable");
    const infoDesc = document.getElementById("algoInfoDesc");

    if (!container || !btnRun) return;

    let array = [];
    let isSorting = false;
    let isPaused = false;
    let stepResolve = null;
    let currentPreset = "random";

    const ALGO_METADATA = {
        quicksort: {
            name: "QuickSort", paradigm: "Divide & Conquer",
            best: "Ω(N log N)", avg: "Θ(N log N)", worst: "O(N²)",
            space: "O(log N)", stable: "No",
            desc: "Picks an element as pivot and partitions the array around it such that elements smaller than pivot are placed on the left and larger on the right."
        },
        mergesort: {
            name: "MergeSort", paradigm: "Divide & Conquer",
            best: "Ω(N log N)", avg: "Θ(N log N)", worst: "O(N log N)",
            space: "O(N)", stable: "Yes",
            desc: "Divides the array into two halves, recursively sorts them, and efficiently merges the two sorted halves back together in linear time."
        },
        heapsort: {
            name: "HeapSort", paradigm: "Binary Max-Heap",
            best: "Ω(N log N)", avg: "Θ(N log N)", worst: "O(N log N)",
            space: "O(1)", stable: "No",
            desc: "Converts the array into a binary max-heap, repeatedly extracts the maximum root element to the end of the array, and sifts down."
        },
        shellsort: {
            name: "Shell Sort", paradigm: "Diminishing Gap Insertion",
            best: "Ω(N log N)", avg: "Θ(N^1.3)", worst: "O(N²)",
            space: "O(1)", stable: "No",
            desc: "Generalization of insertion sort that allows exchanges of far-apart elements using an adaptive diminishing gap sequence."
        },
        insertionsort: {
            name: "Insertion Sort", paradigm: "Adaptive Incremental",
            best: "Ω(N)", avg: "Θ(N²)", worst: "O(N²)",
            space: "O(1)", stable: "Yes",
            desc: "Builds sorted array one element at a time by repeatedly shifting larger elements right to insert the current item. Blazing fast O(N) on nearly-sorted data."
        },
        selectionsort: {
            name: "Selection Sort", paradigm: "Successive Minimum",
            best: "Ω(N²)", avg: "Θ(N²)", worst: "O(N²)",
            space: "O(1)", stable: "No",
            desc: "Repeatedly finds the minimum element from the unsorted sub-array and swaps it into the beginning. Consistent quadratic comparison count regardless of order."
        },
        bubblesort: {
            name: "Bubble Sort", paradigm: "Adjacent Exchange",
            best: "Ω(N)", avg: "Θ(N²)", worst: "O(N²)",
            space: "O(1)", stable: "Yes",
            desc: "Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order until no more swaps are needed."
        },
        radixsort: {
            name: "Radix Sort (LSD)", paradigm: "Non-comparison Distribution",
            best: "Ω(N·K)", avg: "Θ(N·K)", worst: "O(N·K)",
            space: "O(N + K)", stable: "Yes",
            desc: "Avoids element comparisons altogether by distributing keys into buckets according to individual numerical digits from least to most significant."
        }
    };

    function updateComplexityCard(algoKey) {
        const meta = ALGO_METADATA[algoKey] || ALGO_METADATA.quicksort;
        if (infoName) infoName.textContent = meta.name;
        if (infoParadigm) infoParadigm.textContent = meta.paradigm;
        if (infoBest) infoBest.textContent = meta.best;
        if (infoAvg) infoAvg.textContent = meta.avg;
        if (infoWorst) infoWorst.textContent = meta.worst;
        if (infoSpace) infoSpace.textContent = meta.space;
        if (infoStable) infoStable.textContent = meta.stable;
        if (infoDesc) infoDesc.textContent = meta.desc;
        if (complexEl) complexEl.textContent = meta.avg;
    }

    if (speedRange) {
        speedRange.addEventListener("input", () => {
            const val = parseInt(speedRange.value, 10);
            if (speedLabel) speedLabel.textContent = getSpeedBadgeText(val);
        });
    }

    if (sizeRange) {
        sizeRange.addEventListener("input", () => {
            const val = parseInt(sizeRange.value, 10);
            if (sizeLabel) sizeLabel.textContent = `${val} bars`;
            if (!isSorting) generateArray();
        });
    }

    presetPills.forEach(pill => {
        pill.addEventListener("click", () => {
            if (isSorting) return;
            presetPills.forEach(p => p.classList.remove("is-active"));
            pill.classList.add("is-active");
            currentPreset = pill.dataset.preset;
            generateArray();
        });
    });

    function getDelay() {
        const val = speedRange ? parseInt(speedRange.value, 10) : 50;
        return getSpeedDelay(val);
    }

    async function waitStep() {
        if (!isPaused) {
            await sleep(getDelay());
            return;
        }
        return new Promise(resolve => {
            stepResolve = resolve;
        });
    }

    function generateArray() {
        const count = sizeRange ? parseInt(sizeRange.value, 10) : 32;
        array = buildDataset(currentPreset, count);
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

    async function runSort() {
        if (isSorting) return;
        isSorting = true;
        isPaused = false;
        btnRun.disabled = true;
        btnPause.disabled = false;
        btnShuffle.disabled = true;
        if (statusEl) statusEl.textContent = "Sorting in progress...";

        let comps = 0;
        let swps = 0;

        function markComp(...indices) {
            comps++;
            if (compEl) compEl.textContent = comps.toLocaleString();
            renderBars({ comparing: indices });
            if (indices[0] !== undefined) playTone(array[indices[0]]);
        }

        function markSwap(i, j) {
            swps++;
            if (swapEl) swapEl.textContent = swps.toLocaleString();
            const tmp = array[i]; array[i] = array[j]; array[j] = tmp;
            renderBars({ comparing: [i, j] });
            playTone(array[i]);
        }

        const algo = algoSelect ? algoSelect.value : "quicksort";

        if (algo === "mergesort") {
            await mergeSort(0, array.length - 1);
        } else if (algo === "heapsort") {
            await heapSort();
        } else if (algo === "shellsort") {
            await shellSort();
        } else if (algo === "insertionsort") {
            await insertionSort();
        } else if (algo === "selectionsort") {
            await selectionSort();
        } else if (algo === "bubblesort") {
            await bubbleSort();
        } else if (algo === "radixsort") {
            await radixSort();
        } else {
            await quickSort(0, array.length - 1);
        }

        renderBars({ sorted: array.map((_, i) => i) });
        if (statusEl) statusEl.textContent = "Finished ✨";
        isSorting = false;
        isPaused = false;
        btnRun.disabled = false;
        btnPause.disabled = true;
        btnPause.textContent = "⏸ Pause";
        btnShuffle.disabled = false;

        async function quickSort(start, end) {
            if (!isSorting || start >= end) return;
            const pivotVal = array[end];
            let pIndex = start;
            for (let i = start; i < end; i++) {
                if (!isSorting) return;
                markComp(i, end);
                await waitStep();
                if (array[i] < pivotVal) {
                    markSwap(i, pIndex);
                    pIndex++;
                    await waitStep();
                }
            }
            markSwap(pIndex, end);
            await waitStep();
            await quickSort(start, pIndex - 1);
            await quickSort(pIndex + 1, end);
        }

        async function mergeSort(l, r) {
            if (!isSorting || l >= r) return;
            const m = Math.floor(l + (r - l) / 2);
            await mergeSort(l, m);
            await mergeSort(m + 1, r);

            const left = array.slice(l, m + 1);
            const right = array.slice(m + 1, r + 1);
            let i = 0, j = 0, k = l;
            while (i < left.length && j < right.length) {
                if (!isSorting) return;
                comps++;
                if (compEl) compEl.textContent = comps.toLocaleString();
                playTone(left[i]);
                if (left[i] <= right[j]) {
                    array[k] = left[i++];
                } else {
                    array[k] = right[j++];
                }
                swps++;
                if (swapEl) swapEl.textContent = swps.toLocaleString();
                renderBars({ comparing: [k] });
                k++;
                await waitStep();
            }
            while (i < left.length) {
                if (!isSorting) return;
                array[k++] = left[i++];
                swps++;
                renderBars({ comparing: [k - 1] });
                await waitStep();
            }
            while (j < right.length) {
                if (!isSorting) return;
                array[k++] = right[j++];
                swps++;
                renderBars({ comparing: [k - 1] });
                await waitStep();
            }
        }

        async function heapSort() {
            const n = array.length;
            for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
                if (!isSorting) return;
                await siftDown(n, i);
            }
            for (let i = n - 1; i > 0; i--) {
                if (!isSorting) return;
                markSwap(0, i);
                await waitStep();
                await siftDown(i, 0);
            }

            async function siftDown(size, root) {
                let largest = root;
                const left = 2 * root + 1;
                const right = 2 * root + 2;
                if (left < size) {
                    markComp(left, largest);
                    await waitStep();
                    if (array[left] > array[largest]) largest = left;
                }
                if (right < size) {
                    markComp(right, largest);
                    await waitStep();
                    if (array[right] > array[largest]) largest = right;
                }
                if (largest !== root) {
                    markSwap(root, largest);
                    await waitStep();
                    await siftDown(size, largest);
                }
            }
        }

        async function shellSort() {
            const n = array.length;
            for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
                for (let i = gap; i < n; i++) {
                    if (!isSorting) return;
                    const temp = array[i];
                    let j = i;
                    while (j >= gap && array[j - gap] > temp) {
                        if (!isSorting) return;
                        markComp(j, j - gap);
                        array[j] = array[j - gap];
                        swps++;
                        if (swapEl) swapEl.textContent = swps.toLocaleString();
                        renderBars({ comparing: [j, j - gap] });
                        await waitStep();
                        j -= gap;
                    }
                    array[j] = temp;
                }
            }
        }

        async function insertionSort() {
            const n = array.length;
            for (let i = 1; i < n; i++) {
                const key = array[i];
                let j = i - 1;
                while (j >= 0 && array[j] > key) {
                    if (!isSorting) return;
                    markComp(j, j + 1);
                    array[j + 1] = array[j];
                    swps++;
                    if (swapEl) swapEl.textContent = swps.toLocaleString();
                    renderBars({ comparing: [j, j + 1] });
                    await waitStep();
                    j--;
                }
                array[j + 1] = key;
                renderBars({ comparing: [j + 1] });
                await waitStep();
            }
        }

        async function selectionSort() {
            const n = array.length;
            for (let i = 0; i < n - 1; i++) {
                let minIdx = i;
                for (let j = i + 1; j < n; j++) {
                    if (!isSorting) return;
                    markComp(j, minIdx);
                    await waitStep();
                    if (array[j] < array[minIdx]) minIdx = j;
                }
                if (minIdx !== i) {
                    markSwap(i, minIdx);
                    await waitStep();
                }
            }
        }

        async function bubbleSort() {
            const n = array.length;
            for (let i = 0; i < n - 1; i++) {
                let swapped = false;
                for (let j = 0; j < n - i - 1; j++) {
                    if (!isSorting) return;
                    markComp(j, j + 1);
                    await waitStep();
                    if (array[j] > array[j + 1]) {
                        markSwap(j, j + 1);
                        swapped = true;
                        await waitStep();
                    }
                }
                if (!swapped) break;
            }
        }

        async function radixSort() {
            const max = Math.max(...array);
            for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
                if (!isSorting) return;
                const output = new Array(array.length).fill(0);
                const count = new Array(10).fill(0);
                for (let i = 0; i < array.length; i++) {
                    comps++;
                    count[Math.floor(array[i] / exp) % 10]++;
                }
                for (let i = 1; i < 10; i++) count[i] += count[i - 1];
                for (let i = array.length - 1; i >= 0; i--) {
                    const digit = Math.floor(array[i] / exp) % 10;
                    output[count[digit] - 1] = array[i];
                    count[digit]--;
                }
                for (let i = 0; i < array.length; i++) {
                    if (!isSorting) return;
                    array[i] = output[i];
                    swps++;
                    renderBars({ comparing: [i] });
                    playTone(array[i]);
                    await waitStep();
                }
            }
        }
    }

    btnRun.addEventListener("click", () => runSort());

    btnPause.addEventListener("click", () => {
        if (!isSorting) return;
        isPaused = !isPaused;
        btnPause.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
        if (statusEl) statusEl.textContent = isPaused ? "Paused ⏸" : "Sorting in progress...";
        if (!isPaused && stepResolve) {
            stepResolve();
            stepResolve = null;
        }
    });

    btnStep.addEventListener("click", () => {
        if (!isSorting) {
            runSort();
            isPaused = true;
            btnPause.textContent = "▶ Resume";
        } else if (isPaused && stepResolve) {
            stepResolve();
            stepResolve = null;
        }
    });

    btnShuffle.addEventListener("click", () => {
        if (!isSorting) generateArray();
    });

    if (algoSelect) {
        algoSelect.addEventListener("change", () => {
            updateComplexityCard(algoSelect.value);
        });
    }

    updateComplexityCard("quicksort");
    generateArray();
}

/* ==========================================================================
   3. BINARY VS LINEAR SEARCH DUEL (NEW)
   ========================================================================== */
function setupSearchDuel() {
    const linearTrack = document.getElementById("linearArrayTrack");
    const binaryTrack = document.getElementById("binaryArrayTrack");
    const targetInput = document.getElementById("searchTargetVal");
    const speedRange = document.getElementById("searchSpeed");
    const speedLabel = document.getElementById("searchSpeedLabel");
    const btnRun = document.getElementById("btnRunSearch");
    const btnRandom = document.getElementById("btnRandomTarget");
    const btnNewArray = document.getElementById("btnNewSearchArray");
    const linearTimer = document.getElementById("linearTimer");
    const binaryTimer = document.getElementById("binaryTimer");
    const ptrLow = document.getElementById("ptrLow");
    const ptrMid = document.getElementById("ptrMid");
    const ptrHigh = document.getElementById("ptrHigh");
    const linearChecks = document.getElementById("linearChecks");
    const binaryChecks = document.getElementById("binaryChecks");
    const searchRatio = document.getElementById("searchRatio");

    if (!linearTrack || !binaryTrack || !btnRun) return;

    const ARRAY_SIZE = 32;
    let sortedArray = [];
    let targetVal = 48;
    let isSearching = false;

    if (speedRange) {
        speedRange.addEventListener("input", () => {
            const val = parseInt(speedRange.value, 10);
            if (speedLabel) speedLabel.textContent = getSpeedBadgeText(val);
        });
    }

    function getDelay() {
        const val = speedRange ? parseInt(speedRange.value, 10) : 65;
        return getSpeedDelay(val);
    }

    function generateSortedArray() {
        sortedArray = [];
        let curr = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < ARRAY_SIZE; i++) {
            sortedArray.push(curr);
            curr += Math.floor(Math.random() * 4) + 2;
        }
        // Choose a default target that exists
        const sampleIdx = Math.floor(ARRAY_SIZE * 0.65);
        targetVal = sortedArray[sampleIdx];
        if (targetInput) targetInput.value = targetVal;
        renderTracks();
    }

    function renderTracks() {
        linearTrack.innerHTML = "";
        binaryTrack.innerHTML = "";

        sortedArray.forEach((val, idx) => {
            // Linear Cell
            const cellL = document.createElement("div");
            cellL.className = "search-cell";
            cellL.textContent = val;
            cellL.dataset.idx = idx;
            if (val === targetVal) cellL.classList.add("is-target");
            cellL.addEventListener("click", () => setTarget(val));
            linearTrack.appendChild(cellL);

            // Binary Cell
            const cellB = document.createElement("div");
            cellB.className = "search-cell";
            cellB.textContent = val;
            cellB.dataset.idx = idx;
            if (val === targetVal) cellB.classList.add("is-target");
            cellB.addEventListener("click", () => setTarget(val));
            binaryTrack.appendChild(cellB);
        });

        if (linearTimer) linearTimer.textContent = "Steps: 0 • -- ms";
        if (binaryTimer) binaryTimer.textContent = "Steps: 0 • -- ms";
        if (ptrLow) ptrLow.textContent = "Low: --";
        if (ptrMid) ptrMid.textContent = "Mid: --";
        if (ptrHigh) ptrHigh.textContent = "High: --";
        if (linearChecks) linearChecks.textContent = "0";
        if (binaryChecks) binaryChecks.textContent = "0";
        if (searchRatio) searchRatio.textContent = "--";
        linearTrack.scrollLeft = 0;
        binaryTrack.scrollLeft = 0;
    }

    function setTarget(val) {
        if (isSearching) return;
        targetVal = val;
        if (targetInput) targetInput.value = val;
        renderTracks();
    }

    if (targetInput) {
        targetInput.addEventListener("change", () => {
            const val = parseInt(targetInput.value, 10);
            if (!isNaN(val)) setTarget(val);
        });
    }

    if (btnRandom) {
        btnRandom.addEventListener("click", () => {
            if (isSearching) return;
            const randIdx = Math.floor(Math.random() * sortedArray.length);
            setTarget(sortedArray[randIdx]);
        });
    }

    if (btnNewArray) {
        btnNewArray.addEventListener("click", () => {
            if (isSearching) return;
            generateSortedArray();
        });
    }

    async function runDuel() {
        if (isSearching) return;
        isSearching = true;
        btnRun.disabled = true;
        if (btnRandom) btnRandom.disabled = true;
        if (btnNewArray) btnNewArray.disabled = true;

        renderTracks();

        let linSteps = 0;
        let binSteps = 0;

        // --- LINEAR SEARCH RUNNER ---
        const linearPromise = (async () => {
            const start = performance.now();
            let foundIdx = -1;
            for (let i = 0; i < sortedArray.length; i++) {
                linSteps++;
                if (linearChecks) linearChecks.textContent = linSteps.toString();
                const cell = linearTrack.children[i];
                if (cell) {
                    cell.classList.add("is-checking");
                    cell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    playTone(sortedArray[i]);
                }
                await sleep(getDelay());

                if (sortedArray[i] === targetVal) {
                    foundIdx = i;
                    if (cell) {
                        cell.classList.remove("is-checking");
                        cell.classList.add("is-found");
                    }
                    break;
                } else {
                    if (cell) {
                        cell.classList.remove("is-checking");
                        cell.classList.add("is-eliminated");
                    }
                }
            }
            const elapsed = (performance.now() - start).toFixed(1);
            if (linearTimer) {
                linearTimer.textContent = `Steps: ${linSteps} • ${elapsed} ms ${foundIdx >= 0 ? "🎯" : "❌"}`;
            }
        })();

        // --- BINARY SEARCH RUNNER ---
        const binaryPromise = (async () => {
            const start = performance.now();
            let low = 0;
            let high = sortedArray.length - 1;
            let foundIdx = -1;

            while (low <= high) {
                binSteps++;
                if (binaryChecks) binaryChecks.textContent = binSteps.toString();

                const mid = Math.floor((low + high) / 2);
                if (ptrLow) ptrLow.textContent = `Low: ${low} [${sortedArray[low]}]`;
                if (ptrMid) ptrMid.textContent = `Mid: ${mid} [${sortedArray[mid]}]`;
                if (ptrHigh) ptrHigh.textContent = `High: ${high} [${sortedArray[high]}]`;

                const cell = binaryTrack.children[mid];
                if (cell) {
                    cell.classList.add("is-checking", "is-mid");
                    cell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    playTone(sortedArray[mid]);
                }
                await sleep(getDelay() * 1.4);

                if (sortedArray[mid] === targetVal) {
                    foundIdx = mid;
                    if (cell) {
                        cell.classList.remove("is-checking");
                        cell.classList.add("is-found");
                    }
                    break;
                } else if (sortedArray[mid] < targetVal) {
                    // Eliminate left half
                    for (let k = low; k <= mid; k++) {
                        const c = binaryTrack.children[k];
                        if (c && !c.classList.contains("is-found")) c.classList.add("is-eliminated");
                    }
                    low = mid + 1;
                } else {
                    // Eliminate right half
                    for (let k = mid; k <= high; k++) {
                        const c = binaryTrack.children[k];
                        if (c && !c.classList.contains("is-found")) c.classList.add("is-eliminated");
                    }
                    high = mid - 1;
                }
            }

            const elapsed = (performance.now() - start).toFixed(1);
            if (binaryTimer) {
                binaryTimer.textContent = `Steps: ${binSteps} • ${elapsed} ms ${foundIdx >= 0 ? "🎯" : "❌"}`;
            }
        })();

        await Promise.all([linearPromise, binaryPromise]);

        if (searchRatio) {
            const factor = binSteps > 0 ? (linSteps / binSteps).toFixed(1) : "1.0";
            searchRatio.textContent = `${factor}x faster`;
        }

        isSearching = false;
        btnRun.disabled = false;
        if (btnRandom) btnRandom.disabled = false;
        if (btnNewArray) btnNewArray.disabled = false;
    }

    btnRun.addEventListener("click", () => runDuel());

    generateSortedArray();
}

/* ==========================================================================
   4. 2D MAZE & PATHFINDING (A*, Dijkstra, BFS, DFS)
   ========================================================================== */
function setupBfsMaze() {
    const gridEl = document.getElementById("pathGrid");
    const btnRun = document.getElementById("btnRunBFS");
    const btnMaze = document.getElementById("btnMazeBFS");
    const btnRecursive = document.getElementById("btnRecursiveMaze");
    const btnClear = document.getElementById("btnClearBFS");
    const algoSelect = document.getElementById("pathAlgoSelect");
    const modeText = document.getElementById("pathModeText");
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

    if (algoSelect && modeText) {
        algoSelect.addEventListener("change", () => {
            const labels = {
                astar: "A* Search (Heuristic)",
                dijkstra: "Dijkstra's Algorithm",
                bfs: "Breadth-First Search (FIFO)",
                dfs: "Depth-First Search (LIFO)"
            };
            modeText.textContent = labels[algoSelect.value] || "Pathfinder";
        });
    }

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

    async function solvePath() {
        if (isRunning) return;
        isRunning = true;
        clearPathHighlights();
        btnRun.disabled = true;
        if (btnMaze) btnMaze.disabled = true;
        if (btnRecursive) btnRecursive.disabled = true;
        if (btnClear) btnClear.disabled = true;

        const algo = algoSelect ? algoSelect.value : "astar";
        if (statusEl) statusEl.textContent = `Executing ${algo.toUpperCase()} pathfinder...`;

        const dr = [-1, 1, 0, 0];
        const dc = [0, 0, -1, 1];
        let found = false;
        let exploredCount = 0;
        const parentMap = new Map();

        function manhattan(r, c) {
            return Math.abs(r - endNode.r) + Math.abs(c - endNode.c);
        }

        if (algo === "astar") {
            // Priority Queue / Open Set for A*
            const openSet = [{ r: startNode.r, c: startNode.c, g: 0, f: manhattan(startNode.r, startNode.c) }];
            const gScores = new Map([[coordKey(startNode.r, startNode.c), 0]]);
            const closedSet = new Set();

            while (openSet.length > 0) {
                openSet.sort((a, b) => a.f - b.f);
                const current = openSet.shift();
                const ck = coordKey(current.r, current.c);

                if (current.r === endNode.r && current.c === endNode.c) {
                    found = true;
                    break;
                }
                closedSet.add(ck);

                for (let i = 0; i < 4; i++) {
                    const nr = current.r + dr[i];
                    const nc = current.c + dc[i];
                    const nk = coordKey(nr, nc);

                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !walls.has(nk) && !closedSet.has(nk)) {
                        const tentativeG = current.g + 1;
                        const currentG = gScores.get(nk) ?? Infinity;

                        if (tentativeG < currentG) {
                            gScores.set(nk, tentativeG);
                            parentMap.set(nk, [current.r, current.c]);
                            const fScore = tentativeG + manhattan(nr, nc);
                            openSet.push({ r: nr, c: nc, g: tentativeG, f: fScore });
                            exploredCount++;

                            if (!(nr === endNode.r && nc === endNode.c)) {
                                const cell = gridEl.children[nr * COLS + nc];
                                if (cell) cell.classList.add("cell-visited");
                            }
                        }
                    }
                }

                if (exploredEl) exploredEl.textContent = exploredCount.toString();
                await sleep(10);
            }
        } else if (algo === "dfs") {
            // DFS Stack (LIFO)
            const stack = [[startNode.r, startNode.c]];
            const visited = new Set([coordKey(startNode.r, startNode.c)]);

            while (stack.length > 0) {
                const [cr, cc] = stack.pop();
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
                        stack.push([nr, nc]);
                        exploredCount++;

                        if (!(nr === endNode.r && nc === endNode.c)) {
                            const cell = gridEl.children[nr * COLS + nc];
                            if (cell) cell.classList.add("cell-visited");
                        }
                    }
                }
                if (exploredEl) exploredEl.textContent = exploredCount.toString();
                await sleep(12);
            }
        } else {
            // BFS (FIFO) or Dijkstra (unweighted grid equivalent)
            const queue = [[startNode.r, startNode.c]];
            const visited = new Set([coordKey(startNode.r, startNode.c)]);

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
                await sleep(12);
            }
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
                await sleep(18);
            }
            if (pathLenEl) pathLenEl.textContent = `${pathLen} steps`;
            if (statusEl) statusEl.textContent = "Optimal path mapped! 🎯";
        } else {
            if (statusEl) statusEl.textContent = "No path possible (Target is completely blocked).";
        }

        isRunning = false;
        btnRun.disabled = false;
        if (btnMaze) btnMaze.disabled = false;
        if (btnRecursive) btnRecursive.disabled = false;
        if (btnClear) btnClear.disabled = false;
    }

    btnRun.addEventListener("click", () => solvePath());

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
            if (statusEl) statusEl.textContent = "Random obstacle field generated.";
        });
    }

    if (btnRecursive) {
        btnRecursive.addEventListener("click", () => {
            if (isRunning) return;
            walls.clear();
            clearPathHighlights();

            // Simple corridor/labyrinth wall generator
            for (let c = 4; c < COLS; c += 4) {
                const gapR = (c / 4) % 2 === 0 ? ROWS - 3 : 2;
                for (let r = 0; r < ROWS; r++) {
                    if (r !== gapR && r !== gapR + 1) {
                        if ((r !== startNode.r || c !== startNode.c) && (r !== endNode.r || c !== endNode.c)) {
                            walls.add(coordKey(r, c));
                        }
                    }
                }
            }
            renderGrid();
            if (statusEl) statusEl.textContent = "Corridor labyrinth generated.";
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
   5. NEURAL LOGIC GATE SIMULATOR
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
