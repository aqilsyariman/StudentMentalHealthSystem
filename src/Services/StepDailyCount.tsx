/* eslint-disable curly */
/* eslint-disable no-trailing-spaces */
import AppleHealthKit, {
  HealthValue,
  HealthInputOptions,
} from 'react-native-health';
import auth from '@react-native-firebase/auth'; 
import firestore from '@react-native-firebase/firestore';

// --- STEP COUNT SCORING CONSTANTS ---

const calculateStepCountScore = (steps: number): number => {
  if (steps === null || steps === undefined || steps < 0) return 0;
  
  if (steps >= 10000) return 100;
  if (steps >= 8000) return 85;
  if (steps >= 6000) return 65;
  if (steps >= 4000) return 40;
  if (steps >= 2000) return 20;
  
  return 5;
};
// ------------------------------------

const SAVE_TO_FIRESTORE = true;

const getLocalDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const getDailyStepCount = (
  callback: (data: { value: number | null; date: string | null, score?: number | null }) => void,
) => {
  const user = auth().currentUser;
  if (!user) {
    console.warn('User not authenticated for step count.');
    callback({ value: null, date: null });
    return;
  }

  // ✅ Get last 7 days of data
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const options: HealthInputOptions = {
    startDate: sevenDaysAgo.toISOString(),
    endDate: now.toISOString(),
    ascending: false, // Most recent first
  };

  console.log('📅 Fetching steps from last 7 days...');

  AppleHealthKit.getDailyStepCountSamples(
    options,
    async (err: any, results: HealthValue[]) => {
      if (err || !results || results.length === 0) {
        console.error('Error fetching step count:', err);
        callback({ value: null, date: null, score: null });
        return;
      }

      console.log(`📊 Found ${results.length} step samples`);

      // ✅ KEY FIX: Group by date and sum the steps for each day
      const stepsByDate: { [key: string]: { total: number; samples: HealthValue[] } } = {};

      results.forEach((sample) => {
        const sampleDate = new Date(sample.startDate);
        const dateKey = getLocalDateString(sampleDate);

        if (!stepsByDate[dateKey]) {
          stepsByDate[dateKey] = { total: 0, samples: [] };
        }

        stepsByDate[dateKey].total += sample.value;
        stepsByDate[dateKey].samples.push(sample);
      });

      console.log('📊 Steps grouped by date:', JSON.stringify(stepsByDate, null, 2));

      // ✅ Get the most recent day with non-zero steps
      const sortedDates = Object.keys(stepsByDate).sort().reverse(); // Most recent first
      
      let selectedDate: string | null = null;
      let totalSteps = 0;

      for (const dateKey of sortedDates) {
        if (stepsByDate[dateKey].total > 0) {
          selectedDate = dateKey;
          totalSteps = Math.round(stepsByDate[dateKey].total);
          break;
        }
      }

      if (!selectedDate) {
        console.warn('⚠️ No step data found in last 7 days');
        callback({ value: null, date: null, score: null });
        return;
      }

      console.log(`✅ Selected date: ${selectedDate} with ${totalSteps} total steps`);

      // Get the most recent sample from that day for the timestamp
      const latestSample = stepsByDate[selectedDate].samples[0];
      const readingDate = new Date(latestSample.endDate || latestSample.startDate);

      const stepCountScore = calculateStepCountScore(totalSteps);

      const newReadingData = {
        value: totalSteps,
        score: stepCountScore,
        timestamp: firestore.Timestamp.fromDate(readingDate),
      };

      const dateKey = getLocalDateString(readingDate);

      if (SAVE_TO_FIRESTORE) {
        try {
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('sensorData')
            .doc('stepCount');

          await sensorDocRef.set(
            {
              data: {
                [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
              },
            },
            { merge: true },
          );

          console.log(`✅ Saved step count: ${totalSteps} steps (Score: ${stepCountScore}) for ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore save failed (steps):', saveErr.message);
        }
      }

      callback({ 
        value: totalSteps, 
        date: readingDate.toISOString(),
        score: stepCountScore,
      });
    }
  );
};