import AppleHealthKit, { HealthInputOptions } from 'react-native-health';

export const getDailyStepCount = (
  callback: (data: { value: number | null; date: string | null }) => void
) => {
  const options: HealthInputOptions = {
    startDate: new Date(2024, 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    limit: 1,
    ascending: false,
  };

  AppleHealthKit.getDailyStepCountSamples(options, (err: any, results: any[]) => {
    if (err || !results || results.length === 0) {
      console.error('Error fetching step count:', err);
      callback({ value: null, date: null });
      return;
    }

    const latest = results[results.length - 1];
    callback({ value: latest.value, date: latest.startDate });
  });
};
