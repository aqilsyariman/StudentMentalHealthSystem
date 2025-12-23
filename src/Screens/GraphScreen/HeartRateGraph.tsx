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
  TouchableOpacity,
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

type HeartRateReading = {
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

const getAllHeartRateReadings = (sensorDoc: any): HeartRateReading[] => {
  const readings: HeartRateReading[] = [];

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

  return readings;
};

const HeartIcon = ({size = 50}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      fill="#FF6F61"
    />
  </Svg>
);

const HeartRateGraph = ({route}: StudentDetailProps) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [allHeartRateReadings, setAllHeartRateReadings] = useState<HeartRateReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<HeartRateReading[]>([]);
  const [latestHeartRate, setLatestHeartRate] = useState<number | null>(null);
  const [latestTimestamp, setLatestTimestamp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

        const heartRateDoc = await firestore()
          .collection('students')
          .doc(studentId)
          .collection('sensorData')
          .doc('heartRate')
          .get();

        const allReadings = getAllHeartRateReadings(heartRateDoc);
        setAllHeartRateReadings(allReadings);

        // Extract unique dates
        const dates = new Set<string>();
        allReadings.forEach(reading => {
          const date = reading.timestamp.toDate ? reading.timestamp.toDate() : new Date(reading.timestamp);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          dates.add(dateStr);
        });
        const sortedDates = Array.from(dates).sort().reverse();
        setAvailableDates(sortedDates);

        // Set initial selected date to most recent
        if (sortedDates.length > 0) {
          setSelectedDate(sortedDates[0]);
        }

        // Set latest reading
        if (allReadings.length > 0) {
          const latest = allReadings[allReadings.length - 1];
          setLatestHeartRate(latest.value);
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

  useEffect(() => {
    if (selectedDate && allHeartRateReadings.length > 0) {
      const filtered = allHeartRateReadings.filter(reading => {
        const date = reading.timestamp.toDate ? reading.timestamp.toDate() : new Date(reading.timestamp);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return dateStr === selectedDate;
      });
      setFilteredReadings(filtered);
    }
  }, [selectedDate, allHeartRateReadings]);

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

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const getChartData = () => {
    if (filteredReadings.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{data: [0]}],
      };
    }

    const labels = filteredReadings.map((reading, index) => {
      // Show every other label or all if less than 6 readings
      if (index % 2 === 0 || filteredReadings.length <= 6) {
        const date = reading.timestamp.toDate ? reading.timestamp.toDate() : new Date(reading.timestamp);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      return '';
    });

    const data = filteredReadings.map(reading => reading.value);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(255, 111, 97, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  };

  const getHeartRateStatus = (bpm: number | null) => {
    if (!bpm) return { text: 'Waiting', color: '#999' };
    if (bpm < 60) return { text: 'Low', color: '#2196F3' };
    if (bpm >= 60 && bpm <= 100) return { text: 'Normal', color: '#4CAF50' };
    return { text: 'High', color: '#FF9800' };
  };

  const status = getHeartRateStatus(latestHeartRate);

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#FF6F61" />
        <Text style={styles.loadingText}>Loading Heart Rate Data...</Text>
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

        {/* Current Heart Rate Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Heart Rate</Text>
            <View style={[styles.badge, {backgroundColor: status.color + '20'}]}>
              <Text style={[styles.badgeText, {color: status.color}]}>
                {status.text}
              </Text>
            </View>
          </View>
          <View style={styles.sensorCardContainer}>
            <View style={styles.iconContainer}>
              <HeartIcon size={48} />
            </View>
            <View style={styles.sensorTextContainer}>
              <Text style={styles.sensorValue}>
                {latestHeartRate || '--'}
                <Text style={styles.sensorUnit}> BPM</Text>
              </Text>
              <Text style={styles.sensorTimestamp}>
                Last update: {formatTimestamp(latestTimestamp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Date Selector - iOS Style Pills */}
        {availableDates.length > 0 && (
          <View style={styles.dateSelectorContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContainer}
            >
              {availableDates.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.datePill,
                    selectedDate === date && styles.datePillSelected,
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      selectedDate === date && styles.datePillTextSelected,
                    ]}
                  >
                    {formatDateLabel(date)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Heart Rate History Graph */}
        {filteredReadings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Heart Rate Trends</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={getChartData()}
                width={screenWidth - 80}
                height={240}
                chartConfig={{
                  backgroundColor: '#fff5f5',
                  backgroundGradientFrom: '#fff5f5',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 111, 97, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '3',
                    stroke: '#FF6F61',
                    fill: '#ffffff',
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#e0e0e0',
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
                🕐 Showing {filteredReadings.length} readings for {formatDateLabel(selectedDate!)}
              </Text>
              <Text style={styles.chartSubNote}>
                Times displayed in 24-hour format
              </Text>
            </View>
          </View>
        )}

        {filteredReadings.length === 0 && selectedDate && (
          <View style={styles.card}>
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>💓</Text>
              <Text style={styles.noDataText}>No readings for {formatDateLabel(selectedDate)}</Text>
              <Text style={styles.noDataSubText}>Try selecting a different date</Text>
            </View>
          </View>
        )}

        {availableDates.length === 0 && (
          <View style={styles.card}>
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>💓</Text>
              <Text style={styles.noDataText}>No heart rate history available</Text>
              <Text style={styles.noDataSubText}>Data will appear once readings are recorded</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {flex: 1, backgroundColor: '#fff0f0'},
  scrollContainer: {padding: 20, paddingBottom: 80},
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#FF6F61',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarContainer: {
    shadowColor: '#FF6F61',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff0f0',
  },
  studentName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 15,
    color: '#888',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#FF6F61',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6F61',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sensorCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconContainer: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 16,
  },
  sensorTextContainer: {
    flex: 1,
  },
  sensorValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -1,
  },
  sensorUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  sensorTimestamp: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
  dateSelectorContainer: {
    marginBottom: 20,
  },
  dateScrollContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  datePill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  datePillSelected: {
    backgroundColor: '#FF6F61',
    shadowColor: '#FF6F61',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  datePillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  datePillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  chartNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  chartSubNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
  },
});

export default HeartRateGraph;