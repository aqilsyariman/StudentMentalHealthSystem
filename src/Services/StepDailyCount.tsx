import AppleHealthKit, {
  HealthValue, // Use the HealthValue type
  HealthInputOptions,
} from 'react-native-health';
import auth from '@react-native-firebase/auth'; // ✅ 1. Add auth import
import firestore from '@react-native-firebase/firestore'; // ✅ 2. Add firestore import

const SAVE_TO_FIRESTORE = true;

// --- Helper function to get the date string ---
const getLocalDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const getDailyStepCount = (
  callback: (data: { value: number | null; date: string | null }) => void,
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

      const newReadingData = {
        value: latestReading.value,
        timestamp: firestore.Timestamp.fromDate(readingDate),
      };

      const dateKey = getLocalDateString(readingDate);

      // --- ✅ 6. Save to Firestore (Copied from getHeartRate) ---
      if (SAVE_TO_FIRESTORE) {
        try {
          // Get reference, but change 'heartRate' to 'stepCount'
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('sensorData')
            .doc('stepCount'); // <-- The main change is here

          // Set logic is identical to your heart rate function
          await sensorDocRef.set(
            {
              data: {
                [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
              },
            },
            { merge: true }, // This is essential
          );

          console.log(`✅ Saved new step reading to map key: ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore save failed (steps):', saveErr.message);
        }
      }
      // --- End of Firestore Save ---

      // 7. Final callback
      callback({ value: latestReading.value, date: latestReading.startDate });
    },
  );
};