export type EventKind =
  | 'wake'
  | 'feed'
  | 'nap-start'
  | 'nap-end'
  | 'ritual'
  | 'bedtime';

export type DayEvent = {
  id: string;
  kind: EventKind;
  plannedMin: number;
  actualMin?: number;
  done: boolean;
  napIndex?: number;
  feedIndex?: number;
  napDurationMin?: number;
  connectedFromPrev?: boolean;
  isCatnap?: boolean;
};

export type Template = {
  bedtimeMin: number;
  ritualOffsetMin: number;
  feedIntervalMin: number;
  napTargetsMin: number[];
  wakeWindowsMin: number[];
  connectedWakeWindowMin: number;
  catnapDurationMin: number;
  lastNapStartLatestMin: number;
};

export type DayState = {
  date: string;
  wakeMin: number | null;
  events: DayEvent[];
};

export type AppState = {
  template: Template;
  day: DayState;
};
