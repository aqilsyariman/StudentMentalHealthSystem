import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import DateTimePicker from '@react-native-community/datetimepicker';

interface MetricScore {
  value: number | null;
  score: number | null;
  date: string | null;
}

interface HealthScores {
  sleep: MetricScore;
  steps: MetricScore;
  heartRate: MetricScore;
  bloodPressure: MetricScore;
}

const HealthScoreScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthScores, setHealthScores] = useState<HealthScores>({
    sleep: { value: null, score: null, date: null },
    steps: { value: null, score: null, date: null },
    heartRate: { value: null, score: null, date: null },
    bloodPressure: { value: null, score: null, date: null },
  });
  const [finalScore, setFinalScore] = useState(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [hasCompleteData, setHasCompleteData] = useState(false);
  const [missingMetrics, setMissingMetrics] = useState<string[]>([]);
  
  // Date picker states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isToday, setIsToday] = useState(true);

  // const getTodayDateKey = () => {
  //   const now = new Date();
  //   const year = now.getFullYear();
  //   const month = String(now.getMonth() + 1).padStart(2, '0');
  //   const day = String(now.getDate()).padStart(2, '0');
  //   return `${year}-${month}-${day}`;
  // };

  const getDateKeyFromDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const checkIsToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const fetchAllHealthData = useCallback(async (dateToFetch?: Date) => {
    const user = auth().currentUser;
    if (!user) {
      console.warn('User not authenticated');
      setLoading(false);
      return;
    }

    const targetDateObj = dateToFetch || selectedDate;
    const dateKey = getDateKeyFromDate(targetDateObj);
    setTargetDate(dateKey);
    setIsToday(checkIsToday(targetDateObj));

    // Define all fetch functions inside useCallback
    const fetchSleepScore = async (uid: string, dateKey: string): Promise<MetricScore> => {
      try {
        const sleepDoc = await firestore()
          .collection('students')
          .doc(uid)
          .collection('sensorData')
          .doc('sleep')
          .get();

        if (sleepDoc.exists()) {
          const data = sleepDoc.data();
          if (data?.latestSleep) {
            const latest = data.latestSleep;
            const sleepDate = latest.timestamp.toDate();
            const actualDateKey = getDateKeyFromDate(sleepDate);
            
            if (actualDateKey === dateKey) {
              return {
                value: parseFloat(latest.duration.toFixed(1)),
                score: latest.score || 0,
                date: latest.timestamp.toDate().toISOString(),
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching sleep score:', error);
      }
      return { value: null, score: null, date: null };
    };

    const fetchStepsScore = async (uid: string, dateKey: string): Promise<MetricScore> => {
      try {
        const stepsDoc = await firestore()
          .collection('students')
          .doc(uid)
          .collection('sensorData')
          .doc('stepCount')
          .get();

        if (stepsDoc.exists()) {
          const data = stepsDoc.data();
          if (data?.data && data.data[dateKey]) {
            const latestReading = data.data[dateKey][0];
            return {
              value: latestReading.value,
              score: latestReading.score || 0,
              date: latestReading.timestamp.toDate().toISOString(),
            };
          }
        }
      } catch (error) {
        console.error('Error fetching steps score:', error);
      }
      return { value: null, score: null, date: null };
    };

    const fetchHeartRateScore = async (uid: string, dateKey: string): Promise<MetricScore> => {
      try {
        const hrDoc = await firestore()
          .collection('students')
          .doc(uid)
          .collection('sensorData')
          .doc('heartRate')
          .get();

        if (hrDoc.exists()) {
          const data = hrDoc.data();
          if (data?.data && data.data[dateKey]) {
            const readings = data.data[dateKey];
            const latestReading = readings[readings.length - 1];
            return {
              value: latestReading.value,
              score: latestReading.score || 0,
              date: latestReading.timestamp.toDate().toISOString(),
            };
          }
        }
      } catch (error) {
        console.error('Error fetching heart rate score:', error);
      }
      return { value: null, score: null, date: null };
    };

    const fetchBloodPressureScore = async (uid: string, dateKey: string): Promise<MetricScore> => {
      try {
        const bpDoc = await firestore()
          .collection('students')
          .doc(uid)
          .collection('sensorData')
          .doc('bloodPressure')
          .get();

        if (bpDoc.exists()) {
          const data = bpDoc.data();
          if (data?.data && data.data[dateKey]) {
            const readings = data.data[dateKey];
            const latestReading = readings[readings.length - 1];
            return {
              value: latestReading.sys,
              score: latestReading.score || 0,
              date: latestReading.timestamp.toDate().toISOString(),
            };
          }
        }
      } catch (error) {
        console.error('Error fetching blood pressure score:', error);
      }
      return { value: null, score: null, date: null };
    };

    const calculateScore = (
      sleep: MetricScore,
      steps: MetricScore,
      hr: MetricScore,
      bp: MetricScore
    ) => {
      const weights = {
        sleep: 0.40,
        steps: 0.30,
        heartRate: 0.20,
        bloodPressure: 0.10,
      };

      let weightedSum = 0;

      if (sleep.score !== null && steps.score !== null && hr.score !== null && bp.score !== null) {
        weightedSum = 
          (sleep.score * weights.sleep) +
          (steps.score * weights.steps) +
          (hr.score * weights.heartRate) +
          (bp.score * weights.bloodPressure);
      }

      return Math.round(weightedSum);
    };

    const saveWellnessScore = async (
      uid: string,
      dateKey: string,
      sleep: MetricScore,
      steps: MetricScore,
      hr: MetricScore,
      bp: MetricScore,
      finalScore: number
    ) => {
      try {
        const wellnessDocRef = firestore()
          .collection('students')
          .doc(uid)
          .collection('wellnessScore')
          .doc('scores');

        const scoreData = {
          sleepScore: sleep.score,
          stepsScore: steps.score,
          heartRateScore: hr.score,
          bloodPressureScore: bp.score,
          finalScore: finalScore,
          timestamp: firestore.Timestamp.now(),
        };

        await wellnessDocRef.set(
          {
            data: {
              [dateKey]: scoreData,
            },
          },
          { merge: true }
        );

        console.log(`✅ Saved wellness score (${finalScore}) for ${dateKey}`);
      } catch (error) {
        console.error('❌ Failed to save wellness score:', error);
      }
    };

    try {
      // Fetch all metrics in parallel
      const [sleepData, stepsData, hrData, bpData] = await Promise.all([
        fetchSleepScore(user.uid, dateKey),
        fetchStepsScore(user.uid, dateKey),
        fetchHeartRateScore(user.uid, dateKey),
        fetchBloodPressureScore(user.uid, dateKey),
      ]);

      setHealthScores({
        sleep: sleepData,
        steps: stepsData,
        heartRate: hrData,
        bloodPressure: bpData,
      });

      // Check which metrics are missing
      const missing: string[] = [];
      if (!sleepData.score && sleepData.score !== 0) missing.push('Sleep Duration');
      if (!stepsData.score && stepsData.score !== 0) missing.push('Daily Steps');
      if (!hrData.score && hrData.score !== 0) missing.push('Heart Rate');
      if (!bpData.score && bpData.score !== 0) missing.push('Blood Pressure');

      setMissingMetrics(missing);
      setHasCompleteData(missing.length === 0);

      // Only calculate final score if all metrics are available
      if (missing.length === 0) {
        const final = calculateScore(sleepData, stepsData, hrData, bpData);
        setFinalScore(final);
        
        // Only save to Firestore if viewing today's date
        if (checkIsToday(targetDateObj)) {
          await saveWellnessScore(user.uid, dateKey, sleepData, stepsData, hrData, bpData, final);
        }
      } else {
        setFinalScore(0);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAllHealthData();
  }, [fetchAllHealthData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllHealthData();
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (date) {
      setSelectedDate(date);
      setLoading(true);
      fetchAllHealthData(date);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setLoading(true);
    fetchAllHealthData(today);
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setLoading(true);
    fetchAllHealthData(newDate);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No data';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Date Selector */}
      <View style={styles.datePickerContainer}>
        <TouchableOpacity 
          style={styles.dateNavButton}
          onPress={() => navigateDate(-1)}
        >
          <Text style={styles.dateNavButtonText}>◀</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dateDisplayButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateDisplayText}>📅 {formatDisplayDate(selectedDate)}</Text>
          {!isToday && (
            <TouchableOpacity 
              style={styles.todayBadge}
              onPress={goToToday}
            >
              <Text style={styles.todayBadgeText}>Today</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dateNavButton, !isToday && styles.dateNavButtonActive]}
          onPress={() => navigateDate(1)}
          disabled={isToday}
        >
          <Text style={[styles.dateNavButtonText, isToday && styles.dateNavButtonTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Overall Score Section */}
      <View style={styles.overallScoreContainer}>
        <Text style={styles.headerTitle}>Wellness Score</Text>
        <Text style={styles.dateText}>Date: {targetDate}</Text>
        
        {!hasCompleteData ? (
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Incomplete Data</Text>
              <Text style={styles.warningText}>
                {isToday 
                  ? 'Please update the following metrics to calculate your daily score:'
                  : 'The following metrics were not recorded on this date:'}
              </Text>
              {missingMetrics.map((metric, index) => (
                <Text key={index} style={styles.warningMetric}>• {metric}</Text>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.circularProgressContainer}>
            <AnimatedCircularProgress
              size={200}
              width={20}
              fill={finalScore}
              tintColor={getScoreColor(finalScore)}
              backgroundColor="#E0E0E0"
              rotation={0}
            >
              {() => (
                <View style={styles.scoreTextContainer}>
                  <Text style={styles.scoreValue}>{finalScore}</Text>
                  <Text style={styles.scoreLabel}>{getScoreLabel(finalScore)}</Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </View>
        )}
      </View>

      {/* Individual Metrics */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Health Metrics</Text>

        {/* Sleep Score - 40% */}
        <View style={[
          styles.metricCard,
          (!healthScores.sleep.score && healthScores.sleep.score !== 0) && styles.metricCardMissing
        ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricIcon}>😴</Text>
              <View>
                <Text style={styles.metricTitle}>Sleep Duration</Text>
                <Text style={styles.metricWeight}>Weight: 40%</Text>
              </View>
            </View>
            <View style={styles.metricScoreContainer}>
              <Text style={[
                styles.metricScore, 
                { color: healthScores.sleep.score ? getScoreColor(healthScores.sleep.score) : '#999' }
              ]}>
                {healthScores.sleep.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.sleep.value ? `${healthScores.sleep.value} hours` : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.sleep.date ? formatDate(healthScores.sleep.date) : 'Not recorded'}
          </Text>
        </View>

        {/* Steps Score - 30% */}
        <View style={[
          styles.metricCard,
          (!healthScores.steps.score && healthScores.steps.score !== 0) && styles.metricCardMissing
        ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricIcon}>👟</Text>
              <View>
                <Text style={styles.metricTitle}>Daily Steps</Text>
                <Text style={styles.metricWeight}>Weight: 30%</Text>
              </View>
            </View>
            <View style={styles.metricScoreContainer}>
              <Text style={[
                styles.metricScore, 
                { color: healthScores.steps.score ? getScoreColor(healthScores.steps.score) : '#999' }
              ]}>
                {healthScores.steps.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.steps.value ? `${healthScores.steps.value.toLocaleString()} steps` : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.steps.date ? formatDate(healthScores.steps.date) : 'Not recorded'}
          </Text>
        </View>

        {/* Heart Rate Score - 20% */}
        <View style={[
          styles.metricCard,
          (!healthScores.heartRate.score && healthScores.heartRate.score !== 0) && styles.metricCardMissing
        ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricIcon}>❤️</Text>
              <View>
                <Text style={styles.metricTitle}>Resting Heart Rate</Text>
                <Text style={styles.metricWeight}>Weight: 20%</Text>
              </View>
            </View>
            <View style={styles.metricScoreContainer}>
              <Text style={[
                styles.metricScore, 
                { color: healthScores.heartRate.score ? getScoreColor(healthScores.heartRate.score) : '#999' }
              ]}>
                {healthScores.heartRate.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.heartRate.value ? `${healthScores.heartRate.value} bpm` : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.heartRate.date ? formatDate(healthScores.heartRate.date) : 'Not recorded'}
          </Text>
        </View>

        {/* Blood Pressure Score - 10% */}
        <View style={[
          styles.metricCard,
          (!healthScores.bloodPressure.score && healthScores.bloodPressure.score !== 0) && styles.metricCardMissing
        ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricIcon}>🩺</Text>
              <View>
                <Text style={styles.metricTitle}>Blood Pressure</Text>
                <Text style={styles.metricWeight}>Weight: 10%</Text>
              </View>
            </View>
            <View style={styles.metricScoreContainer}>
              <Text style={[
                styles.metricScore, 
                { color: healthScores.bloodPressure.score ? getScoreColor(healthScores.bloodPressure.score) : '#999' }
              ]}>
                {healthScores.bloodPressure.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.bloodPressure.value ? `${healthScores.bloodPressure.value} mmHg (SBP)` : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.bloodPressure.date ? formatDate(healthScores.bloodPressure.date) : 'Not recorded'}
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About Your Score</Text>
        <Text style={styles.infoText}>
          Your wellness score is calculated based on weighted averages of your health metrics:
        </Text>
        <Text style={styles.infoText}>• Sleep Duration: 40%</Text>
        <Text style={styles.infoText}>• Daily Steps: 30%</Text>
        <Text style={styles.infoText}>• Resting Heart Rate: 20%</Text>
        <Text style={styles.infoText}>• Blood Pressure: 10%</Text>
        <Text style={styles.infoTextNote}>
          Note: All metrics must be recorded for the selected date ({targetDate}) to calculate the wellness score.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateNavButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
  },
  dateNavButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  dateNavButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  dateNavButtonTextDisabled: {
    color: '#CCC',
  },
  dateDisplayButton: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#6200EE',
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FF9800',
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  overallScoreContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFC107',
    marginVertical: 16,
    width: '100%',
  },
  warningIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  warningMetric: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    marginTop: 4,
  },
  circularProgressContainer: {
    marginVertical: 16,
  },
  scoreTextContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  metricsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricCardMissing: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    opacity: 0.7,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  metricWeight: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  metricScoreContainer: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metricScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  metricDate: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 4,
  },
  infoTextNote: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default HealthScoreScreen;