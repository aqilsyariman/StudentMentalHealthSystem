import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const getSleepData = async (
  callback: (data: {
    summary: any;
    date: string | null;
  } | null) => void,
) => {
  const user = auth().currentUser;

  if (!user) {
    console.warn('User not authenticated for sleep data.');
    callback(null);
    return;
  }

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
        const bedTime = latest.bedTime.toDate();
        const wakeTime = latest.wakeTime.toDate();

        callback({
          summary: {
            duration: latest.duration,
            bedTime: bedTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
            wakeTime: wakeTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
          },
          date: wakeTime.toISOString(),
        });
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  } catch (err) {
    console.error('Error fetching sleep data:', err);
    callback(null);
  }
};