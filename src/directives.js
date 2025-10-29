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
		console.warn('🐹 [init] hamsterx already initialised. Use initElement() for new elements.');
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
 *   hamsterx.initElement(div);
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
        case 'x-bind':
            bindAttribute(el, modifier, value, context);
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
        console.error('🐹 [x-data] Parse error: ', e);
        return;
    }

    // Create signals for each property to every property automatically reactive
    const signals = {};
    const proxy = {};

    for (const [key, value] of Object.entries(data)) {
        // Check if value is function
        if (typeof value === 'function') {
            // Store function as is binding to context
            proxy[key] = value.bind(proxy);

            // Store method metadata, not bound function
            signals[key] = { type: 'function', fn: value };

            // Skip signal creation for methods
            continue;
        }

        const [get, set] = createSignal(value);

        // Store signal for potential cleanup later
        signals[key] = { get, set };

        // Create proxy property that reads/writes to the signal
        // context.data.count++ actually calls set(get() + 1)
        Object.defineProperty(proxy, key, {
            get() { return get(); },
            set(val) { set(val); },
            enumerable: true
        });
    }

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
            const value = evaluateExpression(expr, context);

            // Update the text content (converts undefined/null to empty string)
            el.textContent = value ?? '';
        } catch (e) {
            console.error('🐹 [x-text] Error: ', e);
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
    let originalDisplay = getComputedStyle(el).display;    
    let isCurrentlyVisible = originalDisplay !== 'none';

    // If already hidden, set to empty string to let CSS decide
    if (originalDisplay === 'none') {
        originalDisplay = '';
    }

    // Store transition classes (if present)
    const enterClass = el.getAttribute('x-transition-enter')?.split(' ').filter(c => c);
    const leaveClass = el.getAttribute('x-transition-leave')?.split(' ').filter(c => c);

    createEffect(() => {
        try {
            // Evaluate expression as boolean
            const show = evaluateExpression(expr, context);

            // Showing
            if (show) {
                // Has transition
                if (enterClass) {
                    el.style.display = originalDisplay || '';
                    isCurrentlyVisible = true;
                
                    requestAnimationFrame(() => {
                        if (leaveClass) {
                            el.classList.remove(...leaveClass);
                        }

                        el.classList.add(...enterClass);
                    });
                // No transition
                } else {
                    el.style.display = originalDisplay || '';
                    isCurrentlyVisible = true;
                }
            // Hiding
            } else {
                // Has transition
                if (leaveClass) {
                    if (enterClass) {
                        el.classList.remove(...enterClass);
                    }

                    el.classList.add(...leaveClass);
                    
                    const onTransitionEnd = () => {
                        el.style.display = 'none';
                        isCurrentlyVisible = false;
                        el.removeEventListener('transitionend', onTransitionEnd);
                        el.removeEventListener('animationend', onTransitionEnd);
                    };
                    
                    if (isCurrentlyVisible) {
                        el.addEventListener('transitionend', onTransitionEnd);
                        el.addEventListener('animationend', onTransitionEnd);
                    }
                // No transition
                } else {
                    el.style.display = 'none';
                    isCurrentlyVisible = false;
                }
            }
        } catch (e) {
            console.error('🐹 [x-show] Error: ', e);
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
		console.error('🐹 [x-for] Invalid syntax: ', expr);
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
			const items = evaluateExpression(itemsExpr, context);
			
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
			console.error('🐹 [x-for] Error: ', e);
		}
	});
};

/**
 * bindEvent
 * ---------
 * Implements x-on directive for event handling.
 * Attaches event listeners that can access reactive data.
 * Supports await for async event handlers.
 * 
 * Example: `<button x-on:click="count++">Increment</button>`
 * Example: `<form x-on:submit="await handleSubmit($event)">Submit</form>`
 * 
 * @param {HTMLElement} el - Element to attach listener to
 * @param {string} eventName - Event name (e.g., "click", "input")
 * @param {string} stmt - JavaScript statement to execute
 * @param {Object} context - Reactive context
 */
function bindEvent(el, eventName, stmt, context) {
    if (!context || !eventName) return;

    // Create event handler function with access to:
    // - $event: the native event object
    // - $el: the element itself
    // - $data: the reactive data (via 'with' statement)
    const handler = (e) => {
        executeStatement(stmt, context, e).catch(err => {
            console.error(`🐹 [x-on:${eventName}] Error: `, err);
        });
    };

    // Attach the event listener
    el.addEventListener(eventName, handler);
};

/**
 * bindAttribute
 * -------------
 * Implements x-bind directive for reactive attribute binding.
 * Supports special handling for class and style attributes.
 * 
 * Examples:
 * - `<div x-bind:class="active ? 'bg-blue' : 'bg-gray'"></div>`
 * - `<div x-bind:class="{ 'active': isActive, 'disabled': isDisabled }"></div>`
 * - `<img x-bind:src="imageUrl" x-bind:alt="description">`
 * - `<button x-bind:disabled="isLoading">Submit</button>`
 * - `<div x-bind:style="{ color: textColor, fontSize: size + 'px' }"></div>`
 * 
 * @param {HTMLElement} el - Element to bind attribute to
 * @param {string} attrName - Attribute name (e.g., "class", "src", "disabled")
 * @param {string} expr - JavaScript expression to evaluate
 * @param {Object} context - Reactive context
 */
