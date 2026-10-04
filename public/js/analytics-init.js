/**
 * Vercel Web Analytics & Speed Insights - init queues
 * https://vercel.com/docs/analytics/quickstart - HTML framework
 * Harus dimuat seawal mungkin di <head> sebelum event tracking
 */
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
window.vaq = window.vaq || [];
window.siq = window.siq || [];
// Flags observability - placeholder, akan diisi oleh config.js / flags.js
window.DENJI_FLAGS = window.DENJI_FLAGS || {};
window.DENJI_FLAG_DEFINITIONS = window.DENJI_FLAG_DEFINITIONS || {};
