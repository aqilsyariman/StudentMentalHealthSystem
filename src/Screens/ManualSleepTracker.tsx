/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {LineChart} from 'react-native-chart-kit';
import Svg, {Path} from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

type SleepLog = {
  bedTime: Date;
  wakeTime: Date;
  duration: number;
  timestamp: any;
};

const SleepIcon = ({size = 48}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      fill="#6366F1"
    />
  </Svg>
);

const ManualSleepTracker = ({}: any) => {
  const [bedTime, setBedTime] = useState(new Date());
  const [wakeTime, setWakeTime] = useState(new Date());
  const [showBedTimePicker, setShowBedTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [recentLogs, setRecentLogs] = useState<SleepLog[]>([]);
  const [allLogs, setAllLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [averageSleep, setAverageSleep] = useState(0);

  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;

    const fetchSleepLogs = async () => {
      try {
        const sleepDoc = await firestore()
          .collection('students')
          .doc(user.uid)
          .collection('sensorData')
          .doc('sleep')
          .get();

        if (sleepDoc.exists()) {
          const data = sleepDoc.data();
          if (data?.logs) {
            const logs = data.logs
              .map((log: any) => ({
                bedTime: log.bedTime.toDate(),
                wakeTime: log.wakeTime.toDate(),
                duration: log.duration,
                timestamp: log.timestamp,
              }))
              .sort((a: any, b: any) => b.timestamp.toDate() - a.timestamp.toDate());
            
            setAllLogs(logs);
            setRecentLogs(logs.slice(0, 5));
            
            // Calculate average
            if (logs.length > 0) {
              const avg = logs.reduce((sum: number, log: SleepLog) => sum + log.duration, 0) / logs.length;
              setAverageSleep(avg);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching sleep logs:', err);
      }
    };

    fetchSleepLogs();
  }, [user]);

  const calculateDuration = (bed: Date, wake: Date) => {
    const diff = wake.getTime() - bed.getTime();
    const hours = diff / (1000 * 60 * 60);
    return Math.max(0, hours);
  };

  const handleSaveSleep = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save sleep data.');
      return;
    }

    if (wakeTime <= bedTime) {
      Alert.alert('Invalid Time', 'Wake time must be after bed time.');
      return;
    }

    const duration = calculateDuration(bedTime, wakeTime);

    if (duration > 24) {
      Alert.alert('Invalid Duration', 'Sleep duration cannot exceed 24 hours.');
      return;
    }

    setLoading(true);

    try {
      const sleepLog = {
        bedTime: firestore.Timestamp.fromDate(bedTime),
        wakeTime: firestore.Timestamp.fromDate(wakeTime),
        duration: parseFloat(duration.toFixed(2)),
        timestamp: firestore.Timestamp.now(),
      };

      await firestore()
        .collection('students')
        .doc(user.uid)
        .collection('sensorData')
        .doc('sleep')
        .set(
          {
            logs: firestore.FieldValue.arrayUnion(sleepLog),
            latestSleep: sleepLog,
          },
          {merge: true},
        );

      Alert.alert('Success', `Sleep logged: ${duration.toFixed(1)} hours`);

      const newLog = {
        bedTime,
        wakeTime,
        duration: parseFloat(duration.toFixed(2)),
        timestamp: firestore.Timestamp.now(),
      };

      setAllLogs([newLog, ...allLogs]);
      setRecentLogs([newLog, ...recentLogs.slice(0, 4)]);

      const now = new Date();
      setBedTime(now);
      setWakeTime(now);
    } catch (err) {
      console.error('Error saving sleep log:', err);
      Alert.alert('Error', 'Failed to save sleep data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getChartData = () => {
    if (allLogs.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{data: [0]}],
      };
    }

    const last7Logs = allLogs.slice(0, 7).reverse();
    
    const labels = last7Logs.map((log) => {
      const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      return `${month}/${day}`;
    });

    const data = last7Logs.map(log => log.duration);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  };

  const getSleepQuality = (hours: number) => {
    if (hours >= 7 && hours <= 9) return { text: 'Excellent', color: '#10B981' };
    if (hours >= 6 && hours < 7) return { text: 'Good', color: '#3B82F6' };
    if (hours >= 5 && hours < 6) return { text: 'Fair', color: '#F59E0B' };
    return { text: 'Poor', color: '#EF4444' };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.mainTitle}>💤 Sleep Tracker</Text>

      {/* Sleep Stats Card */}
      {allLogs.length > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average Sleep</Text>
            <Text style={styles.statValue}>{averageSleep.toFixed(1)}h</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Logs</Text>
            <Text style={styles.statValue}>{allLogs.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Last Night</Text>
            <Text style={styles.statValue}>{allLogs[0]?.duration.toFixed(1)}h</Text>
          </View>
        </View>
      )}

      {/* Sleep Trend Chart */}
      {allLogs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sleep Trend (Last 7 Days)</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={getChartData()}
              width={screenWidth - 80}
              height={220}
              chartConfig={{
                backgroundColor: '#f0f3ff',
                backgroundGradientFrom: '#f0f3ff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '5',
                  strokeWidth: '3',
                  stroke: '#6366F1',
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
            />
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartNote}>
              📊 Recommended: 7-9 hours per night
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Log New Sleep</Text>

      {/* Bed Time Picker */}
      <View style={styles.card}>
        <Text style={styles.label}>🌙 Bed Time</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowBedTimePicker(true)}>
          <Text style={styles.timeText}>
            {formatDate(bedTime)} at {formatTime(bedTime)}
          </Text>
        </TouchableOpacity>

        {showBedTimePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={bedTime}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowBedTimePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setBedTime(selectedDate);
                }
              }}
              textColor="#1F2937"
              style={styles.picker}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowBedTimePicker(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Wake Time Picker */}
      <View style={styles.card}>
        <Text style={styles.label}>☀️ Wake Time</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowWakeTimePicker(true)}>
          <Text style={styles.timeText}>
            {formatDate(wakeTime)} at {formatTime(wakeTime)}
          </Text>
        </TouchableOpacity>

        {showWakeTimePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={wakeTime}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowWakeTimePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setWakeTime(selectedDate);
                }
              }}
              textColor="#1F2937"
              style={styles.picker}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowWakeTimePicker(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Duration Display */}
      {wakeTime > bedTime && (
        <View style={styles.durationCard}>
          <SleepIcon size={40} />
          <View style={styles.durationContent}>
            <Text style={styles.durationLabel}>Sleep Duration</Text>
            <Text style={styles.durationValue}>
              {calculateDuration(bedTime, wakeTime).toFixed(1)} hours
            </Text>
            <View style={[styles.qualityBadge, {backgroundColor: getSleepQuality(calculateDuration(bedTime, wakeTime)).color + '20'}]}>
              <Text style={[styles.qualityText, {color: getSleepQuality(calculateDuration(bedTime, wakeTime)).color}]}>
                {getSleepQuality(calculateDuration(bedTime, wakeTime)).text}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSaveSleep}
        disabled={loading}>
        <Text style={styles.saveButtonText}>
          {loading ? 'Saving...' : '💾 Save Sleep Log'}
        </Text>
      </TouchableOpacity>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Sleep Logs</Text>
          {recentLogs.map((log, index) => {
            const quality = getSleepQuality(log.duration);
            return (
              <View key={index} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>
                    {formatDate(log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp))}
                  </Text>
                  <View style={[styles.qualityBadgeSmall, {backgroundColor: quality.color + '20'}]}>
                    <Text style={[styles.qualityTextSmall, {color: quality.color}]}>
                      {quality.text}
                    </Text>
                  </View>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>🌙 Bed:</Text>
                  <Text style={styles.logTime}>{formatTime(log.bedTime)}</Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>☀️ Wake:</Text>
                  <Text style={styles.logTime}>{formatTime(log.wakeTime)}</Text>
                </View>
                <View style={[styles.logRow, styles.durationRow]}>
                  <Text style={styles.logLabel}>⏱️ Duration:</Text>
                  <Text style={styles.logDuration}>{log.duration.toFixed(1)}h</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f3ff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366F1',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 16,
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
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  timeButton: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  pickerContainer: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  picker: {
    height: 200,
    width: '100%',
  },
  doneButton: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  durationCard: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  durationContent: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  recentSection: {
    marginTop: 10,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  qualityBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  qualityTextSmall: {
    fontSize: 11,
    fontWeight: '700',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 0,
  },
  logLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  logTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  logDuration: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
  },
});

export default ManualSleepTracker;