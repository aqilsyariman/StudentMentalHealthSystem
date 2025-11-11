// ✅ Import auth and firestore
import AppleHealthKit, { HealthInputOptions } from 'react-native-health';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// --- ✅ Added helper flag and function ---
const SAVE_TO_FIRESTORE = true;

const getLocalDateString = (date: Date) => {
  // This creates a string like "2025-11-08"
  return date.toISOString().split('T')[0];
};
// --- End of helpers ---

export const getHeightWeightAndBMI = async ( // ✅ Made function async
  callback: (data: {
    weight: number | null;
    height: number | null;
    bmi: number | null;
    date: string | null;
  }) => void,
) => {
  // --- ✅ Added Auth Check ---
  const user = auth().currentUser;
  if (!user) {
    console.warn('User not authenticated.');
    callback({ weight: null, height: null, bmi: null, date: null });
    return;
  }
  // --- End of Auth Check ---

  const healthData: {
    weight: number | null;
    height: number | null;
    bmi: number | null;
    date: string | null;
  } = {
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
    const heightOptions: HealthInputOptions = {
      unit: AppleHealthKit.Constants.Units.meter,
    };
    
    // ✅ Make the innermost callback async to allow 'await'
    AppleHealthKit.getLatestHeight(heightOptions, async (err2, results2) => {
      if (!err2 && results2?.value) {
        healthData.height = results2.value;

        if (!healthData.date) {
          healthData.date = results2.startDate || null;
        }

        // ✅ Calculate BMI
        if (healthData.weight && healthData.height) {
          healthData.bmi =
            healthData.weight / (healthData.height * healthData.height);
        }
      }

      // --- ✅ Save to Firestore ---
      // We only save if we at least have a date from one of the readings
      if (SAVE_TO_FIRESTORE && healthData.date) {
        try {
          const readingDate = new Date(healthData.date);
          const dateKey = getLocalDateString(readingDate);

          // 1. This is the new data object to save
          const newReadingData = {
            weight: healthData.weight,
            height: healthData.height,
            bmi: healthData.bmi,
            timestamp: firestore.Timestamp.fromDate(readingDate),
          };

          // 2. Get a reference to a SINGLE document
          // This follows your pattern: ...collection('BMIdata').doc('bodyMetrics')
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('BMIdata')
            .doc('bodyMetrics'); // Using 'bodyMetrics' as it has W, H, and BMI

          // 3. Use .set() with dot notation and merge
          await sensorDocRef.set(
            {
              data: {
                [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
              },
            },
            { merge: true }, // ✨ ESSENTIAL!
          );

          console.log(`✅ Saved body metrics to map key: ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore BMIdata save failed:', saveErr.message);
        }
      } else if (SAVE_TO_FIRESTORE) {
        console.warn('Could not save BMIdata: No date found for readings.');
      }
      // --- End of Firestore Save ---

      // ✅ Callback with consistent shape (this runs after save)
      callback(healthData);
    });
  });
};