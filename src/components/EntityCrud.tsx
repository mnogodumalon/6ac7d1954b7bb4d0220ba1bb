/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'sender'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.sender.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.sender.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.sender.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.sender              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   sender: sendername, kanalnummer, senderkategorie, website, logo  ·  ← sendungen (list + contextual +)
 *   sendungen: titel, sender, beginn, ende, genre, beschreibung, altersfreigabe, wiederholung, …  ·  → sender
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Sender, Sendungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichSendungen } from '@/lib/enrich';
import type { EnrichedSendungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { SenderDialog, type SenderDialogDefaults } from '@/components/dialogs/SenderDialog';
import { SenderDetails } from '@/components/details/SenderDetails';
import { SendungenDialog, type SendungenDialogDefaults } from '@/components/dialogs/SendungenDialog';
import { SendungenDetails } from '@/components/details/SendungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'sender'; record: Sender }
  | { type: 'sendungen'; record: EnrichedSendungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  sender: EntityCrudApi<Sender, SenderDialogDefaults>;
  sendungen: EntityCrudApi<Sendungen, SendungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { sender: Sender[]; sendungen: EnrichedSendungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [senderDialog, setSenderDialog] = useState<{ defaults?: SenderDialogDefaults; editing?: Sender } | null>(null);
  const [sendungenDialog, setSendungenDialog] = useState<{ defaults?: SendungenDialogDefaults; editing?: Sendungen } | null>(null);
  const enrichedSendungen = useMemo(() => enrichSendungen(data.sendungen, { senderMap: data.senderMap }), [data.sendungen, data.senderMap]);

  function detailSender(record: Sender, push = false) {
    const item: OverlayItem = { type: 'sender', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitSender(fields: Sender['fields']) {
    const editing = senderDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setSender(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateSenderEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('sender')} — ${t('crud_updated')}`, async () => {
        data.setSender(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateSenderEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createSenderEntry(fields);
      undoToast(`${appLabel('sender')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailSendungen(record: Sendungen, push = false) {
    const rec = enrichedSendungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'sendungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitSendungen(fields: Sendungen['fields']) {
    const editing = sendungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setSendungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateSendungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('sendungen')} — ${t('crud_updated')}`, async () => {
        data.setSendungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateSendungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createSendungenEntry(fields);
      undoToast(`${appLabel('sendungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <SenderDialog
        open={senderDialog !== null}
        onClose={() => setSenderDialog(null)}
        onSubmit={submitSender}
        defaultValues={senderDialog?.defaults}
        recordId={senderDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Sender']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Sender']}
      />
      <SendungenDialog
        open={sendungenDialog !== null}
        onClose={() => setSendungenDialog(null)}
        onSubmit={submitSendungen}
        defaultValues={sendungenDialog?.defaults}
        recordId={sendungenDialog?.editing?.record_id}
        senderList={data.sender}
        enablePhotoScan={AI_PHOTO_SCAN['Sendungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Sendungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'sender') {
            return (
              <>
                <RecordHeader title={top.record.fields.sendername ?? appLabel('sender')} subtitle={undefined} />
                <SenderDetails
                  record={top.record}
                  sendungenList={data.sendungen}
                  onOpenSendungen={(r) => detailSendungen(r, true)}
                  onAddSendungen={perms.canWrite('sendungen') ? () => setSendungenDialog({ defaults: { sender: createRecordUrl(APP_IDS.SENDER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'sendungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('sendungen')} subtitle={top.record.fields.beginn ? formatDate(top.record.fields.beginn) : undefined} />
                <SendungenDetails
                  record={top.record}
                  senderList={data.sender}
                  onOpenSender={(r) => detailSender(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'sender') return perms.canWrite('sender');
          if (top.type === 'sendungen') return perms.canWrite('sendungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'sender') setSenderDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'sendungen') setSendungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    sender: {
      openCreate: (defaults?: SenderDialogDefaults) => (perms.canWrite('sender') ? setSenderDialog({ defaults }) : refuse()),
      openEdit: (record: Sender) => (perms.canWrite('sender') ? setSenderDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Sender) => detailSender(record, false),
      canWrite: perms.canWrite('sender'),
    },
    sendungen: {
      openCreate: (defaults?: SendungenDialogDefaults) => (perms.canWrite('sendungen') ? setSendungenDialog({ defaults }) : refuse()),
      openEdit: (record: Sendungen) => (perms.canWrite('sendungen') ? setSendungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Sendungen) => detailSendungen(record, false),
      canWrite: perms.canWrite('sendungen'),
    },
    enriched: { sender: data.sender, sendungen: enrichedSendungen },
  };
}