function bindAttribute(el, attrName, expr, context) {
    if (!context || !attrName) return;

    // Special handling for 'class' attribute
    if (attrName === 'class') {
        bindClass(el, expr, context);
        return;
    }

    // Special handling for 'style' attribute
    if (attrName === 'style') {
        bindStyle(el, expr, context);
        return;
    }

    // General attribute binding
    createEffect(() => {
        try {
            const value = evaluateExpression(expr, context);
            
            // Handle boolean attributes (disabled, checked, readonly, etc.)
            if (typeof value === 'boolean') {
                if (value) {
                    el.setAttribute(attrName, '');
                } else {
                    el.removeAttribute(attrName);
                }
            }
            // Handle null/undefined - remove attribute
            else if (value == null) {
                el.removeAttribute(attrName);
            }
            // Normal attribute value
            else {
                el.setAttribute(attrName, value);
            }
        } catch (e) {
            console.error(`🐹 [x-bind:${attrName}] Error: `, e);
        }
    });
};

/**
 * bindClass
 * ---------
 * Special handler for class attribute binding.
 * Supports object syntax for conditional classes.
 * 
 * Example: `x-bind:class="{ 'active': isActive, 'disabled': !isEnabled }"`
 * 
 * For simple string classes, just use the class attribute normally.
 * For ternaries, use the expression directly: `x-bind:class="active ? 'bg-blue' : 'bg-gray'"`
 * 
 * @param {HTMLElement} el - Element to bind classes to
 * @param {string} expr - JavaScript expression
 * @param {Object} context - Reactive context
 */
function bindClass(el, expr, context) {
    // Store original classes from HTML
    const originalClasses = el.className.split(' ').filter(c => c);
    
    createEffect(() => {
        try {
            const value = evaluateExpression(expr, context);
            
            // Start with original classes
            const classes = new Set(originalClasses);
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Object: { 'active': isActive, 'disabled': isDisabled }
                for (const [cls, condition] of Object.entries(value)) {
                    if (condition) {
                        classes.add(cls);
                    }
                }
            } else if (typeof value === 'string') {
                // String (from ternary or direct expression): "bg-blue text-white"
                value.split(' ').filter(c => c).forEach(c => classes.add(c));
            }
            
            // Apply the final class list
            el.className = Array.from(classes).join(' ');
        } catch (e) {
            console.error('🐹 [x-bind:class] Error: ', e);
        }
    });
};

/**
 * bindStyle
 * ---------
 * Special handler for style attribute binding.
 * Supports object syntax: `x-bind:style="{ color: textColor, fontSize: size + 'px' }"`
 * 
 * @param {HTMLElement} el - Element to bind styles to
 * @param {string} expr - JavaScript expression (should evaluate to object)
 * @param {Object} context - Reactive context
 */
function bindStyle(el, expr, context) {
    // Store original inline styles
    const originalStyle = el.getAttribute('style') || '';
    
    createEffect(() => {
        try {
            const value = evaluateExpression(expr, context);
            
            // Restore original styles first
            el.setAttribute('style', originalStyle);
            
            if (typeof value === 'string') {
                // String: "color: red; font-size: 14px"
                el.style.cssText = originalStyle + '; ' + value;
            }
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Object: { color: 'red', fontSize: '14px' }
                for (const [prop, val] of Object.entries(value)) {
                    if (val != null) {
                        // Convert camelCase to kebab-case (fontSize -> font-size)
                        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                        el.style.setProperty(cssProp, String(val));
                    }
                };
            }
        } catch (e) {
            console.error('🐹 [x-bind:style] Error: ', e);
        }
    });
};

/**
 * evaluateExpression
 * --------
 * Evaluates a JavaScript expression in the context of reactive data.
 * Expression has access to all data properties directly (via 'with' statement).
 * 
 * Example: `evaluateExpression("count + 1", context)` where count is in context.data
 * 
 * @param {string} expr - JavaScript expression
 * @param {Object} context - Reactive context
 * @returns {*} Result of expression evaluation
 */
function evaluateExpression(expr, context) {
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
        console.error('🐹 [evaluate] Error: ', expr, e);
        return null;
    }
};

/**
 * executeStatement
 * ----------------
 * Executes a JavaScript statement in the context of reactive data.
 * Supports both sync and async code (await).
 * 
 * @param {string} code - JavaScript statement
 * @param {Object} context - Reactive context
 * @param {Event} [event] - Optional event object (for x-on)
 * @returns {Promise} Promise that resolves when execution completes
 */
function executeStatement(code, context, event = null) {
    try {
        // Create an async function to support await
        // Include $event for x-on compatibility
        const fn = new Function('$event', '$el', '$data', `
            return (async () => {
                with($data) {
                    ${code}
                }
            })();
        `);
        
        // Execute and return promise for error handling
        return fn.call(context.data, event, context.el, context.data);
    } catch (err) {
        console.error('🐹 [executeStatement] Error: ', err);
        return Promise.reject(err);
    }
};

/**
 * getData
 * -------
 * Gets the reactive data for a given element.
 * Allows programmatic updates from outside.
 * 
 * @param {HTMLElement} el - Element with x-data attribute
 * @returns {Object|null} Reactive data proxy or null
 */
export function getData(el) {
    if (!initialised) {
        console.warn('🐹 [getData] hamsterx not initialised yet. Call after DOMContentLoaded or init().');
        return null;
    }
    
    const context = contexts.get(el);
    
    if (!context) {
        console.warn('🐹 [getData] No x-data found on element: ', el);
    }
    
    return context ? context.data : null;
};