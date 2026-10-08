import type { EnrichedSendungen } from '@/types/enriched';
import type { Sender, Sendungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface SendungenMaps {
  senderMap: Map<string, Sender>;
}

export function enrichSendungen(
  sendungen: Sendungen[],
  maps: SendungenMaps
): EnrichedSendungen[] {
  return sendungen.map(r => ({
    ...r,
    senderName: resolveDisplay(r.fields.sender, maps.senderMap, 'sendername'),
  }));
}
