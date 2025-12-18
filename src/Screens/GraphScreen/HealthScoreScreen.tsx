import React, {useState, useEffect, useCallback} from 'react';
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
import {Image} from 'react-native';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
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
    sleep: {value: null, score: null, date: null},
    steps: {value: null, score: null, date: null},
    heartRate: {value: null, score: null, date: null},
    bloodPressure: {value: null, score: null, date: null},
  });
  const [finalScore, setFinalScore] = useState(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [hasCompleteData, setHasCompleteData] = useState(false);
  const [missingMetrics, setMissingMetrics] = useState<string[]>([]);

  // Date picker states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isToday, setIsToday] = useState(true);

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

  const fetchAllHealthData = useCallback(
    async (dateToFetch?: Date) => {
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

      const fetchSleepScore = async (
        uid: string,
        dateKey: string,
      ): Promise<MetricScore> => {
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
        return {value: null, score: null, date: null};
      };

      const fetchStepsScore = async (
        uid: string,
        dateKey: string,
      ): Promise<MetricScore> => {
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
        return {value: null, score: null, date: null};
      };

      const fetchHeartRateScore = async (
        uid: string,
        dateKey: string,
      ): Promise<MetricScore> => {
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
        return {value: null, score: null, date: null};
      };

      const fetchBloodPressureScore = async (
        uid: string,
        dateKey: string,
      ): Promise<MetricScore> => {
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
        return {value: null, score: null, date: null};
      };

      const calculateScore = (
        sleep: MetricScore,
        steps: MetricScore,
        hr: MetricScore,
        bp: MetricScore,
      ) => {
        const weights = {
          sleep: 0.4,
          steps: 0.3,
          heartRate: 0.2,
          bloodPressure: 0.1,
        };

        let weightedSum = 0;

        if (
          sleep.score !== null &&
          steps.score !== null &&
          hr.score !== null &&
          bp.score !== null
        ) {
          weightedSum =
            sleep.score * weights.sleep +
            steps.score * weights.steps +
            hr.score * weights.heartRate +
            bp.score * weights.bloodPressure;
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
        finalScore: number,
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
            {merge: true},
          );

          console.log(`✅ Saved wellness score (${finalScore}) for ${dateKey}`);
        } catch (error) {
          console.error('❌ Failed to save wellness score:', error);
        }
      };

      try {
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

        const missing: string[] = [];
        if (!sleepData.score && sleepData.score !== 0)
          missing.push('Sleep Duration');
        if (!stepsData.score && stepsData.score !== 0)
          missing.push('Daily Steps');
        if (!hrData.score && hrData.score !== 0) missing.push('Heart Rate');
        if (!bpData.score && bpData.score !== 0) missing.push('Blood Pressure');

        setMissingMetrics(missing);
        setHasCompleteData(missing.length === 0);

        if (missing.length === 0) {
          const final = calculateScore(sleepData, stepsData, hrData, bpData);
          setFinalScore(final);

          if (checkIsToday(targetDateObj)) {
            await saveWellnessScore(
              user.uid,
              dateKey,
              sleepData,
              stepsData,
              hrData,
              bpData,
              final,
            );
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
    },
    [selectedDate],
  );

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
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
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
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6366F1']}
        />
      }>
      {/* Date Selector */}
      <View style={styles.datePickerContainer}>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={() => navigateDate(-1)}>
          <Text style={styles.dateNavButtonText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateDisplayButton}
          onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateDisplayText}>
            {formatDisplayDate(selectedDate)}
          </Text>
          {!isToday && (
            <TouchableOpacity style={styles.todayBadge} onPress={goToToday}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateNavButton, !isToday && styles.dateNavButtonActive]}
          onPress={() => navigateDate(1)}
          disabled={isToday}>
          <Text
            style={[
              styles.dateNavButtonText,
              isToday && styles.dateNavButtonTextDisabled,
            ]}>
            →
          </Text>
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
        <Text style={styles.dateText}>{targetDate}</Text>

        {!hasCompleteData ? (
          <View style={styles.warningContainer}>
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Incomplete Data</Text>
              <Text style={styles.warningText}>
                {isToday
                  ? 'Please update these metrics to calculate your daily score:'
                  : 'These metrics were not recorded on this date:'}
              </Text>
              {missingMetrics.map((metric, index) => (
                <View key={index} style={styles.missingMetricRow}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.warningMetric}>{metric}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.circularProgressContainer}>
            <AnimatedCircularProgress
              size={220}
              width={18}
              fill={finalScore}
              tintColor={getScoreColor(finalScore)}
              backgroundColor="#E5E7EB"
              rotation={0}
              lineCap="round">
              {() => (
                <View style={styles.scoreTextContainer}>
                  <Text style={styles.scoreValue}>{finalScore}</Text>
                  <View style={styles.scoreLabelContainer}>
                    <Text
                      style={[
                        styles.scoreLabel,
                        {color: getScoreColor(finalScore)},
                      ]}>
                      {getScoreLabel(finalScore)}
                    </Text>
                  </View>
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
        <View
          style={[
            styles.metricCard,
            !healthScores.sleep.score &&
              healthScores.sleep.score !== 0 &&
              styles.metricCardMissing,
            {backgroundColor: '#efe5f7ff'}
          ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <View style={[styles.iconContainer]}>
                <Text style={styles.metricIcon}>
                  <Image
                    source={require('../../Assets/moon.png')}
                    style={{width: 30, height: 30, marginBottom: -5}}
                    resizeMode="contain"
                  />
                </Text>
              </View>
              <View style={styles.metricTitleContainer}>
                <Text style={styles.metricTitle}>Sleep Duration</Text>
                <View style={styles.weightBadge}>
                  <Text style={styles.metricWeight}>40% Weight</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.metricScoreContainer,
                healthScores.sleep.score !== null &&
                  healthScores.sleep.score !== undefined && {
                    backgroundColor: `${getScoreColor(
                      healthScores.sleep.score,
                    )}15`,
                  },
              ]}>
              <Text
                style={[
                  styles.metricScore,
                  {
                    color:
                      healthScores.sleep.score !== null &&
                      healthScores.sleep.score !== undefined
                        ? getScoreColor(healthScores.sleep.score)
                        : '#9CA3AF',
                  },
                ]}>
                {healthScores.sleep.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.sleep.value
              ? `${healthScores.sleep.value} hours`
              : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.sleep.date
              ? formatDate(healthScores.sleep.date)
              : 'Not recorded'}
          </Text>
        </View>

        {/* Steps Score - 30% */}
        <View
          style={[
            styles.metricCard,
            !healthScores.steps.score &&
              healthScores.steps.score !== 0 &&
              styles.metricCardMissing,
                          {backgroundColor: '#fbe6d6ff'}

          ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <View style={[styles.iconContainer]}>
                <Text style={styles.metricIcon}>
                  <Image
                    source={require('../../Assets/burn.png')}
                    style={{width: 30, height: 30, marginBottom: -5}}
                    resizeMode="contain"
                  />
                </Text>
              </View>
              <View style={styles.metricTitleContainer}>
                <Text style={styles.metricTitle}>Daily Steps</Text>
                <View style={styles.weightBadge}>
                  <Text style={styles.metricWeight}>30% Weight</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.metricScoreContainer,
                healthScores.steps.score !== null &&
                  healthScores.steps.score !== undefined && {
                    backgroundColor: `${getScoreColor(
                      healthScores.steps.score,
                    )}15`,
                  },
              ]}>
              <Text
                style={[
                  styles.metricScore,
                  {
                    color:
                      healthScores.steps.score !== null &&
                      healthScores.steps.score !== undefined
                        ? getScoreColor(healthScores.steps.score)
                        : '#9CA3AF',
                  },
                ]}>
                {healthScores.steps.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.steps.value
              ? `${healthScores.steps.value.toLocaleString()} steps`
              : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.steps.date
              ? formatDate(healthScores.steps.date)
              : 'Not recorded'}
          </Text>
        </View>

        {/* Heart Rate Score - 20% */}
        <View
          style={[
            styles.metricCard,
            !healthScores.heartRate.score &&
              healthScores.heartRate.score !== 0 &&
              styles.metricCardMissing,
                          {backgroundColor: '#fad6d4ff'}

          ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <View style={[styles.iconContainer]}>
                <Text style={styles.metricIcon}>
                  <Image
                    source={require('../../Assets/heart-rate.png')}
                    style={{width: 30, height: 30, marginBottom: -5}}
                    resizeMode="contain"
                  />
                </Text>
              </View>
              <View style={styles.metricTitleContainer}>
                <Text style={styles.metricTitle}>Resting Heart Rate</Text>
                <View style={styles.weightBadge}>
                  <Text style={styles.metricWeight}>20% Weight</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.metricScoreContainer,
                healthScores.heartRate.score !== null &&
                  healthScores.heartRate.score !== undefined && {
                    backgroundColor: `${getScoreColor(
                      healthScores.heartRate.score,
                    )}15`,
                  },
              ]}>
              <Text
                style={[
                  styles.metricScore,
                  {
                    color:
                      healthScores.heartRate.score !== null &&
                      healthScores.heartRate.score !== undefined
                        ? getScoreColor(healthScores.heartRate.score)
                        : '#9CA3AF',
                  },
                ]}>
                {healthScores.heartRate.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.heartRate.value
              ? `${healthScores.heartRate.value} bpm`
              : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.heartRate.date
              ? formatDate(healthScores.heartRate.date)
              : 'Not recorded'}
          </Text>
        </View>

        {/* Blood Pressure Score - 10% */}
        <View
          style={[
            styles.metricCard,
            !healthScores.bloodPressure.score &&
              healthScores.bloodPressure.score !== 0 &&
              styles.metricCardMissing,
                          {backgroundColor: '#f7bdbdff'}

          ]}>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitleRow}>
              <View style={[styles.iconContainer]}>
                <Text style={styles.metricIcon}>
                  <Image
                    source={require('../../Assets/blood-pressure.png')}
                    style={{width: 40, height: 40, marginBottom: -5}}
                    resizeMode="contain"
                  />
                </Text>
              </View>
              <View style={styles.metricTitleContainer}>
                <Text style={styles.metricTitle}>Blood Pressure</Text>
                <View style={styles.weightBadge}>
                  <Text style={styles.metricWeight}>10% Weight</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.metricScoreContainer,
                healthScores.bloodPressure.score !== null &&
                  healthScores.bloodPressure.score !== undefined && {
                    backgroundColor: `${getScoreColor(
                      healthScores.bloodPressure.score,
                    )}15`,
                  },
              ]}>
              <Text
                style={[
                  styles.metricScore,
                  {
                    color:
                      healthScores.bloodPressure.score !== null &&
                      healthScores.bloodPressure.score !== undefined
                        ? getScoreColor(healthScores.bloodPressure.score)
                        : '#9CA3AF',
                  },
                ]}>
                {healthScores.bloodPressure.score ?? '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricValue}>
            {healthScores.bloodPressure.value
              ? `${healthScores.bloodPressure.value} mmHg (SBP)`
              : 'No data for this date'}
          </Text>
          <Text style={styles.metricDate}>
            {healthScores.bloodPressure.date
              ? formatDate(healthScores.bloodPressure.date)
              : 'Not recorded'}
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.infoIconContainer}>
            <Text style={styles.infoIconText}>
              <Image
                source={require('../../Assets/benchmark.png')}
                style={{width: 40, height: 40, marginBottom: -5}}
                resizeMode="contain"
              />
            </Text>
          </View>
          <Text style={styles.infoTitle}>About Your Score</Text>
        </View>
        <Text style={styles.infoText}>
          Your wellness score is calculated using weighted averages of your
          health metrics:
        </Text>
        <View style={styles.infoMetricsList}>
          <View style={styles.infoMetricRow}>
            <View style={styles.infoMetricDot} />
            <Text style={styles.infoMetricText}>Sleep Duration (40%)</Text>
          </View>
          <View style={styles.infoMetricRow}>
            <View style={styles.infoMetricDot} />
            <Text style={styles.infoMetricText}>Daily Steps (30%)</Text>
          </View>
          <View style={styles.infoMetricRow}>
            <View style={styles.infoMetricDot} />
            <Text style={styles.infoMetricText}>Resting Heart Rate (20%)</Text>
          </View>
          <View style={styles.infoMetricRow}>
            <View style={styles.infoMetricDot} />
            <Text style={styles.infoMetricText}>Blood Pressure (10%)</Text>
          </View>
        </View>
        <View style={styles.infoNoteContainer}>
          <Text style={styles.infoTextNote}>
            All metrics must be recorded for {targetDate} to calculate the
            wellness score.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateNavButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  dateNavButtonActive: {
    backgroundColor: '#EEF2FF',
  },
  dateNavButtonText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
  },
  dateNavButtonTextDisabled: {
    color: '#D1D5DB',
  },
  dateDisplayButton: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateDisplayText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  todayBadge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  todayBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overallScoreContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginVertical: 8,
    width: '100%',
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  warningIconContainer: {
    marginRight: 14,
    marginTop: 2,
  },
  warningIcon: {
    fontSize: 28,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  warningText: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 12,
    lineHeight: 20,
  },
  missingMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginRight: 10,
  },
  warningMetric: {
    fontSize: 14,
    color: '#78350F',
    fontWeight: '500',
  },
  circularProgressContainer: {
    marginVertical: 20,
  },
  scoreTextContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },
  scoreLabelContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricCardMissing: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  metricIcon: {
    fontSize: 28,
  },
  metricTitleContainer: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  weightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricWeight: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metricScoreContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  metricScore: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  metricDate: {
    fontSize: 13,
    color: '#040404ff',
    fontWeight: '500',
    alignSelf: 'flex-end',
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    shadowColor: '#6366F1',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  infoIconText: {
    fontSize: 18,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3730A3',
    letterSpacing: 0.2,
  },
  infoText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 22,
    marginBottom: 14,
    fontWeight: '500',
  },
  infoMetricsList: {
    marginBottom: 14,
  },
  infoMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoMetricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginRight: 12,
  },
  infoMetricText: {
    fontSize: 14,
    color: '#4338CA',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  infoNoteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  infoTextNote: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
export default HealthScoreScreen;
