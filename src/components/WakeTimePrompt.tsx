import { useState } from 'react';
import { t } from '../i18n';
import { nowMin } from '../timeutil';
import { TimeInput } from './TimeInput';

type Props = { onSet: (min: number) => void };

export function WakeTimePrompt({ onSet }: Props) {
  const [val, setVal] = useState<number>(nowMin());
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-6 rounded-2xl bg-white/80 p-8 text-center shadow-sm backdrop-blur">
      <div className="text-6xl">🌅</div>
      <h2 className="text-2xl font-semibold text-pink-700">{t.noWakeYet}</h2>
      <p className="text-sm text-gray-600">{t.noWakeDesc}</p>
      <label className="flex w-full flex-col gap-2 text-left text-sm font-medium text-gray-700">
        {t.wakePrompt}
        <TimeInput valueMin={val} onChange={setVal} className="w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-2xl font-bold text-pink-700 focus:border-pink-500 focus:outline-none" />
      </label>
      <button
        onClick={() => onSet(val)}
        className="w-full rounded-xl bg-pink-600 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-pink-700 active:bg-pink-800"
      >
        {t.wakeCta}
      </button>
    </div>
  );
}
