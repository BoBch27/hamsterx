import { createSignal, createEffect } from "./signal.js";

/**
 * Directive system
 * -------------------------------------
 * Using module-level closures (similar to signals).
 * Handles various "x-*" HTML attributes.
 * 
 * @module directives
 */

/**
 * Stores reactive contexts for each element with x-data. Automatically 
 * garbage collects when elements are removed from DOM.
 * @type {WeakMap}
 */
const contexts = new WeakMap();

/**
 * Flag to prevent multiple initialisations.
 * @type {boolean}
 */
let initialised = false;

/**
 * init
 * ----
 * Main entry point - scans the DOM and processes all directives.
 * Called automatically on DOMContentLoaded (unless disabled).
 * Can only be called once for global initialisation.
 * 
 * For dynamically added elements, use initElement() instead.
 * 
 * @param {HTMLElement} root - Element to start scanning from (default: document.body)
 */
export function init(root = document.body) {
    if (initialised) {
		console.warn('[🐹 init] Already initialised. Use initElement() for new elements.');
		return;
	}

    processElement(root);
    initialised = true;
};

/**
 * initElement
 * -----------
 * Process directives on a specific element and its children.
 * Use this for dynamically added content after initial page load.
 * 
 * Example:
 * ```js
 *   const div = document.createElement('div');
 *   div.setAttribute('x-data', '{ count: 0 }');
 *   document.body.appendChild(div);
 *   Hamsterjs.initElement(div);
 * 
 * ```
 * @param {HTMLElement} el - Element to process
 */
export function initElement(el) {
  	processElement(el);
};

/**
 * processElement
 * --------------
 * Recursively processes an element and all its children.
 * Order matters: x-data must be processed first to establish context.
 * 
 * @param {HTMLElement} el - Element to process
 */
function processElement(el) {
    // Skip text nodes, comments, etc - only process element nodes
    if (el.nodeType !== 1) return;

    // Process x-data first to establish "scope" for all other directives
    if (el.hasAttribute('x-data')) {
        initData(el);
    }

    // Get the reactive context (from this element or inherited from parent)
    const context = getContext(el);

    // Process all other directives on this element
    getDirectives(el).forEach(({ name, value }) => {
        // Split directive name to handle modifiers (e.g. "x-on:click" -> ["x-on", "click"])
        const [directive, modifier] = name.split(':');
        
        switch(directive) {
        case 'x-text':
            bindText(el, value, context);
            break;
        case 'x-show':
            bindShow(el, value, context);
            break;
		case 'x-for':
            bindFor(el, value, context);
            return; // Don't process children, x-for handles it
        case 'x-on':
            bindEvent(el, modifier, value, context);
            break;
        }
    });

    // Process children recursively (unless x-for handled it)
    if (!el.hasAttribute('x-for')) {
   		Array.from(el.children).forEach(child => processElement(child));
	}
};

/**
 * getDirectives
 * -------------
 * Extracts all x-* attributes from an element.
 * 
 * @param {HTMLElement} el - Element to scan
 * @returns {Array} Array of {name, value} objects
 */
function getDirectives(el) {
    return Array.from(el.attributes)
        .filter(attr => attr.name.startsWith('x-'))
        .map(attr => ({ name: attr.name, value: attr.value }));
};

/**
 * getContext
 * ----------
 * Retrieves the reactive context for an element.
 * Walks up the DOM tree to find the nearest x-data parent if needed.
 * 
 * @param {HTMLElement} el - Element to get context for
 * @returns {Object|null} Context object or null if no x-data parent found
 */
function getContext(el) {
    // Check if this element has its own context
    if (contexts.has(el)) return contexts.get(el);
    
     // Otherwise, inherit from parent
    let parent = el.parentElement;
    while (parent) {
        if (contexts.has(parent)) return contexts.get(parent);
        parent = parent.parentElement;
    }

    // No context found
    return null;
};

/**
 * initData
 * --------
 * Processes x-data attribute and creates a reactive context.
 * Wraps each data property in a signal for automatic reactivity.
 * 
 * Example: `x-data="{ count: 0, name: 'John' }"`
 * 
 * @param {HTMLElement} el - Element with x-data attribute
 */
function initData(el) {
    const expr = el.getAttribute('x-data');
    let data = {};

    try {
        // Parse the JavaScript object expression (e.g. "{ count: 0 }" becomes an actual object)
        if (expr.trim()) {
            const fn = new Function(`return ${expr}`);
            data = fn();
        }
    } catch (e) {
        console.error('[x-data] Parse error:', e);
        return;
    }

    // Create signals for each property to every property automatically reactive
    const signals = {};
    const proxy = {};

    Object.keys(data).forEach(key => {
        const [get, set] = createSignal(data[key]);

        // Store signal for potential cleanup later
        signals[key] = { get, set };

        // Create proxy property that reads/writes to the signal
        // context.data.count++ actually calls set(get() + 1)
        Object.defineProperty(proxy, key, {
            get() { return get(); },
            set(val) { set(val); },
            enumerable: true
        });
    });

    // Create the context object that gets passed to all directives
    const context = {
        data: proxy, // Reactive data proxy
        signals, // Raw signals (for advanced use)
        el, // The element itself
        $el: el // Alpine.js compatible alias
    };

    // Store context in WeakMap for this element
    contexts.set(el, context);
};

/**
 * bindText
 * --------
 * Implements x-text directive for reactive text content.
 * Creates an effect that re-runs whenever dependencies change.
 * 
 * Example: `<span x-text="count"></span>`
 * 
 * @param {HTMLElement} el - Element to bind text to
 * @param {string} expr - JavaScript expression to evaluate
 * @param {Object} context - Reactive context
 */
