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

// --- Helper function to get the date string ---
const getLocalDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
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

    // === NEW CALCULATION ===
    const bpScore = calculateBpScore(rawSBP);
    // =======================

    const newReadingData = {
      sys: rawSBP,
      dia: rawDBP,
      score: bpScore,
      timestamp: firestore.Timestamp.fromDate(readingDate),
    };

    const dateKey = getLocalDateString(readingDate);

    // --- ✅ Save to Firestore ---
    if (SAVE_TO_FIRESTORE) {
      try {
        // Get reference, change 'heartRate' to 'bloodPressure'
        const sensorDocRef = firestore()
          .collection('students')
          .doc(user.uid)
          .collection('sensorData')
          .doc('bloodPressure'); // <-- New document path

        // Set logic is identical to your other service functions
        await sensorDocRef.set(
          {
            data: {
              [dateKey]: firestore.FieldValue.arrayUnion(newReadingData),
            },
          },
          { merge: true }, // This is essential
        );

        console.log(`✅ Saved new BP reading (Score: ${bpScore}) to map key: ${dateKey}`);
      } catch (saveErr: any) {
        console.error('❌ Firestore save failed (BP):', saveErr.message);
      }
    }
    // --- End of Firestore Save ---

    // Return the data, including the new score, via the callback
    callback({
      sys: rawSBP,
      dia: rawDBP,
      date: latest.startDate,
      score: bpScore, // Return the score
    });
  });
};
