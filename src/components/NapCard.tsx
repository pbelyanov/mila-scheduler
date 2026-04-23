import { useState } from 'react';
import type { DayEvent } from '../types';
import { t } from '../i18n';
import { toHHMM, formatDuration } from '../timeutil';
import { TimeInput } from './TimeInput';

export type NapAction =
  | { kind: 'mark-start'; actualMin: number }
  | { kind: 'mark-end'; actualMin: number }
  | { kind: 'connect' }
  | { kind: 'edit-start'; actualMin: number }
  | { kind: 'edit-end'; actualMin: number };

type Props = {
  start: DayEvent;
  end: DayEvent;
  state: 'past' | 'active' | 'current' | 'upcoming';
  canConnect: boolean;
  nowMinutes: number;
  onAction: (a: NapAction) => void;
};

export function NapCard({ start, end, state, canConnect, nowMinutes, onAction }: Props) {
  const [pickingStart, setPickingStart] = useState<number | null>(null);
  const [pickingEnd, setPickingEnd] = useState<number | null>(null);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const [editVal, setEditVal] = useState(0);

  const startTime = start.actualMin ?? start.plannedMin;
  const endTime = end.actualMin ?? end.plannedMin;

  const napNumber = (start.napIndex ?? 0) + 1;
  const label = start.isCatnap ? t.catnapLabel : t.napN(napNumber);

  const base = 'rounded-2xl border p-4 transition-all';
  const tone =
    state === 'current'
      ? 'border-pink-400 bg-pink-50 shadow-sm ring-2 ring-pink-200'
      : state === 'active'
        ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-2 ring-indigo-200'
        : state === 'past'
          ? 'border-gray-200 bg-white/60 opacity-75'
          : 'border-pink-100 bg-white';

  return (
    <div className={`${base} ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">😴</div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
            {start.connectedFromPrev && (
              <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                {t.connectHint}
              </span>
            )}
            {state === 'active' && (
              <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                {t.currentStatus.sleeping}
              </span>
            )}
          </div>
          <div
            className={`mt-1 text-2xl font-bold tabular-nums ${state === 'past' ? 'text-gray-500' : 'text-pink-700'}`}
          >
            {toHHMM(startTime)}
            <span className="px-2 text-gray-400">–</span>
            {toHHMM(endTime)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {formatDuration(Math.max(0, endTime - startTime))}
          </div>
        </div>
      </div>

      {state === 'current' && pickingStart === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onAction({ kind: 'mark-start', actualMin: nowMinutes })}
            className="flex-1 rounded-xl bg-pink-600 py-3 text-base font-semibold text-white shadow-sm active:bg-pink-800"
          >
            {t.markStart}
          </button>
          <button
            onClick={() => setPickingStart(nowMinutes)}
            className="rounded-xl border border-pink-300 bg-white px-4 py-3 text-base font-semibold text-pink-700"
          >
            {t.edit}
          </button>
        </div>
      )}

      {state === 'current' && pickingStart !== null && (
        <TimePickerRow
          value={pickingStart}
          onChange={setPickingStart}
          onSave={() => {
            onAction({ kind: 'mark-start', actualMin: pickingStart });
            setPickingStart(null);
          }}
          onCancel={() => setPickingStart(null)}
        />
      )}

      {state === 'active' && pickingEnd === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onAction({ kind: 'mark-end', actualMin: nowMinutes })}
            className="flex-1 rounded-xl bg-pink-600 py-3 text-base font-semibold text-white shadow-sm active:bg-pink-800"
          >
            {t.markEnd}
          </button>
          <button
            onClick={() => setPickingEnd(nowMinutes)}
            className="rounded-xl border border-pink-300 bg-white px-4 py-3 text-base font-semibold text-pink-700"
          >
            {t.edit}
          </button>
          {canConnect && (
            <button
              onClick={() => onAction({ kind: 'connect' })}
              className="w-full rounded-xl border border-indigo-300 bg-indigo-50 py-3 text-base font-semibold text-indigo-700"
            >
              🔗 {t.connect}
            </button>
          )}
        </div>
      )}

      {state === 'active' && pickingEnd !== null && (
        <TimePickerRow
          value={pickingEnd}
          onChange={setPickingEnd}
          onSave={() => {
            onAction({ kind: 'mark-end', actualMin: pickingEnd });
            setPickingEnd(null);
          }}
          onCancel={() => setPickingEnd(null)}
        />
      )}

      {state === 'past' && editing === null && (
        <div className="mt-2 flex gap-4 text-xs">
          <button
            onClick={() => {
              setEditVal(startTime);
              setEditing('start');
            }}
            className="text-pink-600 underline"
          >
            {t.edit} · {t.shortKinds['nap-start']}
          </button>
          <button
            onClick={() => {
              setEditVal(endTime);
              setEditing('end');
            }}
            className="text-pink-600 underline"
          >
            {t.edit} · {t.shortKinds['nap-end']}
          </button>
        </div>
      )}

      {editing !== null && (
        <TimePickerRow
          value={editVal}
          onChange={setEditVal}
          onSave={() => {
            onAction(
              editing === 'start'
                ? { kind: 'edit-start', actualMin: editVal }
                : { kind: 'edit-end', actualMin: editVal }
            );
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TimePickerRow({
  value,
  onChange,
  onSave,
  onCancel
}: {
  value: number;
  onChange: (v: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <TimeInput valueMin={value} onChange={onChange} />
      <button
        onClick={onSave}
        className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white"
      >
        {t.save}
      </button>
      <button
        onClick={onCancel}
        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
      >
        {t.cancel}
      </button>
    </div>
  );
}
