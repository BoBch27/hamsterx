import * as signals from "./signal.js";
import * as directives from "./directives.js";

// hamsterx is browser-only
if (typeof window === 'undefined') {
    throw new Error(
        '🐹 hamsterx requires a browser environment. Your hamster needs a wheel to run on! ' +
        'If using SSR (Next.js, Nuxt, etc), make sure hamsterx only runs on the client.'
    );
}

const api = { ...signals, ...directives };

// expose globally, so users can use functions in inline scripts (e.g. createSignal, etc.)
window.hamsterx = api;

// export default, so users can import whole package (e.g. import hamsterx from 'hamsterx')
export default api;

// export individual functions, so users can import only what's needed 
// (e.g. import { createSignal } from 'hamsterx')
export * from "./signal.js";
export * from "./directives.js";

// Auto-init (can be disabled with window.hamsterxAutoInit = false)
if (window.hamsterxAutoInit !== false) {
    const autoInit = () => {
        if (document.body) {
            directives.init();
            document.dispatchEvent(new CustomEvent('hamsterx:ready'));
            console.log('🐹 hamsterx auto-initialised');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        // DOM already ready, init immediately
        autoInit();
    }
}