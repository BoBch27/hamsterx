import { createSignal, createEffect } from "./signal.js";

/**
 * Directive system
 * -------------------------------------
 * Using module-level closures (similar to signals).
 * Handles various "h-*" HTML attributes.
 * 
 * @module directives
 */

/**
 * Stores reactive contexts for each element with h-data. Automatically 
 * garbage collects when elements are removed from DOM.
 * @type {WeakMap}
 */
const contexts = new WeakMap();

/**
 * init
 * -----------
 * Scans the DOM and processes directives on a specific element and its children.
 * Called automatically on `DOMContentLoaded` with `document.body` (unless disabled).
 * 
 * Can also be called for dynamically added content:
 * ```js
 *   const div = document.createElement('div');
 *   div.setAttribute('h-data', '{ count: 0 }');
 *   document.body.appendChild(div);
 *   hamsterio.init(div);
 * 
 * ```
 * If calling on a previously initialised element, use `cleanup` beforehand:
 * ```js
 *   hamsterio.cleanup(document.body);
 *   hamsterio.init(document.body);
 * 
 * ```
 * @param {HTMLElement} el - Element to start scanning from (default: `document.body`)
 */
export function init(el = document.body) {
    if (el == null) {
        console.warn('🐹 [init] Called on a null/undefined element.');
        return;
    }

  	processElement(el);
};

/**
 * processElement
 * --------------
 * Recursively processes an element and all its children.
 * Order matters: h-data must be processed first to establish context.
 * 
 * @param {HTMLElement} el - Element to process
 */
function processElement(el) {
    // Skip text nodes, comments, etc - only process element nodes
    if (el.nodeType !== 1) return;

    // Process h-data first to establish "scope" for all other directives
    if (el.hasAttribute('h-data')) {
        initData(el);
    }

    // Get the reactive context (from this element or inherited from parent)
    const context = getContext(el);

    // Process all other directives on this element
    getDirectives(el).forEach(({ name, value }) => {
        // Split directive name to handle modifiers (e.g. "h-on:click" -> ["h-on", "click"])
        const [directive, modifier] = name.split(':');
        
        switch(directive) {
        case 'h-text':
            bindTextOrHTML(el, value, context);
            break;
        case 'h-html':
            bindTextOrHTML(el, value, context, true);
            break;
        case 'h-show':
            bindShow(el, value, context);
            break;
		case 'h-for':
            bindFor(el, value, context);
            return; // Don't process children, h-for handles it
        case 'h-on':
            bindEvent(el, modifier, value, context);
            break;
        case 'h-bind':
            bindAttribute(el, modifier, value, context);
            break;
        }
    });

    // Process h-init last (when element has initialised)
    if (el.hasAttribute('h-init')) {
        bindInit(el.getAttribute('h-init'), context);
    }

    // Process children recursively (unless h-for handled it)
    if (!el.hasAttribute('h-for')) {
   		Array.from(el.children).forEach(child => processElement(child));
	}
};

/**
 * getDirectives
 * -------------
 * Extracts all h-* attributes from an element.
 * 
 * @param {HTMLElement} el - Element to scan
 * @returns {Array} Array of {name, value} objects
 */
function getDirectives(el) {
    return Array.from(el.attributes)
        .filter(attr => attr.name.startsWith('h-'))
        .map(attr => ({ name: attr.name, value: attr.value }));
};

/**
 * getContext
 * ----------
 * Retrieves the reactive context for an element.
 * Walks up the DOM tree to find the nearest h-data parent if needed.
 * 
 * @param {HTMLElement} el - Element to get context for
 * @returns {Object|null} Context object or null if no h-data parent found
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
 * Processes h-data attribute and creates a reactive context.
 * Wraps each data property in a signal for automatic reactivity.
 * 
 * Example: `h-data="{ count: 0, name: 'John' }"`
 * 
 * @param {HTMLElement} el - Element with h-data attribute
 */
function initData(el) {
    const expr = el.getAttribute('h-data');
    let data = {};

    try {
        // Parse the JavaScript object expression (e.g. "{ count: 0 }" becomes an actual object)
        if (expr.trim()) {
            const fn = new Function(`return ${expr}`);
            data = fn();
        }
    } catch (e) {
        console.error('🐹 [h-data] Parse error: ', e);
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
        $el: el, // Alpine.js compatible alias
        cleanup: [], // Cleanup functions
    };

    // Store context in WeakMap for this element
    contexts.set(el, context);
};

/**
 * bindTextOrHTML
 * --------
 * Implements h-text or h-html directive for reactive text/HTML content.
 * Creates an effect that re-runs whenever dependencies change.
 * 
 * Examples: 
 * - `<span h-text="count"></span>`
 * - `<span h-html="'<strong>Hungry Hamster!</strong>'"></span>`
 * 
 * @param {HTMLElement} el - Element to bind text/HTML to
 * @param {string} expr - JavaScript expression to evaluate
 * @param {Object} context - Reactive context
 * @param {boolean} isHTML - Indicate whether to set `innerHTML` - if `false`, sets `textContent`
 */
