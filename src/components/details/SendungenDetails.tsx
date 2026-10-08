import type { Sendungen, Sender } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface SendungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Sendungen;
  /** N:1-Ziel „Sender": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  senderList: Sender[];
  /** Klick auf die Sender-Relation → overlay.push auf dessen Detail. */
  onOpenSender?: (record: Sender) => void;
}

export function SendungenDetails({
  record,
  senderList,
  onOpenSender,
}: SendungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const senderTarget = senderList.find(r => r.record_id === extractRecordId(record.fields.sender));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('sendungen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('sendungen', 'beginn')} value={record.fields.beginn} format="datetime" />
        <RecordField label={fieldLabel('sendungen', 'ende')} value={record.fields.ende} format="datetime" />
        <RecordField label={fieldLabel('sendungen', 'genre')} value={record.fields.genre} format="pill" />
        <RecordField label={fieldLabel('sendungen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('sendungen', 'altersfreigabe')} value={record.fields.altersfreigabe} format="pill" />
        <RecordField label={fieldLabel('sendungen', 'wiederholung')} value={record.fields.wiederholung} format="bool" />
        <RecordField label={fieldLabel('sendungen', 'hinweise')} value={record.fields.hinweise} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('sendungen', 'sender')}
          name={senderTarget?.fields.sendername ?? '—'}
          meta={undefined}
          onClick={senderTarget && onOpenSender ? () => onOpenSender!(senderTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SENDUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('sendungen')} />
    </>
  );
}
