/* eslint-disable no-trailing-spaces */
import AppleHealthKit, { HealthValue } from 'react-native-health';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// --- HEART RATE SCORING CONSTANTS ---
const RHR_POOR = 85; // 0% Score at 85 BPM
const RHR_IDEAL = 50; // 100% Score at 55 BPM
const RHR_RANGE = RHR_POOR - RHR_IDEAL; // 30 BPM range

const calculateHeartRateScore = (rhr: number): number => {
  if (rhr <= RHR_IDEAL) {
    return 100; // Optimal or better
  }
  if (rhr >= RHR_POOR) {
    return 0; // Poor or worse
  }

  const score = 100 * (RHR_POOR - rhr) / RHR_RANGE;

  return Math.round(score);
};
// ------------------------------------

const SAVE_TO_FIRESTORE = true;

// Get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getHeartRate = async (
  callback: (data: { value: number | null; date: string | null; score?: number | null }) => void,
) => {
  const user = auth().currentUser;

  if (!user) {
    console.warn('User not authenticated.');
    callback({ value: null, date: null });
    return;
  }

  const options = {
    startDate: new Date(2024, 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    limit: 1,
    ascending: false,
  };

  AppleHealthKit.getHeartRateSamples(
    options,
    async (err, results: HealthValue[]) => {
      if (err || !results || results.length === 0) {
        console.error('Error fetching heart rate from HealthKit:', err);
        callback({ value: null, date: null });
        return;
      }

      const latestReading = results[0];
      const readingDate = new Date(latestReading.startDate);
      const rawRHR = latestReading.value;

      // Calculate heart rate score
      const heartRateScore = calculateHeartRateScore(rawRHR);

      const newReadingData = {
        value: rawRHR,
        score: heartRateScore,
        timestamp: firestore.Timestamp.fromDate(readingDate),
      };

      const dateKey = getLocalDateString(readingDate);

      // Save to Firestore
      if (SAVE_TO_FIRESTORE) {
        try {
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('sensorData')
            .doc('heartRate');

          await sensorDocRef.set({
              data: {
                [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
              },
            },
            { merge: true }
          );

          console.log(`✅ Saved new HR reading (Score: ${heartRateScore}) to map key: ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore save failed:', saveErr.message);
        }
      }

      callback({
        value: rawRHR, 
        date: latestReading.startDate, 
        score: heartRateScore,
      });
    },
  );
};