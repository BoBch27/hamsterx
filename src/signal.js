export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const getter = () => {
        return value;
    };

    const setter = (newValue) => {
        value = newValue;
        subscribers.forEach(fn => fn());
    };

    return [getter, setter];
};