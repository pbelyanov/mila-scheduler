import { useEffect, useMemo, useState } from 'react';
import type { AppState, DayEvent } from '../types';
import { t } from '../i18n';
import { formatDuration, nowMin, toHHMM } from '../timeutil';
import {
  addCatnap,
  connectCurrentNap,
  generateEvents,
  recalibrate,
  totalActualDaySleepMin,
  totalPlannedDaySleepMin
} from '../schedule';
import { EventCard } from './EventCard';
import { WakeTimePrompt } from './WakeTimePrompt';

type Props = {
  state: AppState;
  onChange: (next: AppState) => void;
  onOpenSettings: () => void;
};

export function TodayView({ state, onChange, onOpenSettings }: Props) {
  const [now, setNow] = useState<number>(nowMin());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMin()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const setWake = (min: number) => {
    const events = generateEvents(min, state.template);
    const wakeEvent = events.find((e) => e.kind === 'wake');
    if (wakeEvent) {
      wakeEvent.actualMin = min;
      wakeEvent.done = true;
    }
    onChange({ ...state, day: { ...state.day, wakeMin: min, events } });
  };

  const updateEvents = (events: DayEvent[]) => {
    onChange({ ...state, day: { ...state.day, events } });
  };

  const markDone = (id: string, actualMin: number) => {
    const events = state.day.events.map((e) =>
      e.id === id ? { ...e, actualMin, done: true } : e
    );
    const recal = recalibrate({ ...state.day, events }, state.template);
    updateEvents(recal);
  };

  const editActual = (id: string, actualMin: number) => {
    const events = state.day.events.map((e) => (e.id === id ? { ...e, actualMin } : e));
    const recal = recalibrate({ ...state.day, events }, state.template);
    updateEvents(recal);
  };

  const doConnect = () => {
    const events = connectCurrentNap(state.day, state.template);
    updateEvents(events);
  };

  const doAddCatnap = () => {
    const events = addCatnap(state.day, state.template);
    updateEvents(events);
  };

  const currentEventId = useMemo(() => {
    const pending = state.day.events.filter((e) => !e.done);
    if (pending.length === 0) return null;
    const activeNapStart = [...state.day.events]
      .reverse()
      .find((e) => e.kind === 'nap-start' && e.done);
    if (activeNapStart) {
      const activeNapEnd = pending.find(
        (e) => e.kind === 'nap-end' && e.napIndex === activeNapStart.napIndex
      );
      if (activeNapEnd) return activeNapEnd.id;
    }
    return pending[0].id;
  }, [state.day.events]);

  const plannedSleep = totalPlannedDaySleepMin(state.day.events);
  const actualSleep = totalActualDaySleepMin(state.day.events);

  const allNapsDone =
    state.day.events.some((e) => e.kind === 'nap-start') &&
    state.day.events.filter((e) => e.kind === 'nap-start').every((e) => e.done) &&
    state.day.events.filter((e) => e.kind === 'nap-end').every((e) => e.done);
  const ritual = state.day.events.find((e) => e.kind === 'ritual');
  const ritualIsFar = ritual && ritual.plannedMin - now > 120;

  if (state.day.wakeMin === null) {
    return (
      <div className="px-4 pb-16">
        <Header onOpenSettings={onOpenSettings} now={now} showDate />
        <WakeTimePrompt onSet={setWake} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24">
      <Header onOpenSettings={onOpenSettings} now={now} />

      <section className="mt-4 rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t.wakeTimeLabel}
            </div>
            <div className="text-2xl font-bold text-pink-700">{toHHMM(state.day.wakeMin)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t.plannedBedtime}
            </div>
            <div className="text-2xl font-bold text-indigo-700">
              {toHHMM(state.template.bedtimeMin)}
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-pink-100 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t.totalSleep}</span>
            <span className="font-semibold text-gray-800">
              {formatDuration(actualSleep)} / {formatDuration(plannedSleep)}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-3">
        {state.day.events.map((e) => {
          const isCurrent = e.id === currentEventId;
          const activeNap =
            isCurrent && e.kind === 'nap-end';
          const canConnectThis =
            activeNap && state.day.events.some((x) => x.kind === 'nap-start' && !x.done);
          return (
            <EventCard
              key={e.id}
              event={e}
              state={
                e.done
                  ? 'past'
                  : activeNap
                    ? 'active-nap'
                    : isCurrent
                      ? 'current'
                      : 'upcoming'
              }
              canConnect={!!canConnectThis}
              nowMinutes={now}
              onAction={(a) => {
                if (a.kind === 'mark-done') markDone(e.id, a.actualMin);
                else if (a.kind === 'edit-actual') editActual(e.id, a.actualMin);
                else if (a.kind === 'connect') doConnect();
              }}
            />
          );
        })}
      </section>

      {allNapsDone && ritualIsFar && (
        <div className="mt-4">
          <button
            onClick={doAddCatnap}
            className="w-full rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 py-4 text-base font-semibold text-indigo-700 active:bg-indigo-100"
          >
            ➕ {t.addCatnap}
          </button>
        </div>
      )}
    </div>
  );
}

function Header({
  onOpenSettings,
  now,
  showDate
}: {
  onOpenSettings: () => void;
  now: number;
  showDate?: boolean;
}) {
  const date = new Date();
  const dateStr = date.toLocaleDateString('bg-BG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  return (
    <header className="flex items-center justify-between pt-6">
      <div>
        <h1 className="text-xl font-bold text-pink-700">{t.appTitle}</h1>
        <div className="text-xs text-gray-500">
          {showDate || now ? dateStr : ''} · {toHHMM(now)}
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        className="rounded-full bg-white/80 p-2 text-xl shadow-sm backdrop-blur"
        aria-label={t.settings}
      >
        ⚙️
      </button>
    </header>
  );
}
