import AppleHealthKit, { HealthInputOptions } from 'react-native-health';

export const getHeightWeightAndBMI = (
  callback: (data: { weight: number | null; height: number | null; bmi: number | null; date: string | null }) => void
) => {
  const healthData: { weight: number | null; height: number | null; bmi: number | null; date: string | null } = {
    weight: null,
    height: null,
    bmi: null,
    date: null,
  };

  // Fetch Weight
  const weightOptions: HealthInputOptions = { unit: 'kg' as any };
  AppleHealthKit.getLatestWeight(weightOptions, (err, results) => {
    if (!err && results?.value) {
      healthData.weight = results.value;
      healthData.date = results.startDate || null;
    }

    // Fetch Height
    const heightOptions: HealthInputOptions = { unit: AppleHealthKit.Constants.Units.meter };
    AppleHealthKit.getLatestHeight(heightOptions, (err2, results2) => {
      if (!err2 && results2?.value) {
        healthData.height = results2.value;

        if (!healthData.date) {
          healthData.date = results2.startDate || null;
        }

        // ✅ Calculate BMI if both height and weight are available
        if (healthData.weight && healthData.height) {
          healthData.bmi = healthData.weight / (healthData.height * healthData.height);
        }
      }

      // ✅ Callback with consistent shape
      callback(healthData);
    });
  });
};
