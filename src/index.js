import * as signals from "./signal.js";
import * as directives from "./directives.js";

const api = { ...signals, ...directives };

// expose globally, so users can use functions in inline scripts (e.g. createSignal, etc.)
window.Hamsterjs = api;

// export default, so users can import whole package (e.g. import Hamsterjs from 'hamster.js')
export default api;

// export individual functions, so users can import only what's needed 
// (e.g. import { createSignal } from 'hamster.js')
export * from "./signal.js";
export * from "./directives.js";