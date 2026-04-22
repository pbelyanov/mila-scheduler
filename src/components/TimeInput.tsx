import { toHHMM, fromHHMM } from '../timeutil';

type Props = {
  valueMin: number;
  onChange: (min: number) => void;
  className?: string;
  disabled?: boolean;
};

export function TimeInput({ valueMin, onChange, className, disabled }: Props) {
  return (
    <input
      type="time"
      value={toHHMM(valueMin)}
      onChange={(e) => {
        const v = e.target.value;
        if (/^\d{2}:\d{2}$/.test(v)) onChange(fromHHMM(v));
      }}
      disabled={disabled}
      className={
        className ??
        'rounded-lg border border-pink-200 bg-white px-3 py-2 text-lg font-semibold text-pink-700 focus:border-pink-400 focus:outline-none disabled:opacity-50'
      }
    />
  );
}
