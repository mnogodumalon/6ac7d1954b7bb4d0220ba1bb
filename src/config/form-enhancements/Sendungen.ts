// Auto-generated. Per-entity form-enhancements config for "Sendungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", "sender", {"row": ["beginn", "ende"]}, {"row": ["genre", "altersfreigabe"], "cols": "1fr 1fr"}, "wiederholung", "beschreibung", "hinweise"],
  defaults: {
    'beginn': { kind: 'today', withTime: true },
    'wiederholung': { kind: 'literal', value: false },
  },
  computed: {
    '_sendung_dauer_stunden': { kind: 'dateDiff', from: 'beginn', to: 'ende', unit: 'hours' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
