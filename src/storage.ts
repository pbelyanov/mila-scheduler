import type { AppState, DayState, Template } from './types';
import { defaultTemplate } from './schedule';
import { todayISO } from './timeutil';

const KEY = 'mila-scheduler:v1';

function emptyDay(): DayState {
  return { date: todayISO(), wakeMin: null, events: [] };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { template: defaultTemplate(), day: emptyDay() };
    const parsed = JSON.parse(raw) as AppState;
    const template: Template = { ...defaultTemplate(), ...parsed.template };
    let day = parsed.day ?? emptyDay();
    if (day.date !== todayISO()) day = emptyDay();
    return { template, day };
  } catch {
    return { template: defaultTemplate(), day: emptyDay() };
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetDay(state: AppState): AppState {
  return { ...state, day: emptyDay() };
}
