import type { DayEvent, DayState, Template } from './types';
import { fromHHMM } from './timeutil';

let nextId = 0;
const makeId = () => `e${Date.now()}-${nextId++}`;

export function defaultTemplate(): Template {
  return {
    bedtimeMin: fromHHMM('20:00'),
    ritualOffsetMin: 20,
    feedIntervalMin: 180,
    napTargetsMin: [40, 40, 40, 40],
    wakeWindowsMin: [90, 105, 120, 120, 135],
    connectedWakeWindowMin: 120,
    catnapDurationMin: 20,
    lastNapStartLatestMin: fromHHMM('17:15')
  };
}

function dropLateNaps(events: DayEvent[], template: Template): DayEvent[] {
  const cutoff = template.lastNapStartLatestMin;
  const toRemove = new Set<string>();
  for (const e of events) {
    if (
      e.kind === 'nap-start' &&
      !e.done &&
      !e.isCatnap &&
      e.plannedMin > cutoff
    ) {
      toRemove.add(e.id);
      const pair = events.find(
        (x) => x.kind === 'nap-end' && x.napIndex === e.napIndex
      );
      if (pair) toRemove.add(pair.id);
    }
  }
  if (toRemove.size === 0) return events;
  return events.filter((e) => !toRemove.has(e.id));
}

function kindOrder(k: DayEvent['kind']): number {
  const order: Record<DayEvent['kind'], number> = {
    wake: 0,
    feed: 1,
    'nap-end': 2,
    'nap-start': 3,
    ritual: 4,
    bedtime: 5
  };
  return order[k];
}

function sortEvents(events: DayEvent[]): DayEvent[] {
  return [...events].sort(
    (a, b) => a.plannedMin - b.plannedMin || kindOrder(a.kind) - kindOrder(b.kind)
  );
}

function computeWWTail(src: number[], n: number): number[] {
  if (n <= 0) return [];
  const tail = src.slice(Math.max(0, src.length - n));
  while (tail.length < n) tail.unshift(tail[0] ?? 90);
  return tail;
}

function planFeeds(wakeMin: number, bedtimeMin: number, intervalMin: number): number[] {
  const feeds: number[] = [wakeMin];
  let t = wakeMin + intervalMin;
  const cutoff = bedtimeMin - intervalMin + 30;
  while (t < cutoff) {
    feeds.push(t);
    t += intervalMin;
  }
  feeds.push(bedtimeMin);
  return feeds;
}

const FEED_NAP_BUFFER_MIN = 5;

function resolveFeedNapOverlaps(events: DayEvent[], template: Template): DayEvent[] {
  const result = events.map((e) => ({ ...e }));

  const pendingNapStarts = result
    .filter((e) => e.kind === 'nap-start' && !e.done)
    .sort((a, b) => a.plannedMin - b.plannedMin);

  for (const napStart of pendingNapStarts) {
    const napEnd = result.find(
      (e) => e.kind === 'nap-end' && e.napIndex === napStart.napIndex && !e.done
    );
    if (!napEnd) continue;

    const overlapping = result.filter(
      (e) =>
        e.kind === 'feed' &&
        !e.done &&
        e.plannedMin !== template.bedtimeMin &&
        e.plannedMin > napStart.plannedMin &&
        e.plannedMin < napEnd.plannedMin
    );

    for (const feed of overlapping) {
      const napDur = napEnd.plannedMin - napStart.plannedMin;
      if (napDur <= 0) continue;
      const offset = feed.plannedMin - napStart.plannedMin;
      if (offset < napDur / 2) {
        const newStart = feed.plannedMin + FEED_NAP_BUFFER_MIN;
        napStart.plannedMin = newStart;
        napEnd.plannedMin = newStart + napDur;
      } else {
        feed.plannedMin = napEnd.plannedMin + FEED_NAP_BUFFER_MIN;
      }
    }
  }

  return result;
}

