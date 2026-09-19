/**
 * Math Combination Lock - Dual Input (Physical Keyboard + Onscreen Keypad)
 */

// --- Configuration & Per-Level Constraints ---
const LOCK_LEVELS = [
    {
        level: 1,
        title: "Level 1: Exponents, Parentheses & Negatives",
        target: 24,
        validateConstraints: (expr) => {
            const hasExponent = /\^|\*\*/.test(expr);
            const hasParentheses = /\(.*\)/.test(expr);
            const hasNegativeInt = /-\d+/.test(expr);
            
            return {
                passed: hasExponent && hasParentheses && hasNegativeInt
            };
        }
    },
    {
        level: 2,
        title: "Level 2: Even Exponents & Absolute Values",
        target: -8,
        validateConstraints: (expr) => {
            const negBaseWithParens = /\(-[0-9.]+\)\^\d+/.test(expr);
            const negBaseNoParens = /(^|[^(\d])-([0-9.]+)\^\d+/.test(expr);

            const exponentMatches = expr.match(/\^(\d+)/g) || [];
            const hasExponents = exponentMatches.length > 0;
            const allEvenExponents = hasExponents && exponentMatches.every(e => parseInt(e.replace('^', ''), 10) % 2 === 0);

            const hasAbsValue = /\|[^|]+\||Math\.abs\(.+\)/.test(expr);
            const openParensCount = (expr.match(/\(/g) || []).length;
            const hasExtraParens = openParensCount >= 2;

            return {
                passed: negBaseWithParens && negBaseNoParens && allEvenExponents && hasAbsValue && hasExtraParens
            };
        }
    },
    {
        level: 3,
        title: "Level 3: Complex Fractional Expressions",
        target: 16,
        validateConstraints: (expr) => {
            const isFraction = /\(.*\)\/\(.*\)/.test(expr);
            const negBaseExpRegex = /(-?\([0-9.-]+\)|-[0-9.]+)\^(\d+)/g;
            const matches = [...expr.matchAll(negBaseExpRegex)];
            
            const has3NegBases = matches.length >= 3;
            let evenExpCount = 0;
            let oddExpCount = 0;
            let withParensCount = 0;

            matches.forEach(m => {
                const baseStr = m[1];
                const expVal = parseInt(m[2], 10);
                if (expVal % 2 === 0) evenExpCount++;
                else oddExpCount++;

                if (baseStr.startsWith('(') && baseStr.endsWith(')')) {
                    withParensCount++;
                }
            });

            const correctExponents = evenExpCount >= 2 && oddExpCount >= 1;
            const correctParens = withParensCount >= 2;

            const fractionParts = expr.split('/');
            let multiOpsTop = false;
            let multiOpsBottom = false;

            if (fractionParts.length >= 2) {
                const topOps = (fractionParts[0].match(/[+\-*^]/g) || []).length;
                const bottomOps = (fractionParts[1].match(/[+\-*^]/g) || []).length;
                multiOpsTop = topOps >= 2;
                multiOpsBottom = bottomOps >= 2;
            }

            return {
                passed: isFraction && has3NegBases && correctExponents && correctParens && multiOpsTop && multiOpsBottom
            };
        }
    }
];

// --- State Management ---
let activeInputIndex = 0;
let inputsUnlockedStatus = [false, false, false];

// --- DOM Elements ---
const dom = {
    inputs: [
        document.getElementById('input-0'),
        document.getElementById('input-1'),
        document.getElementById('input-2')
    ],
    inputLocks: [
        document.getElementById('status-lock-0'),
        document.getElementById('status-lock-1'),
        document.getElementById('status-lock-2')
    ],
    mainLock: document.getElementById('lock-graphic'),
    valMatchStatus: document.getElementById('val-match'),
    keypad: document.getElementById('keypad')
};

// --- Initialization ---
function init() {
    setupInputs();
    setupKeypadListeners();
    setupPhysicalKeyboardListeners();
    updateUIState();
}

// --- Safe Evaluator supporting Absolute Value |x| ---
function safeEvalArithmetic(expr) {
    let cleanExpr = expr.replace(/\|([^|]+)\|/g, 'Math.abs($1)');
    cleanExpr = cleanExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/ /g, '');
    cleanExpr = cleanExpr.replace(/\^/g, '**');

    return Function(`"use strict"; return (${cleanExpr})`)();
}

// --- Validation Routine ---
function validateActiveInput() {
    const expr = dom.inputs[activeInputIndex].value;
    const lockConfig = LOCK_LEVELS[activeInputIndex];
    let isCorrect = false;

    try {
        if (!expr) return;

        const calculatedValue = safeEvalArithmetic(expr);
        const constraintCheck = lockConfig.validateConstraints(expr);

        if (Math.abs(calculatedValue - lockConfig.target) < 1e-6 && constraintCheck.passed) {
            isCorrect = true;
        }
    } catch (e) {
        isCorrect = false;
    }

    inputsUnlockedStatus[activeInputIndex] = isCorrect;
    updateUIState();
}

// --- UI Rendering ---
function updateUIState() {
    dom.inputs.forEach((input, index) => {
        if (index === activeInputIndex) {
            input.style.borderColor = '#3498db';
            input.style.backgroundColor = '#fbfdff';
            input.removeAttribute('readonly'); // Allow physical keyboard typing
        } else {
            input.style.borderColor = '#ddd';
            input.style.backgroundColor = '#fff';
            input.setAttribute('readonly', 'true');
        }
    });

    let allSolved = true;
    inputsUnlockedStatus.forEach((unlocked, index) => {
        dom.inputLocks[index].textContent = unlocked ? '🔓' : '🔒';
        dom.inputLocks[index].className = unlocked ? 'input-lock-status unlocked' : 'input-lock-status';
        if (!unlocked) allSolved = false;
    });

    if (allSolved) {
        dom.valMatchStatus.textContent = '✔ All Lock Levels Unlocked!';
        dom.valMatchStatus.className = 'status-rect passed';
        dom.mainLock.textContent = '🔓';
    } else {
        dom.valMatchStatus.textContent = '🔒 Solution Incomplete';
        dom.valMatchStatus.className = 'status-rect failed';
        dom.mainLock.textContent = '🔒';
    }
}

// --- Inputs Event Setup ---
function setupInputs() {
    dom.inputs.forEach((input, index) => {
        input.addEventListener('click', () => {
            activeInputIndex = index;
            updateUIState();
        });

        // Live validation while typing physically
        input.addEventListener('input', () => {
            validateActiveInput();
        });
    });
}

// --- Onscreen Keypad Event Setup ---
function setupKeypadListeners() {
    dom.keypad.addEventListener('click', (e) => {
        let key = e.target.closest('.key');
        if (!key) return;

        const activeInput = dom.inputs[activeInputIndex];
        const keyAttr = key.getAttribute('data-key');

        if (key.id === 'key-clear') {
            activeInput.value = '';
        } else if (key.id === 'key-del') {
            activeInput.value = activeInput.value.slice(0, -1);
        } else if (key.id === 'key-enter') {
            validateActiveInput();
            if (inputsUnlockedStatus[activeInputIndex] && activeInputIndex < 2) {
                activeInputIndex++;
                updateUIState();
                dom.inputs[activeInputIndex].focus();
            }
        } else if (keyAttr === '/') {
            // Inserts fraction template: ()/()
            activeInput.value += '()/()';
        } else if (keyAttr) {
            activeInput.value += keyAttr;
        } else {
            activeInput.value += key.textContent.trim();
        }

        validateActiveInput();
    });
}

// --- Physical Keyboard Listeners ---
function setupPhysicalKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            validateActiveInput();
            if (inputsUnlockedStatus[activeInputIndex] && activeInputIndex < 2) {
                activeInputIndex++;
                updateUIState();
                dom.inputs[activeInputIndex].focus();
            }
        }
    });
}

init();