function bindTextOrHTML(el, expr, context, isHTML = false) {
    if (!context) return;

    // Create an effect that automatically re-runs when signals change
    const dispose = createEffect(() => {
        try {
            // Evaluate the expression (e.g., "count" or "firstName + ' ' + lastName")
            const value = evaluateExpression(expr, context);

            // Check whether to update innerHTML or textContent
            if (isHTML) {
                // Update the HTML content (converts undefined/null to empty string)
                el.innerHTML = value ?? '';
                return;
            }

            // Update the text content (converts undefined/null to empty string)
            el.textContent = value ?? '';
        } catch (e) {
            console.error('🐹 [h-text] Error: ', e);
        }
    });

    // Track effect disposal
    context.cleanup.push(dispose);
};

/**
 * bindShow
 * --------
 * Implements h-show directive for conditional visibility.
 * Toggles display CSS property based on expression truthiness.
 * 
 * Example: `<div h-show="isVisible">Content</div>`
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
    const enterClass = el.getAttribute('h-transition-enter')?.split(' ').filter(c => c);
    const leaveClass = el.getAttribute('h-transition-leave')?.split(' ').filter(c => c);

    const dispose = createEffect(() => {
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
            console.error('🐹 [h-show] Error: ', e);
        }
    });

    // Track effect disposal
    context.cleanup.push(dispose);
};

/**
 * bindFor
 * -------
 * Implements h-for directive for list rendering.
 * Clones a template element for each item in an array.
 * 
 * Supports two syntaxes:
 * - Simple: `h-for="item in items"`
 * - With index: `h-for="(item, index) in items"`
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
		console.error('🐹 [h-for] Invalid syntax: ', expr);
		return;
	}

	// Extract variable names and array expression
	const itemName = match[3] || match[1]; // e.g. "item"
	const indexName = match[2] || 'index'; // e.g. "index" or "i"
	const itemsExpr = match[4]; // e.g. "items" or "todos"

    // Get the template content
    const isTemplate = el.tagName === 'TEMPLATE';
    const templateContent = isTemplate ? el.content : el;

	// Clone the template and remove h-for to prevent infinite loop (if not template tag)
	const template = templateContent.cloneNode(true);
    if (!isTemplate) {
        template.removeAttribute('h-for');
    }
	
	// Replace original element with a comment marker
	// This marker keeps track of where to insert rendered items
	const parent = el.parentElement;
	const marker = document.createComment('h-for');
	parent.replaceChild(marker, el);

	// Keep track of rendered nodes for cleanup
	let nodes = [];

	// Create effect that re-renders whenever array changes
	const dispose = createEffect(() => {
		try {
			// Evaluate the array expression
			const items = evaluateExpression(itemsExpr, context);
			
			// Clean up previous render
			nodes.forEach(n => {
                cleanup(n);
                n.remove();
            });
			nodes = [];

			// Ensure we have an array
			if (!Array.isArray(items)) return;

			// Render each item
			items.forEach((item, idx) => {
				// Clone the template for this item
				const clone = template.cloneNode(true);

                // Get actual elements to process
                const elements = isTemplate 
                    ? Array.from(clone.children) 
                    : [clone];

                elements.forEach(element => {
                    // Create a new scoped context with loop variables
                    // This adds "item" and "index" to the parent context
                    const scopedData = {
                        ...context.data,
                        [itemName]: item, // e.g. item = "Apple"
                        [indexName]: idx // e.g. index = 0
                    };

                    const scopedContext = {
                        data: scopedData,
                        el: element,
                        $el: element
                    };

                    // Store scoped context for this cloned element
                    contexts.set(element, scopedContext);
                    
                    // Process directives on the cloned element
                    processElement(element);
                    
                    // Insert before the marker comment
                    parent.insertBefore(element, marker);
                    
                    // Track for cleanup on next render
                    nodes.push(element);
                });
			});
		} catch (e) {
			console.error('🐹 [h-for] Error: ', e);
		}
	});

    // Track effect disposal
    context.cleanup.push(dispose);
};

/**
 * bindEvent
 * ---------
 * Implements h-on directive for event handling.
 * Attaches event listeners that can access reactive data.
 * Supports await for async event handlers.
 * 
 * Examples: 
 * - `<button h-on:click="count++">Increment</button>`  
 * - `<form h-on:submit="await handleSubmit($event)">Submit</form>`
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
            console.error(`🐹 [h-on:${eventName}] Error: `, err);
        });
    };

    // Attach the event listener
    el.addEventListener(eventName, handler);

    // Add cleanup to context
    context.cleanup.push(() => {
        el.removeEventListener(eventName, handler);
    });
};

/**
 * bindAttribute
 * -------------
 * Implements h-bind directive for reactive attribute binding.
 * Supports special handling for class and style attributes.
 * 
 * Examples:
 * - `<div h-bind:class="active ? 'bg-blue' : 'bg-gray'"></div>`
 * - `<div h-bind:class="{ 'active': isActive, 'disabled': isDisabled }"></div>`
 * - `<img h-bind:src="imageUrl" h-bind:alt="description">`
 * - `<button h-bind:disabled="isLoading">Submit</button>`
 * - `<div h-bind:style="{ color: textColor, fontSize: size + 'px' }"></div>`
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
    const dispose = createEffect(() => {
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
            console.error(`🐹 [h-bind:${attrName}] Error: `, e);
        }
    });

    // Track effect disposal
    context.cleanup.push(dispose);
};

/**
 * bindClass
 * ---------
 * Special handler for class attribute binding.
 * Supports object syntax for conditional classes.
 * 
 * Example: `h-bind:class="{ 'active': isActive, 'disabled': !isEnabled }"`
 * 
 * For simple string classes, just use the class attribute normally.
 * For ternaries, use the expression directly: `h-bind:class="active ? 'bg-blue' : 'bg-gray'"`
 * 
 * @param {HTMLElement} el - Element to bind classes to
 * @param {string} expr - JavaScript expression
 * @param {Object} context - Reactive context
 */
