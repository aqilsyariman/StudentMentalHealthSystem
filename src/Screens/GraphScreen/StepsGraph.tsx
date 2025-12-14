/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, {Path} from 'react-native-svg';
import {LineChart} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type Student = {
  fullName: string;
  email: string;
  avatar?: string;
};

type StepsReading = {
  value: number;
  timestamp: any;
};

type StudentDetailProps = {
  route: {
    params: {
      studentId: string;
    };
  };
  navigation: any;
};

const getAllStepsReadings = (sensorDoc: any): StepsReading[] => {
  const readings: StepsReading[] = [];

  if (sensorDoc.exists()) {
    const docData = sensorDoc.data();
    if (docData && docData.data) {
      const data = docData.data;
      const dateKeys = Object.keys(data).sort();

      dateKeys.forEach(dateKey => {
        const readingsArray = data[dateKey];
        if (readingsArray && Array.isArray(readingsArray)) {
          readingsArray.forEach(reading => {
            if (reading.value && reading.timestamp) {
              readings.push({
                value: reading.value,
                timestamp: reading.timestamp,
              });
            }
          });
        }
      });
    }
  }

  readings.sort((a, b) => {
    const timeA = a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
    const timeB = b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  return readings.slice(-10);
};

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

const StepsGraph = ({route}: StudentDetailProps) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [stepCounthistory, setStepCountHistory] = useState<StepsReading[]>([]);
  const [latestStepCount, setlatestStepCount] = useState<number | null>(null);
  const [latestTimestamp, setLatestTimestamp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const stepCountDoc = await firestore()
          .collection('students')
          .doc(studentId)
          .collection('sensorData')
          .doc('stepCount')
          .get();

        const history = getAllStepsReadings(stepCountDoc);
        setStepCountHistory(history);

        if (history.length > 0) {
          const latest = history[history.length - 1];
          setlatestStepCount(latest.value);
          setLatestTimestamp(latest.timestamp);
        }
      } catch (err) {
        console.error('Error fetching data: ', err);
        setError('Failed to load student data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [studentId]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString();
      }
      return 'No recent data';
    }
    return timestamp.toDate().toLocaleString();
  };

  const getChartData = () => {
    if (stepCounthistory.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{data: [0]}],
      };
    }

    const labels = stepCounthistory.map((reading, index) => {
      if (index % 2 === 0) {
        const date = reading.timestamp.toDate ? reading.timestamp.toDate() : new Date(reading.timestamp);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      return '';
    });

    const data = stepCounthistory.map(reading => reading.value);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(255, 111, 97, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#6f5be1ff" />
        <Text style={styles.loadingText}>Loading Step Count Data...</Text>
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Header Card */}
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

        <Text style={styles.sectionTitle}> Step Count Monitor</Text>

        {/* Current Heart Rate Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Step Count</Text>
          <View style={styles.sensorCardContainer}>
            <StepIcon />
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {latestStepCount || '--'}
                <Text style={styles.sensorUnit}> BPM</Text>
              </Text>
              <Text style={styles.sensorTimestamp}>
                Last update: {formatTimestamp(latestTimestamp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Heart Rate History Graph */}
        {stepCounthistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step Count History</Text>
            <LineChart
              data={getChartData()}
              width={screenWidth - 80}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(111, 91, 225, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#FF6F61',
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
            <Text style={styles.chartNote}>
              Showing last {stepCounthistory.length} readings
            </Text>
          </View>
        )}

        {stepCounthistory.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.noDataText}>No step count history available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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
  chartNote: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
});

export default StepsGraph;
