// Reactive signal and effect system
let currentEffect = null;

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
        value = newValue;
        subscribers.forEach(fn => fn());
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
        currentEffect = effect;
        fn();
        currentEffect = null;
    };

    effect();
};