function bindClass(el, expr, context) {
    // Store original classes from HTML
    const originalClasses = el.className.split(' ').filter(c => c);
    
    const dispose = createEffect(() => {
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
            console.error('🐹 [h-bind:class] Error: ', e);
        }
    });

    // Track effect disposal
    context.cleanup.push(dispose);
};

/**
 * bindStyle
 * ---------
 * Special handler for style attribute binding.
 * Supports object syntax: `h-bind:style="{ color: textColor, fontSize: size + 'px' }"`
 * 
 * @param {HTMLElement} el - Element to bind styles to
 * @param {string} expr - JavaScript expression (should evaluate to object)
 * @param {Object} context - Reactive context
 */
function bindStyle(el, expr, context) {
    // Store original inline styles
    const originalStyle = el.getAttribute('style') || '';
    
    const dispose = createEffect(() => {
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
            console.error('🐹 [h-bind:style] Error: ', e);
        }
    });

    // Track effect disposal
    context.cleanup.push(dispose);
};

/**
 * bindInit
 * --------
 * Implements h-init directive for initialisation code.
 * Runs once when the element is first processed.
 * Supports await for async operations.
 * 
 * Example: `<div h-init="data = await (await fetch('/api')).json()">`
 * 
 * @param {string} stmt - JavaScript statement to execute
 * @param {Object} context - Reactive context
 */
function bindInit(stmt, context) {
    if (!context) return;

    executeStatement(stmt, context).catch(err => {
        console.error('🐹 [h-init] Error: ', err);
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
        console.error('🐹 [evaluateExpression] Error: ', expr, e);
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
 * @param {Event} [event] - Optional event object (for h-on)
 * @returns {Promise} Promise that resolves when execution completes
 */
function executeStatement(code, context, event = null) {
    try {
        // Create an async function to support await
        // Include $event for h-on compatibility
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
 * @param {HTMLElement} el - Element with h-data attribute
 * @returns {Object|null} Reactive data proxy or null
 */
export function getData(el) {
    if (el == null) {
        console.warn('🐹 [getData] Called on a null/undefined element.');
        return null;
    }

    const context = contexts.get(el);
    
    if (!context) {
        console.warn(`🐹 [getData] No h-data found on element: ${el}. May need to wait for hamsterio to initialise.`);
        return null;
    }
    
    return context.data;
};

/**
 * cleanup
 * --------------
 * Cleans up all reactive effects and event listeners for an element.
 * Removes the element's context and all tracked cleanup functions.
 * 
 * Call this before removing dynamically created elements to prevent memory leaks.
 * h-for automatically calls this for its rendered items.
 * 
 * Example:
 * ```js
 *   const el = document.querySelector('[h-data]');
 *   hamsterio.cleanup(el);  // Cleanup effects and listeners
 *   el.remove();  // Remove from DOM
 * 
 * ```
 * @param {HTMLElement} el - Element to cleanup
 */
export function cleanup(el) {
    if (el == null) {
        console.warn('🐹 [cleanup] Called on a null/undefined element.');
        return;
    }

    const context = contexts.get(el);
    if (!context) return;
    
    // Run all cleanup functions
    context.cleanup.forEach(fn => fn());
    
    // Remove context (and cleanup array) from WeakMap
    contexts.delete(el);

    // Also cleanup any nested h-data children
    el.querySelectorAll('[h-data]').forEach(child => {
        cleanup(child);
    });
};