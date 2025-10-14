import { createSignal } from "./signal.js";

// store reactive contexts for each element with x-data
const contexts = new WeakMap();

// prevent multiple initialisations
let initialised = false;

// scan DOM and process all directives
export function init(root = document.body) {
    if (initialised) return;

    processElement(root);
    initialised = true;
};

// process element and its children
function processElement(el) {
    // only process element nodes
    if (el.nodeType !== 1) return;

    // process x-data first
    if (el.hasAttribute('x-data')) {
        initData(el);
    }

    // process children recursively
    Array.from(el.children).forEach(child => processElement(child));
};

// process x-data attribute and create reactive context
function initData(el) {
    const expr = el.getAttribute('x-data');
    let data = {};

    try {
        // parse JS object expression (e.g. "{ count: 0 }" becomes an actual object)
        if (expr.trim()) {
            const fn = new Function(`return ${expr}`);
            data = fn();
        }
    } catch (e) {
        console.error('[x-data] Parse error:', e);
        return;
    }

    // create signals for each property
    const signals = {};

    Object.keys(data).forEach(key => {
        const [get, set] = createSignal(data[key]);

        // store signal for potential cleanup later
        signals[key] = { get, set };
    });

    // create the context object
    const context = {
        signals, // raw signals
        el, // the element itself
        $el: el // Alpine.js compatible alias
    };

    // store context in WeakMap for this element
    contexts.set(el, context);
};