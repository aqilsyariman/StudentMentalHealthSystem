import AppleHealthKit, { HealthValue } from 'react-native-health';

interface SleepEntry {
  start: number;
  end: number;
}

const mergeIntervals = (intervals: SleepEntry[]): SleepEntry[] => {
  if (intervals.length === 0) {return [];}
  intervals.sort((a, b) => a.start - b.start);

  const merged: SleepEntry[] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const curr = intervals[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }
  return merged;
};

export const getSleepData = (
  callback: (data: { summary: { asleep: string; inBed: string; awake: string; core: string; deep: string; rem: string }; date: string | null } | null) => void
) => {
  const options = {
    startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    endDate: new Date().toISOString(),
  };

  AppleHealthKit.getSleepSamples(options, (err: string, results: HealthValue[]) => {
    if (err || !results?.length) {
      callback(null);
      return;
    }

    const asleep: SleepEntry[] = [], inBed: SleepEntry[] = [], awake: SleepEntry[] = [], core: SleepEntry[] = [], deep: SleepEntry[] = [], rem: SleepEntry[] = [];

    results.forEach((s) => {
      const start = new Date(s.startDate).getTime();
      const end = new Date(s.endDate).getTime();
      const value = String(s.value).toUpperCase();

      if (value === 'ASLEEP') {asleep.push({ start, end });}
      else if (value === 'INBED') inBed.push({ start, end });
      else if (value === 'AWAKE') awake.push({ start, end });
      else if (value === 'CORE') core.push({ start, end });
      else if (value === 'DEEP') deep.push({ start, end });
      else if (value === 'REM') rem.push({ start, end });
    });

    const minutes = (arr: SleepEntry[]) => mergeIntervals(arr).reduce((sum, i) => sum + (i.end - i.start) / 60000, 0);
    const fmt = (m: number) => `${Math.floor(m / 60)} hours ${Math.round(m % 60)} minutes`;

    const latestDate = results[results.length - 1]?.startDate ?? null;

    callback({
      summary: {
        asleep: fmt(minutes(asleep)),
        inBed: fmt(minutes(inBed)),
        awake: fmt(minutes(awake)),
        core: fmt(minutes(core)),
        deep: fmt(minutes(deep)),
        rem: fmt(minutes(rem)),
      },
      date: latestDate,
    });
  });
};
