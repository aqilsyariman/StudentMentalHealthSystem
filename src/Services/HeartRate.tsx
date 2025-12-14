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

// --- Helper function to get the date string ---
const getLocalDateString = (date: Date) => {
  // This creates a string like "2025-11-08"
  return date.toISOString().split('T')[0];
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

      // === NEW CALCULATION ===
      const heartRateScore = calculateHeartRateScore(rawRHR);
      // =======================

      // 1. This is the new data object to save
      const newReadingData = {
        value: rawRHR,
        score: heartRateScore, // <-- Includes the new calculated score
        timestamp: firestore.Timestamp.fromDate(readingDate), // Use a real timestamp
      };

      // 2. This is the key for the map, e.g., "2025-11-08"
      const dateKey = getLocalDateString(readingDate);

      // --- ✅ Save to Firestore ---
      if (SAVE_TO_FIRESTORE) {
        try {
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('sensorData')
            .doc('heartRate');

          // This saves the raw value and the calculated score.
          await sensorDocRef.set({
              data: {
                [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
              },
            },
            { merge: true } // ✨ This is ESSENTIAL!
          );

          console.log(`✅ Saved new HR reading (Score: ${heartRateScore}) to map key: ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore save failed:', saveErr.message);
        }
      }
      // --- End of Firestore Save ---

      // Return the raw value, date, AND the new score via the callback
      callback({
        value: rawRHR, 
        date: latestReading.startDate, 
        score: heartRateScore,
      });
    },
  );
};
