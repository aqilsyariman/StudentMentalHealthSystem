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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type SleepLog = {
  bedTime: Date;
  wakeTime: Date;
  duration: number; // in hours
  timestamp: any;
};

const ManualSleepTracker = ({}: any) => {
  const [bedTime, setBedTime] = useState(new Date());
  const [wakeTime, setWakeTime] = useState(new Date());
  const [showBedTimePicker, setShowBedTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [recentLogs, setRecentLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(false);

  const user = auth().currentUser;

  // Fetch recent sleep logs
  useEffect(() => {
    if (!user) return;

    const fetchRecentLogs = async () => {
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
              .sort((a: any, b: any) => b.timestamp.toDate() - a.timestamp.toDate())
              .slice(0, 5); // Get last 5 logs
            setRecentLogs(logs);
          }
        }
      } catch (err) {
        console.error('Error fetching sleep logs:', err);
      }
    };

    fetchRecentLogs();
  }, [user]);

  const calculateDuration = (bed: Date, wake: Date) => {
    const diff = wake.getTime() - bed.getTime();
    const hours = diff / (1000 * 60 * 60);
    return Math.max(0, hours); // Ensure non-negative
  };

  const handleSaveSleep = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save sleep data.');
      return;
    }

    // Validation
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

      // Refresh logs
      setRecentLogs([
        {
          bedTime,
          wakeTime,
          duration: parseFloat(duration.toFixed(2)),
          timestamp: firestore.Timestamp.now(),
        },
        ...recentLogs.slice(0, 4),
      ]);

      // Reset to current time
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Log Your Sleep</Text>

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
          <Text style={styles.durationLabel}>Sleep Duration</Text>
          <Text style={styles.durationValue}>
            {calculateDuration(bedTime, wakeTime).toFixed(1)} hours
          </Text>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSaveSleep}
        disabled={loading}>
        <Text style={styles.saveButtonText}>
          {loading ? 'Saving...' : 'Save Sleep Log'}
        </Text>
      </TouchableOpacity>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Sleep Logs</Text>
          {recentLogs.map((log, index) => (
            <View key={index} style={styles.logCard}>
              <View style={styles.logRow}>
                <Text style={styles.logLabel}>🌙 Bed:</Text>
                <Text style={styles.logTime}>
                  {formatDate(log.bedTime)} {formatTime(log.bedTime)}
                </Text>
              </View>
              <View style={styles.logRow}>
                <Text style={styles.logLabel}>☀️ Wake:</Text>
                <Text style={styles.logTime}>
                  {formatDate(log.wakeTime)} {formatTime(log.wakeTime)}
                </Text>
              </View>
              <View style={styles.logRow}>
                <Text style={styles.logLabel}>⏱️ Duration:</Text>
                <Text style={styles.logDuration}>{log.duration} hours</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ece3f6ff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  timeButton: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  pickerContainer: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  picker: {
    height: 200,
    width: '100%',
  },
  doneButton: {
    backgroundColor: '#8B5CF6',
    padding: 14,
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
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  durationValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#8B5CF6',
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
    marginTop: 20,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
});

export default ManualSleepTracker;