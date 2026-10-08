import type { Sender, Sendungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface SenderDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Sender;
  /** 1:N „Sendungen" (sender): VOLLE Liste — der Block filtert auf diesen Record. */
  sendungenList: Sendungen[];
  /** Zeilen-Klick → overlay.push auf das Sendungen-Detail (nie der Edit-Dialog). */
  onOpenSendungen: (record: Sendungen) => void;
  /** Kontextuelles „+": öffnet den Sendungen-Dialog mit diesem Record vorgesetzt. */
  onAddSendungen?: () => void;
}

export function SenderDetails({
  record,
  sendungenList,
  onOpenSendungen,
  onAddSendungen,
}: SenderDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('sender', 'sendername')} value={record.fields.sendername} format="text" />
        <RecordField label={fieldLabel('sender', 'kanalnummer')} value={record.fields.kanalnummer} format="text" />
        <RecordField label={fieldLabel('sender', 'senderkategorie')} value={record.fields.senderkategorie} format="pill" />
        <RecordField label={fieldLabel('sender', 'website')} value={record.fields.website} format="url" />
        <RecordField label={fieldLabel('sender', 'logo')} className="md:col-span-2">
          {record.fields.logo ? (
            <MediaThumbnail src={record.fields.logo as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <SatelliteSection
        title={appLabel('sendungen')}
        items={sendungenList.filter(r => extractRecordId(r.fields.sender) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('sendungen'), meta: r.fields.beginn })}
        onOpen={onOpenSendungen}
        onAdd={onAddSendungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SENDER} recordId={record.record_id} readOnly={!perms.canWrite('sender')} />
    </>
  );
}
