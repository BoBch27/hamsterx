// Reactive signal and effect system
let currentEffect = null;
const effectStack = [];

/**
 * createSignal
 * ------------
 * Creates a reactive value (signal). Returns [getter, setter].
 *
 * Reading the signal inside a createEffect will auto-subscribe the effect.
 */
export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const getter = () => {
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
 */
export function createEffect(fn) {
    const effect = () => {
        // Push to stack (handles nested effects)
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

    effect();
};