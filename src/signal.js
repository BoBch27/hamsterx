let currentEffect = null;

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

export function createEffect(fn) {
    const effect = () => {
        currentEffect = effect;
        fn();
        currentEffect = null;
    };

    effect();
};