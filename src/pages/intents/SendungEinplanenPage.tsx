/**
 * Sendung einplanen — 5-Schritt-Wizard.
 * Steps: 1) Sender wählen → 2) Titel, Beginn und Ende → 3) Genre, Altersfreigabe, Wiederholung
 *        → 4) Beschreibung und Hinweise → 5) Überschneidung prüfen & speichern.
 * Reads: sender (Auswahl), sendungen (Belegung pro Sender). Writes: sendungen (via useSendungEinplanenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldLookup, useOccupancy } from '@/lib/journey';
import { useSendungEinplanenFlow } from '@/lib/journey/flows/SendungEinplanen';
import { tx } from '@/i18n';

export default function SendungEinplanenPage() {
  const [step, setStep] = useState(1);
  const flow = useSendungEinplanenFlow({
    steps: { sender: 1, titel: 2, beginn: 2, ende: 2, genre: 3, altersfreigabe: 3, wiederholung: 3, beschreibung: 4, hinweise: 4 },
    items: {
      sender: r => {
        const nr = fieldNumber(r, 'kanalnummer');
        return {
          id: r.id,
          title: fieldText(r, 'sendername'),
          subtitle: [nr != null ? tx`Kanal ${nr}` : '', fieldLookup(r, 'senderkategorie')?.label ?? ''].filter(Boolean).join(' · '),
        };
      },
    },
  });
  const f = flow.forms.sendungen;

  const senderId = (f.get('sender') as string) || null;
  const beginn = (f.get('beginn') as string) || null;
  const ende = (f.get('ende') as string) || null;
  const belegung = useOccupancy(flow.port, 'sendungen', { resource: senderId });

  const endeVorBeginn = Boolean(beginn && ende && ende < beginn);
  const ueberschneidung = Boolean(beginn && ende && !endeVorBeginn && belegung.ruled && !belegung.isFree(beginn, ende, senderId));

  const timeProblem = (): string | true => {
    if (endeVorBeginn) return tx('Das Ende muss nach dem Beginn liegen.');
    if (ueberschneidung) return tx('Auf diesem Sender läuft zu dieser Zeit bereits eine andere Sendung.');
    return true;
  };

  const senderName = senderId ? flow.picks.sender.labelOf(senderId) : undefined;

  return (
    <IntentWizardShell
      title={tx('Sendung einplanen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Plane eine Sendung auf einem Sender ein und prüfe, dass sich nichts überschneidet.'),
        needs: [tx('Sender'), tx('Titel der Sendung'), tx('Beginn und Ende')],
      }}
    >
      <WizardStep label={tx('Sender')} description={tx('Auf welchem Sender läuft die Sendung?')}>
        <EntitySelectStep
          {...flow.picks.sender.select}
          {...flow.pick('sender')}
          searchPlaceholder={tx('Sendername suchen …')}
          onSelect={id => { flow.pick('sender').onSelect(id); setStep(2); }}
        />
      </WizardStep>

      <WizardStep label={tx('Zeitpunkt')} description={tx('Gib den Titel sowie Beginn und Ende der Sendung an.')} needs={['sender']}>
        <div className="space-y-4">
          {senderName && (
            <p className="text-sm text-muted-foreground">{tx`Sender: ${senderName}`}</p>
          )}
          <Bound form={f} name="titel" />
          <Bound form={f} name="beginn" />
          <Bound form={f} name="ende" />
          {endeVorBeginn && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <IconAlertTriangle size={16} className="shrink-0" />
              {tx('Das Ende muss nach dem Beginn liegen.')}
            </p>
          )}
          {ueberschneidung && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <IconAlertTriangle size={16} className="shrink-0" />
              {tx('Auf diesem Sender läuft zu dieser Zeit bereits eine andere Sendung.')}
            </p>
          )}
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => (f.validate(['titel', 'beginn', 'ende']) ? timeProblem() : false)}
            nextStepLabel={tx('Genre')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Einordnung')} description={tx('Wähle Genre und Altersfreigabe und gib an, ob es eine Wiederholung ist.')}>
        <div className="space-y-4">
          <Bound form={f} name="genre" allowClear />
          <Bound form={f} name="altersfreigabe" allowClear />
          <Bound form={f} name="wiederholung" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Beschreibung')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Beschreibung')} description={tx('Ergänze, was Zuschauer und Kollegen wissen sollten.')}>
        <div className="space-y-4">
          <Bound form={f} name="beschreibung" rows={4} />
          <Bound form={f} name="hinweise" rows={3} />
          <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')} needs={['sender', 'titel', 'beginn']}>
        {!flow.submit.done && (
          <div className="space-y-4">
            {ueberschneidung || endeVorBeginn ? (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>
                  {endeVorBeginn
                    ? tx('Das Ende muss nach dem Beginn liegen.')
                    : tx('Auf diesem Sender läuft zu dieser Zeit bereits eine andere Sendung.')}{' '}
                  {tx('Gehe zurück und passe die Zeiten an.')}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-sm">
                <IconCircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{tx('Keine Überschneidung auf diesem Sender.')}</span>
              </div>
            )}
            {ueberschneidung || endeVorBeginn ? (
              <StepNav onBack={() => setStep(2)} nextDisabled hideBack={false} nextLabel={tx('Zeiten anpassen')} />
            ) : (
              <SummaryStep
                forms={flow.formList}
                submit={flow.submit}
                whatHappensNext={tx('Die Sendung erscheint sofort im Programm des Senders.')}
              />
            )}
          </div>
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Weitere Sendung einplanen'), href: '#/intents/sendung-einplanen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