function redistributeFeeds(
  doneFeeds: DayEvent[],
  pendingFeeds: DayEvent[],
  template: Template
): DayEvent[] {
  if (pendingFeeds.length === 0 || doneFeeds.length === 0) {
    return pendingFeeds.map((f) => ({ ...f }));
  }
  const lastDone = doneFeeds[doneFeeds.length - 1];
  const anchor = lastDone.actualMin ?? lastDone.plannedMin;
  const bedtimeFeed = pendingFeeds[pendingFeeds.length - 1];
  const intermediates = pendingFeeds.slice(0, -1);

  const numGaps = intermediates.length + 1;
  const available = template.bedtimeMin - anchor;
  if (available <= 0 || numGaps <= 0) return pendingFeeds.map((f) => ({ ...f }));

  const interval = Math.min(template.feedIntervalMin, available / numGaps);

  const result: DayEvent[] = [];
  let cursor = anchor;
  for (const f of intermediates) {
    cursor += interval;
    result.push({ ...f, plannedMin: Math.round(cursor) });
  }
  result.push({ ...bedtimeFeed, plannedMin: template.bedtimeMin });
  return result;
}

export function generateEvents(wakeMin: number, template: Template): DayEvent[] {
  const napDurations = [...template.napTargetsMin];
  const wws = computeWWTail(template.wakeWindowsMin, napDurations.length + 1);

  const totalNap = napDurations.reduce((a, b) => a + b, 0);
  const totalWW = wws.reduce((a, b) => a + b, 0);
  const available = template.bedtimeMin - wakeMin;
  let wwScale = 1;
  if (totalWW > 0 && available > 0) {
    const slack = available - totalNap;
    wwScale = Math.max(0.25, slack / totalWW);
  }

  const events: DayEvent[] = [];

  events.push({ id: makeId(), kind: 'wake', plannedMin: wakeMin, done: false });

  const feeds = planFeeds(wakeMin, template.bedtimeMin, template.feedIntervalMin);
  feeds.forEach((t, i) => {
    events.push({
      id: makeId(),
      kind: 'feed',
      plannedMin: t,
      feedIndex: i,
      done: false
    });
  });

  let cursor = wakeMin;
  for (let i = 0; i < napDurations.length; i++) {
    const ww = Math.round(wws[i] * wwScale);
    const napStart = cursor + ww;
    const napDur = napDurations[i];
    const napEnd = napStart + napDur;
    events.push({
      id: makeId(),
      kind: 'nap-start',
      plannedMin: napStart,
      napIndex: i,
      napDurationMin: napDur,
      done: false
    });
    events.push({
      id: makeId(),
      kind: 'nap-end',
      plannedMin: napEnd,
      napIndex: i,
      napDurationMin: napDur,
      done: false
    });
    cursor = napEnd;
  }

  events.push({
    id: makeId(),
    kind: 'ritual',
    plannedMin: template.bedtimeMin - template.ritualOffsetMin,
    done: false
  });
  events.push({
    id: makeId(),
    kind: 'bedtime',
    plannedMin: template.bedtimeMin,
    done: false
  });

  return sortEvents(dropLateNaps(resolveFeedNapOverlaps(events, template), template));
}

