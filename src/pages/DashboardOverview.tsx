import { useMemo, useState } from 'react';
import { format, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { IconPlus, IconRepeat, IconPlayerPlay, IconShieldExclamation } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedSendungen } from '@/types/enriched';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';
import {
  CalendarWidget,
  useCalendar,
  type CalendarEvent,
  type CalendarTone,
} from '@/components/widgets/CalendarWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

type Filter = 'all' | 'rerun' | 'fsk';

const PREFIX = 'sendung';

function isStrict(s: EnrichedSendungen): boolean {
  const k = s.fields.altersfreigabe?.key;
  return k === 'ab_16' || k === 'ab_18';
}

function fskShort(s: EnrichedSendungen): string {
  const k = s.fields.altersfreigabe?.key;
  return k ? `FSK ${k.replace('ab_', '')}` : '';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { setSendungen, fetchAll } = data;
  const crud = useEntityCrud(data);
  const sendungen = crud.enriched.sendungen as EnrichedSendungen[];
  const clock = useClock();
  const cal = useCalendar({ initialView: 'day' });
  const [filter, setFilter] = useState<Filter>('all');

  const todayKey = format(clock, 'yyyy-MM-dd');
  const nowKey = format(clock, "yyyy-MM-dd'T'HH:mm");

  const todays = useMemo(
    () =>
      sendungen
        .filter(s => s.fields.beginn?.slice(0, 10) === todayKey)
        .sort((a, b) => (a.fields.beginn ?? '').localeCompare(b.fields.beginn ?? '')),
    [sendungen, todayKey],
  );
  const running = todays.filter(
    s => (s.fields.beginn ?? '') <= nowKey && (s.fields.ende ?? s.fields.beginn ?? '') > nowKey,
  );
  const upcoming = todays.filter(s => (s.fields.beginn ?? '') > nowKey);
  const reruns = todays.filter(s => s.fields.wiederholung);
  const strict = todays.filter(isStrict);

  const visible = useMemo(
    () =>
      sendungen.filter(s => {
        if (filter === 'rerun') return !!s.fields.wiederholung;
        if (filter === 'fsk') return isStrict(s);
        return true;
      }),
    [sendungen, filter],
  );

  const events = useMemo<CalendarEvent[]>(
    () =>
      visible
        .filter(s => !!s.fields.beginn)
        .map(s => {
          const tone: CalendarTone = s.fields.wiederholung ? 'warning' : isStrict(s) ? 'destructive' : 'primary';
          const sub = [s.senderName, s.fields.wiederholung ? '↻' : '', fskShort(s)].filter(Boolean).join(' · ');
          return {
            id: `${PREFIX}:${s.record_id}`,
            start: s.fields.beginn!,
            end: s.fields.ende,
            title: s.fields.titel ?? '—',
            subtitle: sub,
            tone,
          };
        }),
    [visible],
  );

  const chartRows = useMemo<ChartRow<EnrichedSendungen>[]>(
    () => sendungen.map(s => ({ id: `${PREFIX}:${s.record_id}`, data: s })),
    [sendungen],
  );

  const findRaw = (id: string) => data.sendungen.find(s => s.record_id === id);

  const reschedule = async (eventId: string, newStart: string, newEnd?: string) => {
    const rid = eventId.split(':')[1];
    const old = findRaw(rid ?? '');
    if (!rid || !old) return;
    const prev = { beginn: old.fields.beginn, ende: old.fields.ende };
    const next = { beginn: newStart, ...(newEnd ? { ende: newEnd } : {}) };
    setSendungen(list => list.map(s => (s.record_id === rid ? { ...s, fields: { ...s.fields, ...next } } : s)));
    try {
      await LivingAppsService.updateSendungenEntry(rid, next);
      undoToast(tx`Sendung verschoben`, async () => {
        setSendungen(list => list.map(s => (s.record_id === rid ? { ...s, fields: { ...s.fields, ...prev } } : s)));
        try {
          await LivingAppsService.updateSendungenEntry(rid, prev);
        } catch {
          await fetchAll();
        }
      });
    } catch {
      await fetchAll();
    }
  };

  const markRerun = async (s: EnrichedSendungen) => {
    const id = s.record_id;
    const was = !!s.fields.wiederholung;
    const set = (v: boolean) =>
      setSendungen(list => list.map(x => (x.record_id === id ? { ...x, fields: { ...x.fields, wiederholung: v } } : x)));
    set(!was);
    try {
      await LivingAppsService.updateSendungenEntry(id, { wiederholung: !was });
      undoToast(was ? tx`Wiederholung entfernt` : tx`Als Wiederholung gekennzeichnet`, async () => {
        set(was);
        try {
          await LivingAppsService.updateSendungenEntry(id, { wiederholung: was });
        } catch {
          await fetchAll();
        }
      });
    } catch {
      await fetchAll();
    }
  };

  const timeRange = (s: EnrichedSendungen) => {
    const b = s.fields.beginn ? parseISO(s.fields.beginn) : null;
    const e = s.fields.ende ? parseISO(s.fields.ende) : null;
    if (!b || !isValid(b)) return '';
    return e && isValid(e) ? `${format(b, 'HH:mm')}–${format(e, 'HH:mm')}` : format(b, 'HH:mm');
  };

  const context = (() => {
    if (todays.length === 0) {
      const next = sendungen
        .filter(s => (s.fields.beginn ?? '') > nowKey)
        .sort((a, b) => (a.fields.beginn ?? '').localeCompare(b.fields.beginn ?? ''))[0];
      return next
        ? tx`Heute ist nichts geplant — als Nächstes „${next.fields.titel ?? ''}“ am ${formatDate(next.fields.beginn)}.`
        : tx`Heute ist nichts geplant.`;
    }
    if (running.length > 0) {
      const names = namen(running.map(s => s.fields.titel ?? ''), 2);
      return upcoming[0]
        ? tx`Läuft gerade: ${names}. Danach um ${format(parseISO(upcoming[0].fields.beginn!), 'HH:mm')} „${upcoming[0].fields.titel ?? ''}“ auf ${upcoming[0].senderName}.`
        : tx`Läuft gerade: ${names}.`;
    }
    if (upcoming[0]) {
      return tx`Als Nächstes um ${format(parseISO(upcoming[0].fields.beginn!), 'HH:mm')}: „${upcoming[0].fields.titel ?? ''}“ auf ${upcoming[0].senderName}.`;
    }
    return tx`Heute sind alle ${todays.length} Sendungen gelaufen.`;
  })();

  const workItems = (running.concat(upcoming)).map(s => {
    const isRunning = running.includes(s);
    return {
      id: s.record_id,
      title: s.fields.titel ?? '—',
      secondLine: (
        <>
          <span className={isRunning ? 'font-medium text-emerald-600' : 'font-medium'}>
            {isRunning ? tx`Läuft` : timeRange(s)}
          </span>
          <span className="text-muted-foreground">
            {' · '}
            {s.senderName}
            {s.fields.wiederholung ? ` · ${tx('Wiederholung')}` : ''}
            {s.fields.altersfreigabe ? ` · ${fskShort(s)}` : ''}
          </span>
        </>
      ),
      action: s.fields.wiederholung
        ? undefined
        : { label: tx('Wiederholung'), onClick: () => void markRerun(s) },
    };
  });

  const longest = todays.reduce<EnrichedSendungen | null>((acc, s) => {
    const b = s.fields.beginn ? parseISO(s.fields.beginn) : null;
    const e = s.fields.ende ? parseISO(s.fields.ende) : null;
    if (!b || !e) return acc;
    const m = differenceInMinutes(e, b);
    const am = acc?.fields.beginn && acc.fields.ende ? differenceInMinutes(parseISO(acc.fields.ende), parseISO(acc.fields.beginn)) : -1;
    return m > am ? s : acc;
  }, null);
  void longest;

  const empty = sendungen.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {empty ? tx`Plane deine erste Sendung ein.` : context}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(clock, 'EEEE, d. MMMM yyyy', { locale: dateFnsLocale() })}
          </p>
        </div>
        {crud.sendungen.canWrite && (
          <Button onClick={() => crud.sendungen.openCreate({ beginn: format(clock, "yyyy-MM-dd'T'HH:00") })}>
            <IconPlus size={16} className="shrink-0" />
            <span>{tx('Sendung einplanen')}</span>
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="split"
        kpis={
          empty ? undefined : (
            <StatStrip>
              <StatStripItem
                title={tx('Läuft jetzt')}
                value={running.length}
                icon={<IconPlayerPlay size={18} className="text-muted-foreground" />}
                tone={running.length > 0 ? 'success' : 'default'}
              />
              <StatStripItem
                title={tx('Wiederholungen heute')}
                value={reruns.length}
                icon={<IconRepeat size={18} className="text-muted-foreground" />}
                tone={reruns.length > 0 ? 'warning' : 'default'}
                onClick={() => setFilter(f => (f === 'rerun' ? 'all' : 'rerun'))}
                active={filter === 'rerun'}
              />
              <StatStripItem
                title={tx('Ab 16 heute')}
                value={strict.length}
                icon={<IconShieldExclamation size={18} className="text-muted-foreground" />}
                tone={strict.length > 0 ? 'destructive' : 'default'}
                onClick={() => setFilter(f => (f === 'fsk' ? 'all' : 'fsk'))}
                active={filter === 'fsk'}
              />
            </StatStrip>
          )
        }
        primary={
          <CalendarWidget
            events={events}
            view={cal.view}
            referenceDate={cal.cursor}
            locale={dateFnsLocale()}
            onViewChange={cal.setView}
            onCursorChange={cal.setCursor}
            onEventClick={ev => {
              const rec = findRaw(ev.id.split(':')[1] ?? '');
              if (rec) crud.sendungen.openDetail(rec);
            }}
            onEventDrop={reschedule}
            onEmptyClick={date => {
              if (crud.sendungen.canWrite) {
                crud.sendungen.openCreate({ beginn: format(date, "yyyy-MM-dd'T'HH:mm") });
              }
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Heute nach Beginn')}
              items={workItems}
              max={6}
              onItemClick={id => {
                const rec = findRaw(id);
                if (rec) crud.sendungen.openDetail(rec);
              }}
              empty={{
                text: tx`Heute läuft nichts mehr.`,
                action: crud.sendungen.canWrite
                  ? { label: tx('Sendung einplanen'), onClick: () => crud.sendungen.openCreate({}) }
                  : undefined,
              }}
            />
            <ChartWidget<EnrichedSendungen>
              title={tx('Sendungen pro Genre')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.genre, label: tx('Genre') }}
            />
            <ChartWidget<EnrichedSendungen>
              title={tx('Sendungen pro Sender')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.senderName, label: appLabel('sender') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
