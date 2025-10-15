import * as signals from "./signal.js";
import * as directives from "./directives.js";

const api = { ...signals, ...directives };

// expose globally, so users can use functions in inline scripts (e.g. createSignal, etc.)
window.hamsterx = api;

// export default, so users can import whole package (e.g. import hamsterx from 'hamsterx')
export default api;

// export individual functions, so users can import only what's needed 
// (e.g. import { createSignal } from 'hamsterx')
export * from "./signal.js";
export * from "./directives.js";

// Check if auto-init should be disabled
// User can set window.hamsterxAutoInit = false before script loads
const shouldAutoInit = typeof window !== 'undefined' && window.hamsterxAutoInit !== false;

// Auto-init directives when DOM ready (only for browser global usage)
if (typeof document !== 'undefined' && shouldAutoInit) {
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