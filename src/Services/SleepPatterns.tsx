import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
export const getSleepData = async (callback: Function) => {
  const user = auth().currentUser;
  if (!user) return;

  try {
    const sleepDoc = await firestore()
      .collection('students')
      .doc(user.uid)
      .collection('sensorData')
      .doc('sleep')
      .get();

    if (sleepDoc.exists()) {
      const data = sleepDoc.data();
      if (data?.latestSleep) {
        const latest = data.latestSleep;
        callback({
          summary: {
            duration: latest.duration.toFixed(1),
            bedTime: latest.bedTime.toDate().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            }),
            wakeTime: latest.wakeTime.toDate().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            }),
          },
          date: latest.timestamp.toDate().toISOString(),
          score: latest.score // Add this line
        });
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  } catch (error) {
    console.error('Error fetching sleep data:', error);
    callback(null);
  }
};