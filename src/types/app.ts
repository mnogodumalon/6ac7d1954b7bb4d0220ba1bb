import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Sender {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    sendername?: string;
    kanalnummer?: number;
    senderkategorie?: LookupValue;
    website?: string;
    logo?: string;
  };
}

export interface Sendungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    sender?: RecordUrl; // applookup -> URL zu 'Sender' Record
    beginn?: string; // Format: YYYY-MM-DD oder ISO String
    ende?: string; // Format: YYYY-MM-DD oder ISO String
    genre?: LookupValue;
    beschreibung?: string;
    altersfreigabe?: LookupValue;
    wiederholung?: boolean;
    hinweise?: string;
  };
}

export const APP_IDS = {
  SENDER: '6ac7d1819cf8ddc45ffbe857',
  SENDUNGEN: '6ac7d1857425f5e66ea8c3c7',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'sender': {
    senderkategorie: [{ key: "oeffentlich_rechtlich", get label() { return lookupLabel('sender', 'senderkategorie', "oeffentlich_rechtlich") ?? "Öffentlich-rechtlich"; } }, { key: "privat", get label() { return lookupLabel('sender', 'senderkategorie', "privat") ?? "Privat"; } }, { key: "nachrichten", get label() { return lookupLabel('sender', 'senderkategorie', "nachrichten") ?? "Nachrichten"; } }, { key: "sport", get label() { return lookupLabel('sender', 'senderkategorie', "sport") ?? "Sport"; } }, { key: "spartenkanal", get label() { return lookupLabel('sender', 'senderkategorie', "spartenkanal") ?? "Spartenkanal"; } }],
  },
  'sendungen': {
    genre: [{ key: "spielfilm", get label() { return lookupLabel('sendungen', 'genre', "spielfilm") ?? "Spielfilm"; } }, { key: "serie", get label() { return lookupLabel('sendungen', 'genre', "serie") ?? "Serie"; } }, { key: "nachrichten", get label() { return lookupLabel('sendungen', 'genre', "nachrichten") ?? "Nachrichten"; } }, { key: "dokumentation", get label() { return lookupLabel('sendungen', 'genre', "dokumentation") ?? "Dokumentation"; } }, { key: "sport", get label() { return lookupLabel('sendungen', 'genre', "sport") ?? "Sport"; } }, { key: "show", get label() { return lookupLabel('sendungen', 'genre', "show") ?? "Show"; } }, { key: "kinder", get label() { return lookupLabel('sendungen', 'genre', "kinder") ?? "Kinder"; } }, { key: "unterhaltung", get label() { return lookupLabel('sendungen', 'genre', "unterhaltung") ?? "Unterhaltung"; } }],
    altersfreigabe: [{ key: "ab_0", get label() { return lookupLabel('sendungen', 'altersfreigabe', "ab_0") ?? "Ab 0 Jahren"; } }, { key: "ab_6", get label() { return lookupLabel('sendungen', 'altersfreigabe', "ab_6") ?? "Ab 6 Jahren"; } }, { key: "ab_12", get label() { return lookupLabel('sendungen', 'altersfreigabe', "ab_12") ?? "Ab 12 Jahren"; } }, { key: "ab_16", get label() { return lookupLabel('sendungen', 'altersfreigabe', "ab_16") ?? "Ab 16 Jahren"; } }, { key: "ab_18", get label() { return lookupLabel('sendungen', 'altersfreigabe', "ab_18") ?? "Ab 18 Jahren"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'sender': {
    'sendername': 'string/text',
    'kanalnummer': 'number',
    'senderkategorie': 'lookup/select',
    'website': 'string/url',
    'logo': 'file',
  },
  'sendungen': {
    'titel': 'string/text',
    'sender': 'applookup/select',
    'beginn': 'date/datetimeminute',
    'ende': 'date/datetimeminute',
    'genre': 'lookup/select',
    'beschreibung': 'string/textarea',
    'altersfreigabe': 'lookup/select',
    'wiederholung': 'bool',
    'hinweise': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSender = StripLookup<Sender['fields']>;
export type CreateSendungen = StripLookup<Sendungen['fields']>;