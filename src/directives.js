import { createSignal, createEffect } from "./signal.js";

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

    // get reactive context (from this element or inherited from parent)
    const context = getContext(el);

    // process all other directives on this element
    getDirectives(el).forEach((directive) => {
        if (directive.name.split(':')[0] == 'x-text') {
            bindText(el, directive.value, context);
        }
    });

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

// implement x-text directive for reactive text content
function bindText(el, expr, context) {
    if (!context) return;
  
    // create effect that automatically re-runs when signals change
    createEffect(() => {
        try {
            // evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
            const value = evaluate(expr, context);

            // update the text content (converts undefined/null to empty string)
            el.textContent = value ?? '';
        } catch (e) {
            console.error('[x-text] Error:', e);
        }
    });
};

// evaluate JS expression in the context of reactive data
function evaluate(expr, context) {
    try {
        // create func that evaluates the expression
        // the 'with' statement allows "count" instead of "$data.count"
        const fn = new Function('$data', '$el', `
            with($data) {
                return ${expr};
            }
        `);
        
        // execute and return result
        return fn(context.data, context.el);
    } catch (e) {
        console.error('[evaluate] Error:', expr, e);
        return null;
    }
};