export function recalibrate(day: DayState, template: Template): DayEvent[] {
  const sorted = sortEvents(day.events);
  if (day.wakeMin === null || sorted.length === 0) return sorted;

  const doneEvents = sorted.filter((e) => e.done);
  const pendingEvents = sorted.filter((e) => !e.done);

  if (pendingEvents.length === 0) return sorted;

  const lastDone = doneEvents[doneEvents.length - 1];
  const anchor = lastDone?.actualMin ?? lastDone?.plannedMin ?? day.wakeMin;

  const doneNapStart = [...doneEvents].reverse().find((e) => e.kind === 'nap-start');
  let activeNapEnd: DayEvent | undefined;
  if (doneNapStart) {
    activeNapEnd = pendingEvents.find(
      (e) => e.kind === 'nap-end' && e.napIndex === doneNapStart.napIndex
    );
  }

  const updated: DayEvent[] = [...doneEvents];
  let cursor = anchor;

  if (activeNapEnd && doneNapStart) {
    const dur =
      activeNapEnd.napDurationMin ??
      template.napTargetsMin[activeNapEnd.napIndex ?? 0] ??
      40;
    const napStartMin = doneNapStart.actualMin ?? doneNapStart.plannedMin;
    const plannedEnd = napStartMin + dur;
    updated.push({ ...activeNapEnd, plannedMin: plannedEnd, napDurationMin: dur });
    cursor = Math.max(cursor, plannedEnd);
  }

  const pendingNapStarts = pendingEvents.filter((e) => e.kind === 'nap-start');
  const napDurations = pendingNapStarts.map(
    (e) => e.napDurationMin ?? template.napTargetsMin[e.napIndex ?? 0] ?? 40
  );

  const numNaps = pendingNapStarts.length;
  const wws = computeWWTail(template.wakeWindowsMin, numNaps + 1);

  if (numNaps > 0 && pendingNapStarts[0].connectedFromPrev) {
    wws[0] = template.connectedWakeWindowMin;
  }

  const totalNap = napDurations.reduce((a, b) => a + b, 0);
  const totalWW = wws.reduce((a, b) => a + b, 0);
  const available = template.bedtimeMin - cursor;
  let wwScale = 1;
  if (totalWW > 0 && available > 0) {
    const slack = available - totalNap;
    wwScale = Math.max(0.25, slack / totalWW);
  }

  for (let i = 0; i < numNaps; i++) {
    const ww = Math.round(wws[i] * wwScale);
    const napStart = cursor + ww;
    const napDur = napDurations[i];
    const napEnd = napStart + napDur;
    const startEvt = pendingNapStarts[i];
    updated.push({ ...startEvt, plannedMin: napStart });
    const endEvt = pendingEvents.find(
      (e) => e.kind === 'nap-end' && e.napIndex === startEvt.napIndex && e !== activeNapEnd
    );
    if (endEvt) {
      updated.push({ ...endEvt, plannedMin: napEnd, napDurationMin: napDur });
    }
    cursor = napEnd;
  }

  const pendingFeeds = pendingEvents.filter((e) => e.kind === 'feed');
  const doneFeeds = doneEvents.filter((e) => e.kind === 'feed');
  updated.push(...redistributeFeeds(doneFeeds, pendingFeeds, template));

  const pendingRitual = pendingEvents.find((e) => e.kind === 'ritual');
  if (pendingRitual) {
    updated.push({
      ...pendingRitual,
      plannedMin: template.bedtimeMin - template.ritualOffsetMin
    });
  }

  const pendingBedtime = pendingEvents.find((e) => e.kind === 'bedtime');
  if (pendingBedtime) {
    updated.push({ ...pendingBedtime, plannedMin: template.bedtimeMin });
  }

  const pendingWake = pendingEvents.find((e) => e.kind === 'wake');
  if (pendingWake) updated.push(pendingWake);

  return sortEvents(dropLateNaps(resolveFeedNapOverlaps(updated, template), template));
}

export function connectCurrentNap(day: DayState, template: Template): DayEvent[] {
  const sorted = sortEvents(day.events);
  const activeNapStart = [...sorted].reverse().find((e) => e.kind === 'nap-start' && e.done);
  if (!activeNapStart) return sorted;

  const activeNapEnd = sorted.find(
    (e) => e.kind === 'nap-end' && e.napIndex === activeNapStart.napIndex && !e.done
  );
  if (!activeNapEnd) return sorted;

  const pendingNapStarts = sorted.filter((e) => e.kind === 'nap-start' && !e.done);
  const nextNapStart = pendingNapStarts[0];
  if (!nextNapStart) return sorted;
  const nextNapEnd = sorted.find(
    (e) => e.kind === 'nap-end' && e.napIndex === nextNapStart.napIndex && !e.done
  );

  const mergedDuration =
    (activeNapEnd.napDurationMin ?? 40) + (nextNapStart.napDurationMin ?? 40);

  const filtered = sorted.filter(
    (e) => e.id !== nextNapStart.id && !(nextNapEnd && e.id === nextNapEnd.id)
  );

  const updated = filtered.map((e) => {
    if (e.id === activeNapEnd.id) {
      return { ...e, napDurationMin: mergedDuration };
    }
    return e;
  });

  const remainingPendingStarts = updated.filter((e) => e.kind === 'nap-start' && !e.done);
  if (remainingPendingStarts.length > 0) {
    const first = remainingPendingStarts[0];
    const idx = updated.findIndex((e) => e.id === first.id);
    updated[idx] = { ...first, connectedFromPrev: true };
  }

  return recalibrate({ ...day, events: updated }, template);
}

