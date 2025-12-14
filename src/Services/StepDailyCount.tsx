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
  
  // Scoring thresholds based on common wellness targets (Higher is Better)
  if (steps >= 10000) return 100; // Optimal (10,000+ steps)
  if (steps >= 8000) return 85;  // Excellent (8,000 - 9,999)
  if (steps >= 6000) return 65;  // Good (6,000 - 7,999)
  if (steps >= 4000) return 40;  // Average (4,000 - 5,999)
  if (steps >= 2000) return 20;  // Below Average (2,000 - 3,999)
  
  return 5; // Poor (below 2,000 steps - minimal positive contribution)
};
// ------------------------------------

const SAVE_TO_FIRESTORE = true;

// --- Helper function to get the date string ---
const getLocalDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const getDailyStepCount = (
  callback: (data: { value: number | null; date: string | null, score?: number | null }) => void,
) => {
  // ✅ 3. Add user auth check
  const user = auth().currentUser;
  if (!user) {
    console.warn('User not authenticated for step count.');
    callback({ value: null, date: null });
    return;
  }

  const options: HealthInputOptions = {
    startDate: new Date(2024, 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    limit: 1,
    ascending: false,
  };

  // ✅ 4. Update the HealthKit callback
  AppleHealthKit.getDailyStepCountSamples(
    options,
    async (err: any, results: HealthValue[]) => {
      if (err || !results || results.length === 0) {
        console.error('Error fetching step count:', err);
        callback({ value: null, date: null });
        return;
      }

      // 5. Get latest reading (index 0 is latest due to ascending: false)
      const latestReading = results[0];
      const readingDate = new Date(latestReading.startDate);
      const rawSteps = latestReading.value;
      
      // === NEW CALCULATION ===
      const stepCountScore = calculateStepCountScore(rawSteps);
      // =======================


      const newReadingData = {
        value: rawSteps,
        score: stepCountScore,
        timestamp: firestore.Timestamp.fromDate(readingDate),
      };

      const dateKey = getLocalDateString(readingDate);

      // --- ✅ 6. Save to Firestore ---
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
            { merge: true }, // This is essential
          );

          console.log(`✅ Saved new step reading (Score: ${stepCountScore}) to map key: ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore save failed (steps):', saveErr.message);
        }
      }
      // --- End of Firestore Save ---

      // 7. Final callback
      callback({ 
          value: rawSteps, 
          date: latestReading.startDate,
          score: stepCountScore, // Return the score
      });
    },
  );
};