function bindText(el, expr, context) {
    if (!context) return;
  
     // Create an effect that automatically re-runs when signals change
    createEffect(() => {
        try {
            // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
            const value = evaluate(expr, context);

            // Update the text content (converts undefined/null to empty string)
            el.textContent = value ?? '';
        } catch (e) {
            console.error('[x-text] Error:', e);
        }
    });
};

/**
 * bindShow
 * --------
 * Implements x-show directive for conditional visibility.
 * Toggles display CSS property based on expression truthiness.
 * 
 * Example: `<div x-show="isVisible">Content</div>`
 * 
 * @param {HTMLElement} el - Element to show/hide
 * @param {string} expr - JavaScript expression to evaluate
 * @param {Object} context - Reactive context
 */
function bindShow(el, expr, context) {
    if (!context) return;
    
    // Store original display value to restore when showing (i.e. flex/grid, etc)
    const originalDisplay = el.style.display;

    createEffect(() => {
        try {
            // Evaluate expression as boolean
            const show = evaluate(expr, context);

            // Show: restore original display, Hide: set to none
            el.style.display = show ? (originalDisplay || '') : 'none';
        } catch (e) {
            console.error('[x-show] Error:', e);
        }
    });
};

/**
 * bindFor
 * -------
 * Implements x-for directive for list rendering.
 * Clones a template element for each item in an array.
 * 
 * Supports two syntaxes:
 * - Simple: `x-for="item in items"`
 * - With index: `x-for="(item, index) in items"`
 * 
 * @param {HTMLElement} el - Template element to repeat
 * @param {string} expr - Loop expression
 * @param {Object} context - Reactive context
 */
function bindFor(el, expr, context) {
	if (!context) return;

	// Parse the expression using regex
	// Matches: "item in items" or "(item, index) in items"
	const match = expr.match(/^\s*(?:\(([^,]+),\s*([^)]+)\)|([^)\s]+))\s+in\s+(.+)$/);
	if (!match) {
		console.error('[x-for] Invalid syntax:', expr);
		return;
	}

	// Extract variable names and array expression
	const itemName = match[3] || match[1]; // e.g. "item"
	const indexName = match[2] || 'index'; // e.g. "index" or "i"
	const itemsExpr = match[4]; // e.g. "items" or "todos"

	// Clone the template and remove x-for to prevent infinite loop
	const template = el.cloneNode(true);
	template.removeAttribute('x-for');
	
	// Replace original element with a comment marker
	// This marker keeps track of where to insert rendered items
	const parent = el.parentElement;
	const marker = document.createComment('x-for');
	parent.replaceChild(marker, el);

	// Keep track of rendered nodes for cleanup
	let nodes = [];

	// Create effect that re-renders whenever array changes
	createEffect(() => {
		try {
			// Evaluate the array expression
			const items = evaluate(itemsExpr, context);
			
			// Clean up previous render
			nodes.forEach(n => n.remove());
			nodes = [];

			// Ensure we have an array
			if (!Array.isArray(items)) return;

			// Render each item
			items.forEach((item, idx) => {
				// Clone the template for this item
				const clone = template.cloneNode(true);
				
				// Create a new scoped context with loop variables
				// This adds "item" and "index" to the parent context
				const scopedData = {
					...context.data,
					[itemName]: item, // e.g. item = "Apple"
					[indexName]: idx // e.g. index = 0
				};

				const scopedContext = {
					data: scopedData,
					el: clone,
					$el: clone
				};

				// Store scoped context for this cloned element
				contexts.set(clone, scopedContext);
				
				// Process directives on the cloned element
				processElement(clone);
				
				// Insert before the marker comment
				parent.insertBefore(clone, marker);
				
				// Track for cleanup on next render
				nodes.push(clone);
			});
		} catch (e) {
			console.error('[x-for] Error:', e);
		}
	});
};

/**
 * bindEvent
 * ---------
 * Implements x-on directive for event handling.
 * Attaches event listeners that can access reactive data.
 * 
 * Example: `<button x-on:click="count++">Increment</button>`
 * 
 * @param {HTMLElement} el - Element to attach listener to
 * @param {string} eventName - Event name (e.g., "click", "input")
 * @param {string} expr - JavaScript code to execute
 * @param {Object} context - Reactive context
 */
function bindEvent(el, eventName, expr, context) {
    if (!context || !eventName) return;

    // Create event handler function
    const handler = (e) => {
        try {
            // Create a function with access to:
            // - $event: the native event object
            // - $el: the element itself
            // - $data: the reactive data (via 'with' statement)
            const fn = new Function('$event', '$el', '$data', `
                with($data) {
                    ${expr}
                }
            `);
        
            // Execute the handler with proper context
            fn.call(context.data, e, el, context.data);
        } catch (err) {
            console.error(`[x-on:${eventName}] Error:`, err);
        }
    };

    // Attach the event listener
    el.addEventListener(eventName, handler);
};

/**
 * evaluate
 * --------
 * Evaluates a JavaScript expression in the context of reactive data.
 * Expression has access to all data properties directly (via 'with' statement).
 * 
 * Example: `evaluate("count + 1", context)` where count is in context.data
 * 
 * @param {string} expr - JavaScript expression
 * @param {Object} context - Reactive context
 * @returns {*} Result of expression evaluation
 */
function evaluate(expr, context) {
    try {
        // Create a function that evaluates the expression
        // The 'with' statement allows: "count" instead of "$data.count"
        const fn = new Function('$data', '$el', `
            with($data) {
                return ${expr};
            }
        `);
        
        // Execute and return result
        return fn(context.data, context.el);
    } catch (e) {
        console.error('[evaluate] Error:', expr, e);
        return null;
    }
};