import AppleHealthKit, {
  HealthInputOptions,
  BloodPressureSampleValue,
} from 'react-native-health';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// --- BLOOD PRESSURE SCORING CONSTANTS ---

/**
 * Calculates the 0-100% sub-score for Blood Pressure (BP) based on SBP.
 * Uses a stepped score based on standard hypertension guidelines (Lower is Better).
 */
const calculateBpScore = (sbp: number): number => {
  if (sbp === null || sbp === undefined || sbp <= 0) {return 0;}

  // Scoring thresholds (Based on SBP component, adapted for wellness scoring)
  if (sbp <= 120) {return 100;} // Optimal / Normal
  if (sbp <= 129) {return 80;}  // Elevated
  if (sbp <= 139) {return 40;}  // Stage 1 Hypertension
  if (sbp >= 140) {return 10;}  // Stage 2 Hypertension or higher

  return 0;
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

export const getBloodPressure = async (
  callback: (data: { sys: number | null; dia: number | null; date: string | null, score?: number | null }) => void
) => {
  const user = auth().currentUser;
  if (!user) {
    console.warn('User not authenticated for blood pressure.');
    callback({ sys: null, dia: null, date: null });
    return;
  }

  const options: HealthInputOptions = {
    startDate: new Date(2024, 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    ascending: false,
    limit: 1,
  };

  AppleHealthKit.getBloodPressureSamples(options, async (err: any, results: BloodPressureSampleValue[]) => {
    if (err || !results || results.length === 0) {
      console.error('Error fetching blood pressure:', err);
      callback({ sys: null, dia: null, date: null });
      return;
    }

    const latest = results[0];

    const rawSBP = latest.bloodPressureSystolicValue;
    const rawDBP = latest.bloodPressureDiastolicValue;
    const readingDate = new Date(latest.startDate);

    // Calculate BP Score
    const bpScore = calculateBpScore(rawSBP);

    const newReadingData = {
      sys: rawSBP,
      dia: rawDBP,
      score: bpScore,
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
          .doc('bloodPressure');

        await sensorDocRef.set(
          {
            data: {
              [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
            },
          },
          { merge: true },
        );

        console.log(`✅ Saved new BP reading (Score: ${bpScore}) to map key: ${dateKey}`);
      } catch (saveErr: any) {
        console.error('❌ Firestore save failed (BP):', saveErr.message);
      }
    }

    // Return the data via callback
    callback({
      sys: rawSBP,
      dia: rawDBP,
      date: latest.startDate,
      score: bpScore,
    });
  });
};