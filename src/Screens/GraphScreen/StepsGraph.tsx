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
import {LineChart} from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// Burning Theme Palette
const FIRE_RED = '#FF4500'; // OrangeRed
const FIRE_ORANGE = '#FF8C00'; // DarkOrange
const FIRE_GOLD = '#FFD700'; // Gold
const SOFT_BURN = '#FFF5F0'; // Very light wash

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
    const timeA = a.timestamp.toDate
      ? a.timestamp.toDate().getTime()
      : new Date(a.timestamp).getTime();
    const timeB = b.timestamp.toDate
      ? b.timestamp.toDate().getTime()
      : new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  return readings.slice(-10);
};

const StepIcon = ({size = 32}) => (
  <View style={{width: size, height: size}}>
    <Image
      source={require('../../Assets/burn.png')}
      style={{width: size, height: size}}
      resizeMode="contain"
    />
  </View>
);

// Component name starts with Capital Letter
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

  // --- Dynamic Y-Axis Logic ---
  const getChartConfigParams = () => {
    const baselineMax = 20000;
    const actualMax =
      stepCounthistory.length > 0
        ? Math.max(...stepCounthistory.map(r => r.value))
        : 0;

    // Scale to nearest 5000 if user exceeds 20k, otherwise use 20k
    const dynamicMax =
      actualMax > baselineMax
        ? Math.ceil(actualMax / 5000) * 5000
        : baselineMax;

    return {
      max: dynamicMax,
      segments: dynamicMax / 5000,
    };
  };

  const chartParams = getChartConfigParams();

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
      if (index % 2 === 0 || stepCounthistory.length <= 5) {
        const date = reading.timestamp.toDate
          ? reading.timestamp.toDate()
          : new Date(reading.timestamp);
        const month = (date.getMonth() + 1).toString();
        const day = date.getDate().toString();
        return `${month}/${day}`;
      }
      return '';
    });

    return {
      labels,
      datasets: [
        {
          data: stepCounthistory.map(reading => reading.value),
          color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color={FIRE_RED} />
        <Text style={styles.loadingText}>Loading Step Count Data...</Text>
      </View>
    );
  }

  // ESLint Fix: Using 'error' variable in the JSX
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
        {/* Profile Header */}
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

        <Text style={styles.sectionTitle}>Step Count Monitor</Text>

        {/* Current Step Count Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Step Count</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Live</Text>
            </View>
          </View>
          <View style={styles.sensorCardContainer}>
            <View style={styles.iconContainer}>
              <StepIcon size={48} />
            </View>
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {latestStepCount || '--'}
                <Text style={styles.sensorUnit}> steps</Text>
              </Text>
              <Text style={styles.sensorTimestamp}>
                Last update: {formatTimestamp(latestTimestamp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Chart Section */}
        {stepCounthistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step Count Trends</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={getChartData()}
                width={screenWidth - 80}
                height={240}
                fromZero={true}
                fromNumber={chartParams.max}
                segments={chartParams.segments}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#fff8f0',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(139, 0, 0, ${opacity})`,
                  style: {borderRadius: 16},
                  propsForDots: {
                    r: '5',
                    strokeWidth: '3',
                    stroke: FIRE_ORANGE,
                    fill: FIRE_GOLD,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#fce4ec',
                    strokeWidth: 1,
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
            <View style={styles.chartFooter}>
              <Text style={styles.chartNote}>
                📅 Showing last {stepCounthistory.length} readings
              </Text>
              <Text style={styles.chartSubNote}>Dates displayed as MM/DD</Text>
            </View>
          </View>
        )}

        {stepCounthistory.length === 0 && (
          <View style={styles.card}>
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>🔥</Text>
              <Text style={styles.noDataText}>
                No step count history available
              </Text>
              <Text style={styles.noDataSubText}>
                Data will appear once readings are recorded
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {flex: 1, backgroundColor: SOFT_BURN},
  scrollContainer: {padding: 20, paddingBottom: 80},
  centerContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: FIRE_RED,
    fontWeight: '600',
  },
  errorText: {fontSize: 16, color: '#D32F2F', fontWeight: '600'},
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 5,
  },
  avatarContainer: {borderRadius: 60, marginBottom: 16},
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: SOFT_BURN,
  },
  studentName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#3e2723',
    marginBottom: 4,
  },
  studentEmail: {fontSize: 15, color: '#795548'},
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3e2723',
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {fontSize: 18, fontWeight: '700', color: FIRE_RED},
  badge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {color: FIRE_ORANGE, fontSize: 12, fontWeight: '700'},
  sensorCardContainer: {flexDirection: 'row', alignItems: 'center', gap: 20},
  iconContainer: {backgroundColor: '#fff3e0', padding: 16, borderRadius: 16},
  sensorTextContainer: {flex: 1},
  sensorValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#212121',
    letterSpacing: -1,
  },
  sensorUnit: {fontSize: 18, fontWeight: '600', color: '#757575'},
  sensorTimestamp: {fontSize: 13, color: '#9e9e9e', marginTop: 6},
  chartContainer: {alignItems: 'center', marginVertical: 8},
  chart: {marginVertical: 8, borderRadius: 16},
  chartFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fbe9e7',
  },
  chartNote: {
    fontSize: 13,
    color: '#5d4037',
    textAlign: 'center',
    fontWeight: '600',
  },
  chartSubNote: {
    fontSize: 11,
    color: '#8d6e63',
    textAlign: 'center',
    marginTop: 4,
  },
  noDataContainer: {alignItems: 'center', paddingVertical: 32},
  noDataIcon: {fontSize: 48, marginBottom: 12},
  noDataText: {
    fontSize: 16,
    color: '#5d4037',
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubText: {
    fontSize: 13,
    color: '#8d6e63',
    textAlign: 'center',
    marginTop: 6,
  },
});

export default StepsGraph;
