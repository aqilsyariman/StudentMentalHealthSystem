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

// Get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDailyStepCount = (
  callback: (data: { value: number | null; date: string | null, score?: number | null }) => void,
) => {
  const user = auth().currentUser;
  if (!user) {
    console.warn('User not authenticated for step count.');
    callback({ value: null, date: null, score: null });
    return;
  }

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const options: HealthInputOptions = {
    startDate: oneYearAgo.toISOString(),
    endDate: now.toISOString(),
    ascending: false, // Most recent first
  };

  console.log('📅 Fetching step data from last year...');

  AppleHealthKit.getDailyStepCountSamples(
    options,
    async (err: any, results: HealthValue[]) => {
      if (err || !results || results.length === 0) {
        console.error('❌ Error fetching step count:', err);
        callback({ value: null, date: null, score: null });
        return;
      }

      console.log(`📊 Found ${results.length} step samples`);

      // ✅ Group samples by date and sum steps + track latest timestamp per day
      const stepsByDate: { 
        [key: string]: { 
          total: number; 
          latestTimestamp: Date;
        } 
      } = {};

      results.forEach((sample) => {
        // Use the endDate from the sample (which is what HealthKit uses to define the day)
        const sampleEndDate = new Date(sample.endDate || sample.startDate);
        
        // Use local timezone for date key
        const dateKey = getLocalDateString(sampleEndDate);

        if (!stepsByDate[dateKey]) {
          stepsByDate[dateKey] = { 
            total: 0, 
            latestTimestamp: sampleEndDate 
          };
        }

        // Sum the steps
        stepsByDate[dateKey].total += sample.value;

        // Keep track of the latest (most recent) timestamp for this day
        if (sampleEndDate > stepsByDate[dateKey].latestTimestamp) {
          stepsByDate[dateKey].latestTimestamp = sampleEndDate;
        }
      });

      // ✅ Find the most recent day with any recorded steps.
      const sortedDates = Object.keys(stepsByDate).sort().reverse(); 
      
      let selectedDate: string | null = null;
      let totalSteps = 0;
      let latestTimestamp: Date | null = null;

      // Select the VERY first (most recent) day key found.
      for (const dateKey of sortedDates) {
        selectedDate = dateKey;
        totalSteps = Math.round(stepsByDate[dateKey].total);
        latestTimestamp = stepsByDate[dateKey].latestTimestamp;
        
        console.log(`✅ Selected most recent day: ${dateKey} with ${totalSteps} total steps`);
        console.log(`   Last recorded at: ${latestTimestamp.toLocaleString()}`);
        break; // Stop immediately after selecting the most recent day
      }

      if (!selectedDate || !latestTimestamp) {
        console.warn('⚠️ No step data found in last year');
        callback({ value: null, date: null, score: null });
        return;
      }

      const stepCountScore = calculateStepCountScore(totalSteps);

      // ✅ Save to Firestore with duplicate prevention
      if (SAVE_TO_FIRESTORE) {
        try {
          const sensorDocRef = firestore()
            .collection('students')
            .doc(user.uid)
            .collection('sensorData')
            .doc('stepCount');

          const doc = await sensorDocRef.get();
          const existingData = doc.data();

          let existingTimestamp = null;
          let shouldUpdate = true;

          if (existingData?.data?.[selectedDate]) {
            const dayData = existingData.data[selectedDate];
            const lastReading = dayData[dayData.length - 1];
            
            if (lastReading?.value === totalSteps) {
              console.log('⏭️ Same step count for this day, using existing timestamp');
              shouldUpdate = false;
              existingTimestamp = lastReading.timestamp;
            }
          }

          // Use the existing timestamp if found, otherwise create a new one from the latest HealthKit timestamp.
          const timestampToUse = existingTimestamp || firestore.Timestamp.fromDate(latestTimestamp);
          
          const readingData = {
            value: totalSteps,
            score: stepCountScore,
            timestamp: timestampToUse,
          };

          if (shouldUpdate) {
            await sensorDocRef.set(
              {
                data: {
                  [selectedDate]: [readingData],
                },
              },
              { merge: true }
            );

            console.log(`✅ Saved step count: ${totalSteps} steps (Score: ${stepCountScore}) for ${selectedDate}`);
          }

          // Return with the correct timestamp
          const displayDate = existingTimestamp 
            ? existingTimestamp.toDate().toISOString() 
            : latestTimestamp.toISOString();
          
          callback({
            value: totalSteps,
            date: displayDate,
            score: stepCountScore,
          });

        } catch (saveErr: any) {
          console.error('❌ Firestore save failed:', saveErr.message);
          
          callback({
            value: totalSteps,
            date: latestTimestamp.toISOString(),
            score: stepCountScore,
          });
        }
      } else {
        callback({
          value: totalSteps,
          date: latestTimestamp.toISOString(),
          score: stepCountScore,
        });
      }
    }
  );
};