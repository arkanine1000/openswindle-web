// Initialise i18n (synchronous with inline resources) so locale-aware helpers
// like spokenBid resolve to real strings under the node test env. No detector
// signal in node → falls back to English.
import '../src/i18n';
