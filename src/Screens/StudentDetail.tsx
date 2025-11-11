import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, {Path} from 'react-native-svg';

// --- HeartIcon (Unchanged) ---
const HeartIcon = ({color = '#FF6F61', size = 32}) => (
  <View style={{width: size, height: size}}>
    <Svg viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
  </View>
);

// --- StepIcon (Unchanged) ---
const StepIcon = ({color = '#6f5be1ff', size = 32}) => (
  <View style={{width: size, height: size}}>
    <Svg viewBox="0 0 640 512" fill="none">
      <Path
        d="M192 160h32V32h-32c-35.35 0-64 28.65-64 64s28.65 64 64 64zM0 416c0 35.35 28.65 64 64 64h32V352H64c-35.35 0-64 28.65-64 64zm337.46-128c-34.91 0-76.16 13.12-104.73 32-24.79 16.38-44.52 32-104.73 32v128l57.53 15.97c26.21 7.28 53.01 13.12 80.31 15.05 32.69 2.31 65.6.67 97.58-6.2C472.9 481.3 512 429.22 512 384c0-64-84.18-96-174.54-96zM491.42 7.19C459.44.32 426.53-1.33 393.84.99c-27.3 1.93-54.1 7.77-80.31 15.04L256 32v128c60.2 0 79.94 15.62 104.73 32 28.57 18.88 69.82 32 104.73 32C555.82 224 640 192 640 128c0-45.22-39.1-97.3-148.58-120.81z"
        fill={color}
      />
    </Svg>
  </View>
);

// --- Student type (Unchanged) ---
type Student = {
  fullName: string;
  email: string;
  avatar?: string;
  status?: string;
};

// --- ✅ CHANGE 1: Update SensorData type ---
type SensorData = {
  heartRate: number | null;
  stepCount: number | null;
  weight: number | null;
  heartRateTimestamp: any; // <-- New
  stepCountTimestamp: any; // <-- New
};

type StudentDetailProps = {
  route: {
    params: {
      studentId: string;
    };
  };
  navigation: any;
};

// --- getLatestSensorValue helper (Unchanged) ---
const getLatestSensorValue = (sensorDoc: any) => {
  if (sensorDoc.exists()) {
    const docData = sensorDoc.data();
    if (docData && docData.data) {
      const data = docData.data;
      const dateKeys = Object.keys(data);
      if (dateKeys.length === 0) return null;
      dateKeys.sort().reverse();
      const latestDateKey = dateKeys[0];
      const readingsArray = data[latestDateKey];
      if (readingsArray && readingsArray.length > 0) {
        return readingsArray[readingsArray.length - 1];
      }
    }
  }
  return null;
};

const StudentDetail = ({route}: StudentDetailProps) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {studentId} = route.params;

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // --- 1. Fetch Student Profile ---
        const studentDoc = await firestore()
          .collection('students')
          .doc(studentId)
          .get();
        if (!studentDoc.exists) {
          setError('Student not found.');
          setLoading(false);
          return;
        }
        setStudent(studentDoc.data() as Student);

        // --- 2. Fetch Sensor Data in Parallel ---
        const heartRateRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('sensorData')
          .doc('heartRate')
          .get();
        const stepCountRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('sensorData')
          .doc('stepCount')
          .get();
        
        // --- ✅ FIX #1 ---
        const weightRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('BMIdata')
          .doc('bodyMetrics') // Or .doc('bmi') if you changed it
          .get(); // <-- REMOVED 'weight'

        // Wait for all fetches
        const [heartRateDoc, stepCountDoc, weightDoc] = await Promise.all([
          heartRateRef,
          stepCountRef,
          weightRef
        ]);

        // --- 3. Process the results ---
        const latestHeartRate = getLatestSensorValue(heartRateDoc);
        const latestStepCount = getLatestSensorValue(stepCountDoc);
        const latestWeight = getLatestSensorValue(weightDoc); // This will be { weight: 70, ... }

        // --- ✅ FIX #2 ---
        setSensorData({
          heartRate: latestHeartRate?.value || null,
          heartRateTimestamp: latestHeartRate?.timestamp || null, 
          stepCount: latestStepCount?.value || null,
          stepCountTimestamp: latestStepCount?.timestamp || null,
          weight: latestWeight?.weight || null, // <-- CHANGED from .value to .weight
        });

      } catch (err) {
        console.error('Error fetching data: ', err);
        setError('Failed to load student data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [studentId]);

  // --- formatTimestamp helper (Unchanged) ---
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString();
      }
      return 'No recent data';
    }
    return timestamp.toDate().toLocaleString();
  };

  // --- Loading and Error UI (Unchanged) ---
  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#6f5be1ff" />
        <Text style={styles.loadingText}>Loading Student Details...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // --- Main UI ---
  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* --- Profile Header Card (Unchanged) --- */}
        <View style={styles.profileHeader}>
          <Image
            style={styles.avatar}
            source={{
              uri:
                student?.avatar ||
                `https://i.pravatar.cc/150?u=${student?.email}`,
            }}
          />
          <Text style={styles.studentName}>{student?.fullName}</Text>
          <Text style={styles.studentEmail}>{student?.email}</Text>
        </View>

        {/* --- Heart Rate Card --- */}
        <Text style={styles.sectionTitle}>Live Sensor Data</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Heart Rate</Text>
          <View style={styles.sensorCardContainer}>
            <HeartIcon />
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {sensorData?.heartRate || '--'}
                <Text style={styles.sensorUnit}> BPM</Text>
              </Text>
              {/* --- ✅ CHANGE 3a: Use heartRateTimestamp --- */}
              <Text style={styles.sensorTimestamp}>
                Last update: {formatTimestamp(sensorData?.heartRateTimestamp)}
              </Text>
            </View>
          </View>
        </View>

        {/* --- Stress Level Card (Unchanged) --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stress Level</Text>
          <Text style={styles.valueText}>{sensorData?.weight || '--'}</Text>
        </View>

        {/* --- Activity Card --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity</Text>
          <View style={styles.sensorCardContainer}>
            <StepIcon />
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {sensorData?.stepCount || '--'}
                <Text style={styles.sensorUnit}> Steps</Text>
              </Text>
              {/* --- ✅ CHANGE 3b: Use stepCountTimestamp --- */}
              <Text style={styles.sensorTimestamp}>
                Last update: {formatTimestamp(sensorData?.stepCountTimestamp)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// --- Styles (Unchanged) ---
const styles = StyleSheet.create({
  fullContainer: {flex: 1, backgroundColor: '#d3dbf5ff'},
  scrollContainer: {padding: 20, paddingBottom: 80},
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6F61',
  },
  backButton: {
    marginTop: 50,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6f5be1ff',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  studentName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  studentEmail: {
    fontSize: 16,
    color: '#777',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  sensorCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  sensorTextContainer: {
    flex: 1,
  },
  sensorValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#333',
  },
  sensorUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
  },
  sensorTimestamp: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6f5be1ff',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 25,
    letterSpacing: 1,
  },
  welcomeUser: {
    fontSize: 35,
    color: '#482ce7ff',
    fontWeight: '800',
    marginTop: 100,
    textAlign: 'left',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#7B68EE',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#6f5be1ff',
  },
  valueText: {
    fontSize: 18,
    color: '#4A4A4A',
    marginBottom: 6,
  },
});

export default StudentDetail;