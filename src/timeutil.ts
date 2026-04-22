export function toHHMM(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function fromHHMM(s: string): number {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function nowMin(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDuration(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem} мин`;
  if (rem === 0) return `${h} ч`;
  return `${h} ч ${rem} мин`;
}
