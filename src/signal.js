/**
 * Core reactive signal and effect system
 * ---------------------------------------
 * Simple, functional, reactive primitives based on signals.
 * Effects automatically track signal dependencies and re-run when they change.
 * 
 * @module signals
 */

/**
 * Current effect being executed (for automatic dependency tracking)
 * @type {Function|null}
 */
let currentEffect = null;

/**
 * Stack of effects (handles nested effects properly)
 * @type {Array<Function>}
 */
const effectStack = [];

/**
 * createSignal
 * ------------
 * Creates a reactive value (signal). Returns [getter, setter].
 * 
 * Reading the signal inside a createEffect will automatically subscribe
 * the effect to changes. When the signal updates, all subscribed effects re-run.
 * 
 * Example:
 * ```js
 *   const [count, setCount] = createSignal(0);
 *   createEffect(() => console.log(count())); // logs: 0
 *   setCount(5); // logs: 5`
 * 
 * ```
 * @param {*} initialValue - The initial value for the signal
 * @returns {Array} Tuple of [getter, setter] functions
 */
export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const getter = () => {
        // If called within an effect, auto-subscribe
        if (currentEffect) subscribers.add(currentEffect);
        return value;
    };

    const setter = (newValue) => {
        // Prevent unnecessary updates if value hasn't changed
        if (Object.is(value, newValue)) return;
        
        value = newValue;
        
        // Run effects after updating value to prevent infinite loops
        const subs = Array.from(subscribers);
        subscribers.clear(); // Clear before running to prevent re-subscription during update
        
        subs.forEach(fn => {
            subscribers.add(fn); // Re-add after clearing
            fn();
        });
    };

    return [getter, setter];
};

/**
 * createEffect
 * ------------
 * Runs a reactive function immediately, and re-runs whenever
 * any signal used inside it changes.
 * 
 * The effect automatically tracks which signals it depends on by
 * monitoring signal reads during execution. When any dependency changes,
 * the effect re-runs.
 * 
 * Supports nested effects properly using an effect stack to preserve context.
 * 
 * Example:
 * ```js
 *   const [count, setCount] = createSignal(0);
 *   createEffect(() => {
 *     console.log('Count is:', count());
 *   });
 *   setCount(1); // Effect re-runs, logs: "Count is: 1"
 * 
 * ```
 * @param {Function} fn - The reactive function to execute
 */
export function createEffect(fn) {
    const effect = () => {
        // Save current effect and push to stack (handles nested effects)
        currentEffect = effect;
        effectStack.push(effect);
        
        try {
            fn();
        } finally {
            // Restore previous effect context
            effectStack.pop();
            currentEffect = effectStack[effectStack.length - 1] || null;
        }
    };

    // Run immediately to establish initial dependencies
    effect();
};