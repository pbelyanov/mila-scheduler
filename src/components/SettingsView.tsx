import { useState } from 'react';
import type { AppState, Template } from '../types';
import { t } from '../i18n';
import { TimeInput } from './TimeInput';
import { defaultTemplate } from '../schedule';

type Props = {
  state: AppState;
  onChange: (next: AppState) => void;
  onClose: () => void;
};

export function SettingsView({ state, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<Template>(state.template);

  const set = <K extends keyof Template>(k: K, v: Template[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const saveTemplate = () => {
    onChange({ ...state, template: draft });
    onClose();
  };

  const resetDay = () => {
    if (confirm(t.resetDayConfirm)) {
      onChange({
        ...state,
        day: { ...state.day, wakeMin: null, events: [] }
      });
      onClose();
    }
  };

  const resetTemplate = () => {
    if (confirm(t.resetTemplateConfirm)) {
      setDraft(defaultTemplate());
    }
  };

  return (
    <div className="px-4 pb-24">
      <header className="flex items-center justify-between pt-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-pink-700"
        >
          <span>←</span> {t.backToDay}
        </button>
        <h1 className="text-lg font-bold text-pink-700">{t.settings}</h1>
        <div className="w-20" />
      </header>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
          {t.templateSection}
        </h2>

        <Field label={t.bedtimeLabel}>
          <TimeInput
            valueMin={draft.bedtimeMin}
            onChange={(v) => set('bedtimeMin', v)}
          />
        </Field>

        <Field label={t.ritualLabel}>
          <NumInput
            value={draft.ritualOffsetMin}
            onChange={(v) => set('ritualOffsetMin', v)}
          />
        </Field>

        <Field label={t.feedIntervalLabel}>
          <NumInput
            value={draft.feedIntervalMin}
            onChange={(v) => set('feedIntervalMin', v)}
          />
        </Field>

        <Field label={t.napTargetsLabel} help={t.napHelp}>
          <MinutesListInput
            values={draft.napTargetsMin}
            onChange={(vs) => set('napTargetsMin', vs)}
          />
        </Field>

        <Field label={t.wakeWindowsLabel} help={t.wwHelp}>
          <MinutesListInput
            values={draft.wakeWindowsMin}
            onChange={(vs) => set('wakeWindowsMin', vs)}
          />
        </Field>

        <Field label={t.connectedWWLabel}>
          <NumInput
            value={draft.connectedWakeWindowMin}
            onChange={(v) => set('connectedWakeWindowMin', v)}
          />
        </Field>

        <Field label={t.catnapDurLabel}>
          <NumInput
            value={draft.catnapDurationMin}
            onChange={(v) => set('catnapDurationMin', v)}
          />
        </Field>

        <Field label={t.lastNapLatestLabel} help={t.lastNapLatestHelp}>
          <TimeInput
            valueMin={draft.lastNapStartLatestMin}
            onChange={(v) => set('lastNapStartLatestMin', v)}
          />
        </Field>

        <div className="mt-6 flex gap-2">
          <button
            onClick={saveTemplate}
            className="flex-1 rounded-xl bg-pink-600 py-3 text-base font-semibold text-white shadow-sm active:bg-pink-800"
          >
            {t.save}
          </button>
          <button
            onClick={resetTemplate}
            className="rounded-xl border border-pink-300 bg-white px-4 py-3 text-sm font-semibold text-pink-700"
          >
            {t.resetTemplate}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <button
          onClick={resetDay}
          className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700"
        >
          {t.resetDay}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  help
}: {
  label: string;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
    </div>
  );
}

function NumInput({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || '0', 10)))}
      className="w-32 rounded-lg border border-pink-200 bg-white px-3 py-2 text-lg font-semibold text-pink-700 focus:border-pink-400 focus:outline-none"
    />
  );
}

function MinutesListInput({
  values,
  onChange
}: {
  values: number[];
  onChange: (vs: number[]) => void;
}) {
  const [text, setText] = useState<string>(values.join(', '));
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const parts = v
            .split(/[,\s]+/)
            .map((x) => x.trim())
            .filter(Boolean);
          const nums = parts.map((p) => parseInt(p, 10));
          if (nums.every((n) => Number.isFinite(n) && n >= 0)) {
            setError(null);
            onChange(nums);
          } else {
            setError('Невалидни стойности');
          }
        }}
        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-base font-medium text-pink-700 focus:border-pink-400 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
