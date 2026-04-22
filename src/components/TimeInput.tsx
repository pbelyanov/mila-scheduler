type Props = {
  valueMin: number;
  onChange: (min: number) => void;
  className?: string;
  disabled?: boolean;
  size?: 'md' | 'lg';
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (n: number) => n.toString().padStart(2, '0');

export function TimeInput({ valueMin, onChange, className, disabled, size = 'md' }: Props) {
  const h = Math.floor(valueMin / 60);
  const m = valueMin % 60;

  const selectClass =
    size === 'lg'
      ? 'appearance-none rounded-xl border border-pink-200 bg-white px-4 py-3 text-2xl font-bold tabular-nums text-pink-700 focus:border-pink-500 focus:outline-none disabled:opacity-50'
      : 'appearance-none rounded-lg border border-pink-200 bg-white px-3 py-2 text-lg font-semibold tabular-nums text-pink-700 focus:border-pink-400 focus:outline-none disabled:opacity-50';

  return (
    <div className={className ?? 'inline-flex items-center gap-1'}>
      <select
        value={h}
        onChange={(e) => onChange(parseInt(e.target.value, 10) * 60 + m)}
        disabled={disabled}
        className={selectClass}
        aria-label="Часове"
      >
        {HOURS.map((v) => (
          <option key={v} value={v}>
            {pad(v)}
          </option>
        ))}
      </select>
      <span
        className={
          size === 'lg'
            ? 'text-2xl font-bold text-gray-500'
            : 'text-lg font-semibold text-gray-500'
        }
      >
        :
      </span>
      <select
        value={m}
        onChange={(e) => onChange(h * 60 + parseInt(e.target.value, 10))}
        disabled={disabled}
        className={selectClass}
        aria-label="Минути"
      >
        {MINUTES.map((v) => (
          <option key={v} value={v}>
            {pad(v)}
          </option>
        ))}
      </select>
    </div>
  );
}
