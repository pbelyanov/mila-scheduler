import { useState } from 'react';
import type { DayEvent } from '../types';
import { t } from '../i18n';
import { toHHMM, formatDuration } from '../timeutil';
import { TimeInput } from './TimeInput';

type ActionPayload =
  | { kind: 'mark-done'; actualMin: number }
  | { kind: 'connect' }
  | { kind: 'edit-actual'; actualMin: number };

type Props = {
  event: DayEvent;
  state: 'past' | 'current' | 'active-nap' | 'upcoming';
  canConnect: boolean;
  nowMinutes: number;
  onAction: (a: ActionPayload) => void;
};

function eventLabel(event: DayEvent): string {
  if (event.kind === 'nap-start' || event.kind === 'nap-end') {
    if (event.isCatnap) return t.catnapLabel;
    const n = (event.napIndex ?? 0) + 1;
    return t.napN(n);
  }
  if (event.kind === 'feed') {
    const n = (event.feedIndex ?? 0) + 1;
    return t.feedN(n);
  }
  return t.kinds[event.kind];
}

function actionLabel(kind: DayEvent['kind']): string {
  switch (kind) {
    case 'wake':
      return t.markWakeDone;
    case 'feed':
      return t.markFeedDone;
    case 'nap-start':
      return t.markStart;
    case 'nap-end':
      return t.markEnd;
    case 'ritual':
      return t.markRitualDone;
    case 'bedtime':
      return t.markBedtimeDone;
  }
}

function icon(event: DayEvent): string {
  if (event.kind === 'nap-start' || event.kind === 'nap-end') return '😴';
  if (event.kind === 'feed') return '🍼';
  if (event.kind === 'wake') return '🌅';
  if (event.kind === 'ritual') return '🛁';
  if (event.kind === 'bedtime') return '🌙';
  return '•';
}

export function EventCard({ event, state, canConnect, nowMinutes, onAction }: Props) {
  const [editingActual, setEditingActual] = useState(false);
  const [editVal, setEditVal] = useState(event.actualMin ?? nowMinutes);

  const [markingTime, setMarkingTime] = useState(false);
  const [markVal, setMarkVal] = useState(nowMinutes);

  const plannedStr = toHHMM(event.plannedMin);
  const actualStr = event.actualMin !== undefined ? toHHMM(event.actualMin) : null;
  const drift =
    event.actualMin !== undefined ? event.actualMin - event.plannedMin : null;

  const base = 'rounded-2xl border p-4 transition-all';
  const tone =
    state === 'current'
      ? 'border-pink-400 bg-pink-50 shadow-sm ring-2 ring-pink-200'
      : state === 'active-nap'
        ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-2 ring-indigo-200'
        : state === 'past'
          ? 'border-gray-200 bg-white/60 opacity-75'
          : 'border-pink-100 bg-white';

  return (
    <div className={`${base} ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="text-3xl leading-none">{icon(event)}</div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {eventLabel(event)}
              {event.connectedFromPrev && event.kind === 'nap-start' && (
                <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {t.connectHint}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div
                className={`text-2xl font-bold ${state === 'past' ? 'text-gray-500' : 'text-pink-700'}`}
              >
                {actualStr ?? plannedStr}
              </div>
              {actualStr && actualStr !== plannedStr && (
                <div className="text-sm text-gray-400 line-through">{plannedStr}</div>
              )}
            </div>
            {event.kind === 'nap-start' && event.napDurationMin !== undefined && (
              <div className="mt-1 text-xs text-gray-500">
                {formatDuration(event.napDurationMin)}
              </div>
            )}
            {drift !== null && drift !== 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {drift > 0 ? `+${drift}` : drift} {t.minutesShort}
              </div>
            )}
          </div>
        </div>
        {state === 'past' && !editingActual && actualStr && (
          <button
            onClick={() => {
              setEditVal(event.actualMin ?? nowMinutes);
              setEditingActual(true);
            }}
            className="text-xs text-pink-600 underline"
          >
            {t.edit}
          </button>
        )}
      </div>

      {editingActual && (
        <div className="mt-3 flex items-center gap-2">
          <TimeInput valueMin={editVal} onChange={setEditVal} />
          <button
            onClick={() => {
              onAction({ kind: 'edit-actual', actualMin: editVal });
              setEditingActual(false);
            }}
            className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white"
          >
            {t.save}
          </button>
          <button
            onClick={() => setEditingActual(false)}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
          >
            {t.cancel}
          </button>
        </div>
      )}

      {(state === 'current' || state === 'active-nap') && !markingTime && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onAction({ kind: 'mark-done', actualMin: nowMinutes })}
            className="flex-1 rounded-xl bg-pink-600 py-3 text-base font-semibold text-white shadow-sm active:bg-pink-800"
          >
            {actionLabel(event.kind)}
          </button>
          <button
            onClick={() => {
              setMarkVal(nowMinutes);
              setMarkingTime(true);
            }}
            className="rounded-xl border border-pink-300 bg-white px-4 py-3 text-base font-semibold text-pink-700"
            aria-label={t.edit}
          >
            {t.edit}
          </button>
          {canConnect && state === 'active-nap' && (
            <button
              onClick={() => onAction({ kind: 'connect' })}
              className="w-full rounded-xl border border-indigo-300 bg-indigo-50 py-3 text-base font-semibold text-indigo-700"
            >
              🔗 {t.connect}
            </button>
          )}
        </div>
      )}

      {markingTime && (
        <div className="mt-4 flex items-center gap-2">
          <TimeInput valueMin={markVal} onChange={setMarkVal} />
          <button
            onClick={() => {
              onAction({ kind: 'mark-done', actualMin: markVal });
              setMarkingTime(false);
            }}
            className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white"
          >
            {t.save}
          </button>
          <button
            onClick={() => setMarkingTime(false)}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
          >
            {t.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