export function addCatnap(day: DayState, template: Template): DayEvent[] {
  const sorted = sortEvents(day.events);
  const hasPendingNaps = sorted.some((e) => e.kind === 'nap-start' && !e.done);
  if (hasPendingNaps) return sorted;

  const lastNapEnd = [...sorted].reverse().find((e) => e.kind === 'nap-end' && e.done);
  const ritual = sorted.find((e) => e.kind === 'ritual');
  if (!ritual) return sorted;

  const anchorMin = lastNapEnd?.actualMin ?? lastNapEnd?.plannedMin ?? day.wakeMin ?? 0;
  const gap = ritual.plannedMin - anchorMin;
  if (gap < 90) return sorted;

  const napDur = template.catnapDurationMin;
  const wwBefore = Math.max(60, Math.round((gap - napDur) * 0.55));
  const napStartMin = anchorMin + wwBefore;
  const napEndMin = napStartMin + napDur;

  const maxNapIndex = sorted
    .filter((e) => e.napIndex !== undefined)
    .reduce((m, e) => Math.max(m, e.napIndex!), -1);
  const newIdx = maxNapIndex + 1;

  const newStart: DayEvent = {
    id: makeId(),
    kind: 'nap-start',
    plannedMin: napStartMin,
    napIndex: newIdx,
    napDurationMin: napDur,
    done: false,
    isCatnap: true
  };
  const newEnd: DayEvent = {
    id: makeId(),
    kind: 'nap-end',
    plannedMin: napEndMin,
    napIndex: newIdx,
    napDurationMin: napDur,
    done: false,
    isCatnap: true
  };

  const updated = sortEvents([...sorted, newStart, newEnd]);
  return recalibrate({ ...day, events: updated }, template);
}

export function applyTemplateChange(
  day: DayState,
  newTemplate: Template
): DayEvent[] {
  if (day.wakeMin === null) return day.events;

  const fresh = generateEvents(day.wakeMin, newTemplate);
  const result: DayEvent[] = [];

  for (const freshEvt of fresh) {
    const match = day.events.find(
      (old) =>
        old.kind === freshEvt.kind &&
        old.napIndex === freshEvt.napIndex &&
        old.feedIndex === freshEvt.feedIndex
    );
    if (match && match.done) {
      result.push({ ...match });
    } else if (match) {
      result.push({ ...freshEvt, id: match.id });
    } else {
      result.push(freshEvt);
    }
  }

  for (const old of day.events) {
    const hasMatch = result.some(
      (r) =>
        r.kind === old.kind &&
        r.napIndex === old.napIndex &&
        r.feedIndex === old.feedIndex
    );
    if (hasMatch) continue;
    if (old.done || old.isCatnap) {
      result.push({ ...old });
    }
  }

  return recalibrate({ ...day, events: sortEvents(result) }, newTemplate);
}

export function totalPlannedDaySleepMin(events: DayEvent[]): number {
  const starts = events.filter((e) => e.kind === 'nap-start');
  return starts.reduce((sum, e) => sum + (e.napDurationMin ?? 0), 0);
}

export function totalActualDaySleepMin(events: DayEvent[]): number {
  const ends = events.filter((e) => e.kind === 'nap-end' && e.done);
  let total = 0;
  for (const end of ends) {
    const start = events.find(
      (e) => e.kind === 'nap-start' && e.napIndex === end.napIndex && e.done
    );
    if (start && start.actualMin !== undefined && end.actualMin !== undefined) {
      total += end.actualMin - start.actualMin;
    }
  }
  return total;
}
