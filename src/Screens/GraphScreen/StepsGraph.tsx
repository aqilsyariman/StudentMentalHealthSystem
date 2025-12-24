/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import {LineChart} from 'react-native-chart-kit';
import {LinearGradient} from 'react-native-linear-gradient';

const screenWidth = Dimensions.get('window').width;

// Burning Theme Palette
const THEME_COLOR = '#FF4500'; // OrangeRed
const THEME_LIGHT_BG = '#FFF3E0'; // Light Orange wash
const TEXT_MAIN = '#3E2723'; // Dark Warm Brown
const TEXT_SUB = '#8D6E63'; // Muted Brown/Gray
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

// Helper to format date keys for grouping
const getDateKey = (timestamp: any) => {
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().split('T')[0]; // Returns "YYYY-MM-DD"
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

  // Sort by time ascending
  readings.sort((a, b) => {
    const timeA = a.timestamp.toDate
      ? a.timestamp.toDate().getTime()
      : new Date(a.timestamp).getTime();
    const timeB = b.timestamp.toDate
      ? b.timestamp.toDate().getTime()
      : new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  return readings; // Return ALL readings, filtering happens in UI
};

const StepsGraph = ({route}: StudentDetailProps) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [stepCounthistory, setStepCountHistory] = useState<StepsReading[]>([]);
  const [latestStepCount, setlatestStepCount] = useState<number | null>(null);
  const [latestTimestamp, setLatestTimestamp] = useState<any>(null);
  
  // Date Selector State
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

          // Extract unique dates for the selector
          const datesSet = new Set(history.map(r => getDateKey(r.timestamp)));
          // Sort dates descending (Newest first)
          const sortedDates = Array.from(datesSet).sort().reverse();
          setAvailableDates(sortedDates);
          if (sortedDates.length > 0) {
            setSelectedDate(sortedDates[0]);
          }
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

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    if (!selectedDate) return [];
    return stepCounthistory.filter(r => getDateKey(r.timestamp) === selectedDate);
  }, [stepCounthistory, selectedDate]);

  // --- Dynamic Y-Axis Logic ---
  const getChartConfigParams = () => {
    const baselineMax = 10000;
    const actualMax =
      filteredData.length > 0
        ? Math.max(...filteredData.map(r => r.value))
        : 0;

    const dynamicMax =
      actualMax > baselineMax
        ? Math.ceil(actualMax / 5000) * 5000
        : baselineMax;

    return {
      max: dynamicMax,
      segments: 4,
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

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  };

  const getChartData = () => {
    if (filteredData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{data: [0]}],
      };
    }

    const labels = filteredData.map((reading, index) => {
      // Show label for every 2nd or 3rd item to avoid clutter, or if total is small
      if (index % 2 === 0 || filteredData.length <= 6) {
        const date = reading.timestamp.toDate
          ? reading.timestamp.toDate()
          : new Date(reading.timestamp);
        // Format to Time (HH:MM) since we are inside a specific date
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return '';
    });

    return {
      labels,
      datasets: [
        {
          data: filteredData.map(reading => reading.value),
          color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`, // Burning Red Line
          strokeWidth: 3,
        },
      ],
    };
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, {backgroundColor: '#FFF5F0'}]}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>Loading Data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, {backgroundColor: '#FFF5F0'}]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF5F0', '#FFF8E1', '#FFEBEE']}
      style={styles.fullContainer}>
      <SafeAreaView style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* Profile Header */}
          <View style={[styles.card, styles.profileCardCentered]}>
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

          {/* Current Step Count Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Activity Level</Text>
              <View style={[styles.badge, {backgroundColor: '#FFF3E0'}]}>
                <Text style={[styles.badgeText, {color: THEME_COLOR}]}>Live</Text>
              </View>
            </View>
            
            <View style={styles.sensorCardContainer}>
              <View style={styles.iconContainer}>
                 <Image
                    source={require('../../Assets/burn.png')}
                    style={{width: 32, height: 32, tintColor: THEME_COLOR}}
                    resizeMode="contain"
                  />
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

          {/* Date Selector Container */}
          {availableDates.length > 0 && (
            <View style={styles.dateSelectorContainer}>
              <Text style={styles.sectionLabel}>History Logs</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateScrollContainer}>
                {availableDates.map(date => (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.datePill,
                      selectedDate === date && styles.datePillSelected,
                    ]}
                    onPress={() => setSelectedDate(date)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.datePillText,
                        selectedDate === date && styles.datePillTextSelected,
                      ]}>
                      {formatDateLabel(date)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Chart Section */}
          {filteredData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily Trend</Text>
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
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(141, 110, 99, ${opacity})`,
                    style: {borderRadius: 16},
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: THEME_COLOR,
                      fill: '#ffffff',
                    },
                    propsForBackgroundLines: {
                        strokeDasharray: '4',
                        stroke: '#FFECB3',
                    }
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                />
              </View>
              <View style={styles.chartFooter}>
                <Text style={styles.chartNote}>
                  Showing readings for {selectedDate ? formatDateLabel(selectedDate) : ''}
                </Text>
              </View>
            </View>
          )}

          {/* No Data State */}
          {filteredData.length === 0 && (
            <View style={styles.card}>
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataIcon}>🔥</Text>
                <Text style={styles.noDataText}>
                  No steps recorded for this day
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  fullContainer: {flex: 1},
  scrollContainer: {padding: 20, paddingBottom: 80},
  centerContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {marginTop: 10, fontSize: 16, color: THEME_COLOR, fontWeight: '600'},
  errorText: {fontSize: 16, color: '#D32F2F', fontWeight: '600'},
  
  // Card Styling
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: THEME_COLOR,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  
  // Profile Header
  profileCardCentered: {alignItems: 'center'},
  avatarContainer: {marginBottom: 16, borderRadius: 60},
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
    color: TEXT_MAIN,
    marginBottom: 4,
    textAlign: 'center',
  },
  studentEmail: {fontSize: 15, color: TEXT_SUB, textAlign: 'center'},

  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  cardTitle: {fontSize: 18, fontWeight: '700', color: THEME_COLOR},
  
  badge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {color: THEME_COLOR, fontSize: 12, fontWeight: '700'},

  // Date Selector Container
  dateSelectorContainer: {marginBottom: 20},
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_SUB,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateScrollContainer: {paddingVertical: 4, paddingHorizontal: 2},
  datePill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2', // Warm border
  },
  datePillSelected: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  datePillText: {fontSize: 14, fontWeight: '600', color: TEXT_SUB},
  datePillTextSelected: {color: '#FFFFFF'},

  // Sensor Data
  sensorCardContainer: {flexDirection: 'row', alignItems: 'center', gap: 20},
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_LIGHT_BG,
  },
  sensorTextContainer: {flex: 1},
  sensorValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#3E2723',
    letterSpacing: -1,
  },
  sensorUnit: {fontSize: 18, fontWeight: '600', color: TEXT_SUB},
  sensorTimestamp: {fontSize: 13, color: TEXT_SUB, marginTop: 4},

  // Chart
  chartContainer: {alignItems: 'center', marginVertical: 8},
  chart: {marginVertical: 8, borderRadius: 16},
  chartFooter: {marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FFECB3'},
  chartNote: {fontSize: 13, color: TEXT_SUB, textAlign: 'center', fontWeight: '500'},
  
  // No Data
  noDataContainer: {alignItems: 'center', paddingVertical: 32},
  noDataIcon: {fontSize: 48, marginBottom: 12},
  noDataText: {fontSize: 16, color: TEXT_MAIN, textAlign: 'center', fontWeight: '600'},
});

export default StepsGraph;