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

// extract all x-* attributes from an element
function getDirectives(el) {
    return Array.from(el.attributes)
        .filter(attr => attr.name.startsWith('x-'))
        .map(attr => ({ name: attr.name, value: attr.value }));
};

// retrieve reactive context for an element
function getContext(el) {
    // check if element has its own context
    if (contexts.has(el)) return contexts.get(el);
    
    // otherwise inherit from parent
    let parent = el.parentElement;
    while (parent) {
        if (contexts.has(parent)) return contexts.get(parent);
        parent = parent.parentElement;
    }

    // no context found
    return null;
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
    const proxy = {};

    Object.keys(data).forEach(key => {
        const [get, set] = createSignal(data[key]);

        // store signal for potential cleanup later
        signals[key] = { get, set };

        // create proxy property that reads/writes to the signal
        // context.data.count++ actually calls set(get() + 1)
        Object.defineProperty(proxy, key, {
            get() { return get(); },
            set(val) { set(val); },
            enumerable: true
        });
    });

    // create the context object
    const context = {
        data: proxy, // Reactive data proxy
        signals, // raw signals
        el, // the element itself
        $el: el // Alpine.js compatible alias
    };

    // store context in WeakMap for this element
    contexts.set(el, context);
};