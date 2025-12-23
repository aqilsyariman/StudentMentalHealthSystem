/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, {Path} from 'react-native-svg';

// --- ICONS (Styled to match new UI) ---
const HeartIcon = ({size = 32, color = '#FF6F61'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Svg>
);

const StepIcon = ({size = 32, color = '#6f5be1'}) => (
  <Svg width={size} height={size} viewBox="0 0 640 512" fill={color}>
    <Path d="M192 160h32V32h-32c-35.35 0-64 28.65-64 64s28.65 64 64 64zM0 416c0 35.35 28.65 64 64 64h32V352H64c-35.35 0-64 28.65-64 64zm337.46-128c-34.91 0-76.16 13.12-104.73 32-24.79 16.38-44.52 32-104.73 32v128l57.53 15.97c26.21 7.28 53.01 13.12 80.31 15.05 32.69 2.31 65.6.67 97.58-6.2C472.9 481.3 512 429.22 512 384c0-64-84.18-96-174.54-96zM491.42 7.19C459.44.32 426.53-1.33 393.84.99c-27.3 1.93-54.1 7.77-80.31 15.04L256 32v128c60.2 0 79.94 15.62 104.73 32 28.57 18.88 69.82 32 104.73 32C555.82 224 640 192 640 128c0-45.22-39.1-97.3-148.58-120.81z" />
  </Svg>
);

const BmiIcon = ({size = 32, color = '#10B981'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 12h-2v-6h2v6zm0-8h-2V5h2v2z" />
  </Svg>
);

const TrashIcon = ({color = '#FFFFFF', size = 20}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </Svg>
);

// --- TYPES & HELPERS ---
type Student = {
  fullName: string;
  email: string;
  avatar?: string;
  status?: string;
  counselorId?: string;
};

type SensorData = {
  heartRate: number | null;
  stepCount: number | null;
  weight: number | null;
  height: number | null;
  heartRateTimestamp: any;
  stepCountTimestamp: any;
};

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

const StudentDetail = ({route, navigation}: any) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {studentId} = route.params;

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
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
        const weightRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('BMIdata')
          .doc('bodyMetrics')
          .get();

        const [heartRateDoc, stepCountDoc, weightDoc] = await Promise.all([
          heartRateRef,
          stepCountRef,
          weightRef,
        ]);

        const latestHeartRate = getLatestSensorValue(heartRateDoc);
        const latestStepCount = getLatestSensorValue(stepCountDoc);
        const latestWeight = getLatestSensorValue(weightDoc);

        setSensorData({
          heartRate: latestHeartRate?.value || null,
          heartRateTimestamp: latestHeartRate?.timestamp || null,
          stepCount: latestStepCount?.value || null,
          stepCountTimestamp: latestStepCount?.timestamp || null,
          weight: latestWeight?.weight || null,
          height: latestWeight?.height || null,
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

  const handleRemoveStudent = () => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${student?.fullName} from your assigned students?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await firestore()
                .collection('students')
                .doc(studentId)
                .update({counselorId: firestore.FieldValue.delete()});
              Alert.alert(
                'Success',
                'Student has been removed from your assignments.',
                [{text: 'OK', onPress: () => navigation.goBack()}],
              );
            } catch (err) {
              console.error('Error removing student: ', err);
              Alert.alert(
                'Error',
                'Failed to remove student. Please try again.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        });
      }
      return 'No recent data';
    }
    return timestamp.toDate().toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#FF6F61" />
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

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F2F5" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* --- Profile Header --- */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              style={styles.avatar}
              source={{
                uri:
                  student?.avatar ||
                  `https://i.pravatar.cc/150?u=${student?.email}`,
              }}
            />
          </View>
          <Text style={styles.studentName}>{student?.fullName}</Text>
          <Text style={styles.studentEmail}>{student?.email}</Text>
        </View>

        <Text style={styles.sectionTitle}>Live Sensor Data</Text>

        {/* --- Heart Rate Card (Red Theme) --- */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('HeartRateGraph', {studentId})}
          style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, {color: '#FF6F61'}]}>
              Heart Rate
            </Text>
            <Text style={styles.tapLabel}>Tap for history ›</Text>
          </View>

          <View style={styles.sensorCardContainer}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: '#FF6F61' + '15'},
              ]}>
              <HeartIcon size={42} color="#FF6F61" />
            </View>
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {sensorData?.heartRate || '--'}
                <Text style={styles.sensorUnit}> BPM</Text>
              </Text>
              <Text style={styles.sensorTimestamp}>
                Updated: {formatTimestamp(sensorData?.heartRateTimestamp)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* --- Steps Card (Purple Theme) --- */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('StepsGraph', {studentId})}
          style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, {color: '#6f5be1'}]}>Activity</Text>
            <Text style={styles.tapLabel}>Tap for history ›</Text>
          </View>

          <View style={styles.sensorCardContainer}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: '#6f5be1' + '15'},
              ]}>
              <StepIcon size={42} color="#6f5be1" />
            </View>
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {sensorData?.stepCount || '--'}
                <Text style={styles.sensorUnit}> Steps</Text>
              </Text>
              <Text style={styles.sensorTimestamp}>
                Updated: {formatTimestamp(sensorData?.stepCountTimestamp)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* --- BMI Card (Green Theme) --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, {color: '#10B981'}]}>
              Body Metrics
            </Text>
          </View>

          <View style={styles.sensorCardContainer}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: '#10B981' + '15'},
              ]}>
              <BmiIcon size={42} color="#10B981" />
            </View>
            <View style={styles.sensorTextContainer}>
              <View style={styles.bmiRow}>
                <Text style={styles.sensorUnitSmall}>Height</Text>
                <Text style={styles.sensorValueSmall}>
                  {sensorData?.height || '--'} cm
                </Text>
              </View>
              <View style={styles.bmiRow}>
                <Text style={styles.sensorUnitSmall}>Weight</Text>
                <Text style={styles.sensorValueSmall}>
                  {sensorData?.weight || '--'} kg
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Delete Button --- */}
        {student?.counselorId && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleRemoveStudent}
            disabled={deleting}
            activeOpacity={0.8}>
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <TrashIcon color="#FFFFFF" size={20} />
                <Text style={styles.deleteButtonText}>Remove Student</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// --- STYLES (Matching HeartRateGraph UI) ---
const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Neutral background to let cards pop
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF6F61',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6F61',
    fontWeight: '600',
  },
  // --- Profile Header ---
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  studentName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 8,
  },
  // --- Cards ---
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tapLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sensorCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconContainer: {
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensorTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sensorValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -1,
  },
  sensorUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sensorTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  // --- BMI Specific ---
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 6,
  },
  sensorValueSmall: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
  },
  sensorUnitSmall: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  // --- Delete Button ---
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default StudentDetail;