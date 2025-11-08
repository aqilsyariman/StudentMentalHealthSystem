import AppleHealthKit, { HealthInputOptions } from 'react-native-health';

export const getBloodPressure = (
  callback: (data: { sys: number | null; dia: number | null; date: string | null }) => void
) => {
  const options: HealthInputOptions = {
    startDate: new Date(2024, 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    ascending: false,
    limit: 1,
  };

  AppleHealthKit.getBloodPressureSamples(options, (err: any, results: any[]) => {
    if (err || !results || results.length === 0) {
      console.error('Error fetching blood pressure:', err);
      callback({ sys: null, dia: null, date: null });
      return;
    }

    const latest = results[0];
    callback({
      sys: latest.bloodPressureSystolicValue,
      dia: latest.bloodPressureDiastolicValue,
      date: latest.startDate,
    });
  });
};
