import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/locales/en';
import { hr } from '../src/i18n/locales/hr';

// i18next plural suffixes differ per language (en: one/other; hr: one/few/other),
// so compare the BASE keys with the suffix stripped.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function baseKeys(node: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) {
      const base = k.replace(PLURAL_SUFFIX, '');
      const path = prefix ? `${prefix}.${base}` : base;
      for (const key of baseKeys(v, path)) out.add(key);
    }
  } else {
    // string or array leaf (arrays: tableTalk, fillers)
    out.add(prefix);
  }
  return out;
}

describe('i18n key parity', () => {
  it('hr exposes exactly the same base keys as en', () => {
    const enKeys = baseKeys(en);
    const hrKeys = baseKeys(hr);
    const missingInHr = [...enKeys].filter((k) => !hrKeys.has(k)).sort();
    const extraInHr = [...hrKeys].filter((k) => !enKeys.has(k)).sort();
    expect({ missingInHr, extraInHr }).toEqual({ missingInHr: [], extraInHr: [] });
  });
});
