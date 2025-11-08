// import AppleHealthKit, { HealthInputOptions, HealthValue } from 'react-native-health';
// import auth from '@react-native-firebase/auth';

// export const getHeartRate = (
//   callback: (data: { value: number | null; date: string | null }) => void
// ) => {
//   const options: HealthInputOptions = {
//     startDate: new Date(2024, 0, 1).toISOString(),
//     endDate: new Date().toISOString(),
//     limit: 1,
//     ascending: false,
//   };

//   AppleHealthKit.getHeartRateSamples(options, (err, results: HealthValue[]) => {
//     if (err || !results || results.length === 0) {
//       console.error('Error fetching heart rate:', err);
//       callback({ value: null, date: null });
//       console.log('User UID:', auth().currentUser?.uid);
//       return;
//     }

//     const latest = results[0];
//     callback({ value: latest.value, date: latest.startDate });
//   });
// };

// import AppleHealthKit, { HealthValue } from 'react-native-health';
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';

// const SAVE_TO_FIRESTORE = false;
// export const getHeartRate = async (
//   callback: (data: { value: number | null; date: string | null }) => void
// ) => {
//   const user = auth().currentUser;

//   if (!user) {
//     console.warn('User not authenticated. Please log in first.');
//     callback({ value: null, date: null });
//     return;
//   }

//   console.log('Fetching heart rate for UID:', user.uid);

//   const options = {
//     startDate: new Date(2024, 0, 1).toISOString(),
//     endDate: new Date().toISOString(),
//     limit: 1,
//     ascending: false,
//   };

//   AppleHealthKit.getHeartRateSamples(options, async (err, results: HealthValue[]) => {
//     if (err  || !results || results.length === 0) {
//       console.error('Error fetching heart rate:', err);
//       callback({ value: null, date: null });
//       return;
//     }

//     const latest = results[0];
//     const heartRateData = { value: latest.value, date: latest.startDate };

//     // ✅ Save into Firestore
//     console.log('Writing to Firestore path:', `students/${user.uid}/sensorData`);

// try {
//   if(SAVE_TO_FIRESTORE){
//   await firestore()
//     .collection('students')
//     .doc(user.uid)
//     .collection('sensorData')
//     .add(heartRateData);
//   }
//   console.log('✅ Saved:', heartRateData);
// } catch (saveErr: any) {
//   console.error('❌ Firestore save failed:', saveErr);
// }

//     callback(heartRateData);
//   });
// };

import AppleHealthKit, { HealthValue } from 'react-native-health';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const SAVE_TO_FIRESTORE = true;

// --- Helper function to get the date string ---
const getLocalDateString = (date: Date) => {
  // This creates a string like "2025-11-08"
  return date.toISOString().split('T')[0];
};

export const getHeartRate = async (
  callback: (data: { value: number | null; date: string | null }) => void,
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

      // 1. This is the new data object to save
      const newReadingData = {
        value: latestReading.value,
        timestamp: firestore.Timestamp.fromDate(readingDate), // Use a real timestamp
      };

      // 2. This is the key for the map, e.g., "2025-11-08"
      const dateKey = getLocalDateString(readingDate);

      // --- ✅ Save to Firestore ---
      if (SAVE_TO_FIRESTORE) {
        try {
          // 1. Get a reference to the SINGLE document
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('sensorData')
            .doc('heartRate'); // <-- This points to your 'heartRate' doc

          // 2. Use .set() with dot notation and merge
          // This tells Firestore: "In the 'data' map, find the key [dateKey]
          // and add this new object to its array."
          await sensorDocRef.set({
              data: {
                [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),

              },
            },
            { merge: true } // ✨ This is ESSENTIAL!
          );

          console.log(`✅ Saved new reading to map key: ${dateKey}`);
        } catch (saveErr: any) {
          console.error('❌ Firestore save failed:', saveErr.message);
        }
      }
      // --- End of Firestore Save ---

      callback({ value: latestReading.value, date: latestReading.startDate });
    },
  );
};
