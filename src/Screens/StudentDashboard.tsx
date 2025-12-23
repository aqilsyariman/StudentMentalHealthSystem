/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AppleHealthKit, {HealthKitPermissions} from 'react-native-health';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {getHeightWeightAndBMI} from '../Services/HeightAndWeight';
import {getHeartRate} from '../Services/HeartRate';
import {getDailyStepCount} from '../Services/StepDailyCount';
import {getSleepData} from '../Services/SleepPatterns';
import {getBloodPressure} from '../Services/BloodPressure';
import {RootStackParamList} from '../types/navigation';
import {Image} from 'react-native';
import {AnimatedCircularProgress} from 'react-native-circular-progress';

// 1. MODIFIED HOOK: Now includes 'refetch' in the return object
const useHealthData = (collectionName: string) => {
  const [value, setValue] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // We wrap the fetch logic in useCallback so we can export it
  const fetchData = useCallback(async () => {
    setLoading(true); // Set loading true when refetching
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const doc = await firestore()
        .collection('students')
        .doc(user.uid)
        .collection('sensorData')
        .doc(collectionName)
        .get();

      if (doc.exists()) {
        const data = doc.data()?.data;
        if (data && Object.keys(data).length > 0) {
          const latestDate = Object.keys(data).sort().reverse()[0];
          const readings = data[latestDate];

          if (readings && readings.length > 0) {
            const latest = readings[readings.length - 1];

            setValue(latest.value);
            setScore(latest.score);
            setDate(latest.timestamp.toDate().toISOString());

            console.log(`${collectionName} Refetched:`, latest.value);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  // Initial fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Return the fetchData function as 'refetch'
  return {value, score, date, loading, refetch: fetchData};
};

export const useHeartRate = () => useHealthData('heartRate');
export const useStepCount = () => useHealthData('stepCount');

// ... existing useHealthData hook ...

// 1. ADD THIS NEW HOOK
const useDepressionRisk = () => {
  const [level, setLevel] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const doc = await firestore()
        .collection('students')
        .doc(user.uid)
        .collection('questionnaire') // Different collection than sensorData
        .doc('depressionRisk')
        .get();

      if (doc.exists()) {
        const data = doc.data()?.data;
        if (data && Object.keys(data).length > 0) {
          // Get latest date key
          const latestDate = Object.keys(data).sort().reverse()[0];
          const readings = data[latestDate];

          if (readings && readings.length > 0) {
            // Get the last item in the array for that day
            const latest = readings[readings.length - 1];

            setLevel(latest.level); // e.g., "Mild", "Severe"
            setScore(latest.score); // e.g., 5, 18
            setDate(
              latest.timestamp?.toDate
                ? latest.timestamp.toDate().toISOString()
                : new Date().toISOString(),
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Depression Risk:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {level, score, date, loading, refetch: fetchData};
};

const useAnxietyRisk = () => {
  const [level, setLevel] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const doc = await firestore()
        .collection('students')
        .doc(user.uid)
        .collection('questionnaire')
        .doc('anxietyRisk') // <--- Targeted Document
        .get();

      if (doc.exists()) {
        const data = doc.data()?.data;
        if (data && Object.keys(data).length > 0) {
          // Get latest date key
          const latestDate = Object.keys(data).sort().reverse()[0];
          const readings = data[latestDate];

          if (readings && readings.length > 0) {
            // Get the last item in the array for that day
            const latest = readings[readings.length - 1];

            setLevel(latest.level);
            setScore(latest.score);
            setDate(
              latest.timestamp?.toDate
                ? latest.timestamp.toDate().toISOString()
                : new Date().toISOString(),
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Anxiety Risk:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {level, score, date, loading, refetch: fetchData};
};

// ... (Keep Permissions object same as before) ...
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.Height,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.BloodPressureSystolic,
      AppleHealthKit.Constants.Permissions.BloodPressureDiastolic,
    ],
    write: [],
  },
};

type Props = NativeStackScreenProps<RootStackParamList, 'StudentDashboard'>;

type HealthDataWithScore = {
  value: number | null;
  date: string | null;
  score?: number | null;
};

type BloodPressureData = {
  sys: number | null;
  dia: number | null;
  date: string | null;
  score?: number | null;
};

const DashboardScreen = ({navigation}: Props) => {
  const isIOS = Platform.OS === 'ios';

  const [_steps, setSteps] = useState<HealthDataWithScore | null>(null);
  const [_heartRate, setHeartRateState] = useState<HealthDataWithScore | null>(
    null,
  );
  const [sleep, setSleep] = useState<{
    summary: any;
    date: string | null;
    score?: number | null;
  } | null>(null);
  const [hw, setHW] = useState<{
    height: number | null;
    weight: number | null;
    bmi: number | null;
    date: string | null;
  } | null>(null);

  const {
    level: depLevel,
    score: depScore,
    date: depDate,
    refetch: refetchDepression,
  } = useDepressionRisk();
  const {
    level: anxLevel,
    score: anxScore,
    date: anxDate,
    refetch: refetchAnxiety,
  } = useAnxietyRisk();

  const [bp, setBP] = useState<BloodPressureData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [wellnessScore, setWellnessScore] = useState(0);
  const [hasCompleteData, setHasCompleteData] = useState(false);
  const [loadingWellness, setLoadingWellness] = useState(true);

  // 2. DESTRUCTURE REFETCH: Get the refetch functions from the hooks
  const {
    value: hrValue,
    score: hrScore,
    date: hrDate,
    refetch: refetchHeartRate,
  } = useHeartRate();

  const {
    value: stepValue,
    score: stepScore,
    date: stepDate,
    refetch: refetchSteps,
  } = useStepCount();

  const bpScore = bp?.score;
  const sleepScore = sleep?.score;

  const [studentName, setStudentName] = useState<string>('Loading...');

  // Wrapped in useCallback so it can be used in onRefresh safely
  const fetchStudentName = useCallback(async (currentStudentId: string) => {
    if (!currentStudentId) {
      setStudentName('Guest');
      return;
    }
    try {
      const studentDocument = await firestore()
        .collection('students')
        .doc(currentStudentId)
        .get();

      if (!studentDocument.exists) {
        setStudentName('Unknown Student');
        return;
      }
      const data = studentDocument.data();
      if (data && data.fullName) {
        setStudentName(data.fullName);
      } else {
        setStudentName('Name Missing');
      }
    } catch (error) {
      console.error('Error fetching student name: ', error);
      setStudentName('Error Loading Name');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const currentUserId = auth().currentUser?.uid;
      if (currentUserId) {
        fetchStudentName(currentUserId);
      }
    }, [fetchStudentName]),
  );

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: () => auth().signOut()},
    ]);
  };

  const handleHeartRatePress = () => {
    const currentUserId = auth().currentUser?.uid;
    if (currentUserId) {
      navigation.navigate('HeartRateGraph', {studentId: currentUserId});
    }
  };

  const handleStepsPress = () => {
    const currentUserId = auth().currentUser?.uid;
    if (currentUserId) {
      navigation.navigate('StepsGraph', {studentId: currentUserId});
    }
  };

  const fetchWellnessScore = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) return;
    try {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const wellnessDoc = await firestore()
        .collection('students')
        .doc(user.uid)
        .collection('wellnessScore')
        .doc('scores')
        .get();

      if (wellnessDoc.exists()) {
        const data = wellnessDoc.data();
        if (data?.data && data.data[dateKey]) {
          const todayScore = data.data[dateKey];
          setWellnessScore(todayScore.finalScore || 0);
          const hasAllScores =
            todayScore.sleepScore !== null &&
            todayScore.stepsScore !== null &&
            todayScore.heartRateScore !== null &&
            todayScore.bloodPressureScore !== null;
          setHasCompleteData(hasAllScores);
        } else {
          setWellnessScore(0);
          setHasCompleteData(false);
        }
      }
    } catch (error) {
      console.error('Error fetching wellness score:', error);
    } finally {
      setLoadingWellness(false);
    }
  }, []);

  const fetchHealthData = useCallback(() => {
    if (!isIOS) return;
    getDailyStepCount(data => setSteps(data || null));
    getHeartRate(data => setHeartRateState(data || null));
    getBloodPressure(data => setBP(data || null));
    getSleepData(setSleep);
    getHeightWeightAndBMI(setHW);
  }, [isIOS]);

  // 3. UPDATE ONREFRESH: Call the refetch functions here
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingWellness(true);
    const userId = auth().currentUser?.uid;

    try {
      // 1. Refetch Firestore Hooks
      await Promise.all([
        refetchHeartRate(),
        refetchSteps(),
        refetchDepression(),
        refetchAnxiety(),
      ]);

      // 2. Refetch Student Name
      if (userId) {
        await fetchStudentName(userId);
      }

      // 3. Refetch Wellness Score
      await fetchWellnessScore();

      // 4. Refetch Apple Health Kit Data (if iOS)
      if (isIOS) {
        AppleHealthKit.initHealthKit(permissions, err => {
          if (!err) {
            fetchHealthData();
          }
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      // Small timeout to ensure the spinner shows for a moment if data loads too fast
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  }, [
    refetchHeartRate,
    refetchSteps,
    refetchDepression,
    fetchWellnessScore,
    fetchHealthData,
    fetchStudentName,
    refetchAnxiety,
    isIOS,
  ]);

  useEffect(() => {
    if (!isIOS) return;
    AppleHealthKit.initHealthKit(permissions, err => {
      if (!err) fetchHealthData();
    });
    fetchWellnessScore();
  }, [isIOS, fetchHealthData, fetchWellnessScore]);

  // ... (Helper functions like formatDate, getSleepQuality remain the same) ...
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateLocal = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const todayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const yesterdayLocal = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
    );

    if (dateLocal.getTime() === todayLocal.getTime()) {
      return `Today, ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    } else if (dateLocal.getTime() === yesterdayLocal.getTime()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSleepQuality = (hours: number) => {
    if (hours >= 7 && hours <= 9) return {text: 'Excellent', color: '#10B981'};
    if (hours >= 6 && hours < 7) return {text: 'Good', color: '#3B82F6'};
    if (hours >= 5 && hours < 6) return {text: 'Fair', color: '#F59E0B'};
    return {text: 'Poor', color: '#EF4444'};
  };

  const getScoreColor = (s: number | null | undefined) => {
    if (s === null || s === undefined) return '#9CA3AF';
    if (s >= 85) return '#10B981';
    if (s >= 70) return '#3B82F6';
    if (s >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getWellnessScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const getWellnessScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  // PHQ-9 Logic: Lower score = Better (Green)
  const getDepressionScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'; // Gray for no data
    if (score <= 4) return '#10B981'; // Minimal Risk (Green)
    if (score <= 9) return '#F59E0B'; // Mild Risk (Yellow)
    if (score <= 14) return '#F97316'; // Moderate Risk (Orange)
    return '#EF4444'; // Severe Risk (Red)
  };
  // GAD-7 Logic: Lower score = Better (Green)
  const getAnxietyScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF'; // Gray for no data
    if (score <= 4) return '#10B981';     // Minimal Anxiety (Green)
    if (score <= 9) return '#F59E0B';     // Mild Anxiety (Yellow)
    if (score <= 14) return '#F97316';    // Moderate Anxiety (Orange)
    return '#EF4444';                     // Severe Anxiety (Red)
  };

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
            title="Syncing with Health..."
            titleColor="#6B7280"
          />
        }>
        {/* Header Section */}
        <View style={styles.header}>
          <Image
            style={styles.profileCircle}
            source={{
              uri:
                auth().currentUser?.photoURL ||
                `https://i.pravatar.cc/150?u=${auth().currentUser?.email}`,
            }}
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Hello,{' '}
              {studentName?.charAt(0).toUpperCase() + studentName?.slice(1)}! 👋
            </Text>
            <Text style={styles.subtitle}>Here's your health overview</Text>
          </View>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => navigation.navigate('Messages')}
            activeOpacity={0.7}>
            <Image
              source={require('../Assets/message.png')}
              style={{width: 40, height: 40}}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* ... Rest of your UI (Cards, etc) remains exactly the same ... */}
        <TouchableOpacity
          style={styles.wellnessCard}
          onPress={() => navigation.navigate('HealthScoreScreen')}
          activeOpacity={0.7}>
          <Text style={styles.wellnessTitle}>Today's Wellness Score</Text>
          <Text style={styles.wellnessSubtitle}>Track your daily progress</Text>

          {loadingWellness ? (
            <View style={styles.wellnessLoadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.wellnessLoadingText}>Calculating...</Text>
            </View>
          ) : !hasCompleteData ? (
            <View style={styles.wellnessIncompleteContainer}>
              <View style={styles.wellnessIconContainer}>
                <Text style={styles.wellnessIcon}>⚠️</Text>
              </View>
              <View style={styles.wellnessTextContainer}>
                <Text style={styles.wellnessIncompleteTitle}>
                  Incomplete Data
                </Text>
                <Text style={styles.wellnessIncompleteText}>
                  Complete today's health metrics to unlock your wellness score{' '}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.wellnessScoreContainer}>
              <View style={styles.shadowWrapper}>
                <AnimatedCircularProgress
                  size={200}
                  width={12}
                  backgroundWidth={8}
                  fill={wellnessScore}
                  tintColor={getWellnessScoreColor(wellnessScore)}
                  backgroundColor="rgba(229, 231, 235, 0.5)"
                  rotation={0}
                  lineCap="round"
                  duration={1500}>
                  {() => (
                    <View style={styles.wellnessScoreTextInner}>
                      <Text style={styles.wellnessScoreValue}>
                        {wellnessScore}
                      </Text>
                      <Text style={styles.percentageSign}>%</Text>
                      <View style={styles.labelBadge}>
                        <Text
                          style={[
                            styles.wellnessScoreLabel,
                            {color: getWellnessScoreColor(wellnessScore)},
                          ]}>
                          {getWellnessScoreLabel(wellnessScore).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                </AnimatedCircularProgress>
              </View>
            </View>
          )}

          <View style={styles.wellnessFooter}>
            <Text style={styles.wellnessTapText}>
              Tap for detailed breakdown
            </Text>
            <Text style={styles.wellnessArrow}>→</Text>
          </View>
        </TouchableOpacity>
        <QuickStatCard
          title="Depression Risk"
          value={depLevel || 'No Data'} 
          unit={''}
          icon={
            <Image
              source={require('../Assets/think.png')}
              style={{width: 35, height: 35, marginBottom: -10}}
              resizeMode="contain"
            />
          }
          color="#1ae5be" 
          score={depScore !== null ? `Score : ${depScore}` : null}
          overrideColor={getDepressionScoreColor(depScore)}
          date={depDate}
          formatDate={formatDate}
          onPress={() => navigation.navigate('DepressionRisk')}
          titleColor="#14aa8cff"
        />
        <QuickStatCard
          title="Anxiety Risk"
          value={anxLevel || 'No Data'} 
          unit={''}
          icon={
            <Image
              source={require('../Assets/anxiety.png')}
              style={{width: 35, height: 35, marginBottom: -10}}
              resizeMode="contain"
            />
          }
          color="#a4c9ff" 
          score={anxScore !== null ? `Score : ${anxScore}` : null}
          overrideColor={getAnxietyScoreColor(anxScore)}
          date={anxDate}
          formatDate={formatDate}
          onPress={() => navigation.navigate('AnxietyRisk')}
          titleColor="#4671c6"
        />
        {/* Full Width Stats Cards */}
        <QuickStatCard
          title="Steps"
          value={stepValue?.toString() || '---'}
          icon={
            <Image
              source={require('../Assets/burn.png')}
              style={{width: 35, height: 35, marginBottom: -10}}
              resizeMode="contain"
            />
          }
          color="#8B5CF6"
          score={stepScore}
          date={stepDate}
          formatDate={formatDate}
          onPress={handleStepsPress}
          titleColor="#e6602cff"
        />

        <QuickStatCard
          title="Heart Rate"
          value={hrValue?.toString() || '--'}
          icon={
            <Image
              source={require('../Assets/heart-rate.png')}
              style={{width: 35, height: 35, marginBottom: -10}}
              resizeMode="contain"
            />
          }
          color="#EF4444"
          score={hrScore}
          date={hrDate}
          formatDate={formatDate}
          onPress={handleHeartRatePress}
          titleColor="#EF4444"
        />

        <TouchableOpacity
          style={styles.detailCard}
          onPress={() => navigation.navigate('ManualSleepTracker')}
          activeOpacity={0.7}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.cardIconBadge,
                  {backgroundColor: '#6366F1' + '15'},
                ]}>
                <Text style={styles.cardIcon}>
                  <Image
                    source={require('../Assets/moon.png')}
                    style={{width: 30, height: 30, marginBottom: -5}}
                    resizeMode="contain"
                  />
                </Text>
              </View>
              <Text style={[styles.cardTitle, {color: '#722fdeff'}]}>
                Sleep Analysis
              </Text>
            </View>
            <View style={styles.sleepHeaderRight}>
              <Text style={styles.tapToLogText}>Tap to Log</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            {sleep?.summary ? (
              <View>
                <View style={styles.sleepSummary}>
                  <Text style={styles.sleepDurationLabel}>
                    Last Sleep Duration
                  </Text>
                  <Text style={styles.sleepDurationValue}>
                    {sleep.summary.duration} hours
                  </Text>
                  {sleep.summary.duration && (
                    <View
                      style={[
                        styles.qualityBadge,
                        {
                          backgroundColor:
                            getSleepQuality(parseFloat(sleep.summary.duration))
                              .color + '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.qualityText,
                          {
                            color: getSleepQuality(
                              parseFloat(sleep.summary.duration),
                            ).color,
                          },
                        ]}>
                        {
                          getSleepQuality(parseFloat(sleep.summary.duration))
                            .text
                        }
                        <Text style={{color: getScoreColor(sleepScore)}}>
                          {' '}
                          : {sleepScore}%
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.sleepTimes}>
                  <View style={styles.sleepTimeItem}>
                    <Text style={styles.sleepTimeLabel}>🌙 Bed Time</Text>
                    <Text style={styles.sleepTimeValue}>
                      {sleep.summary.bedTime}
                    </Text>
                  </View>
                  <View style={styles.sleepTimeItem}>
                    <Text style={styles.sleepTimeLabel}>☀️ Wake Time</Text>
                    <Text style={styles.sleepTimeValue}>
                      {sleep.summary.wakeTime}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noData}>
                No sleep data logged yet. Tap to start tracking!
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <DetailCard
          title="Blood Pressure"
          icon={
            <Image
              source={require('../Assets/blood-pressure.png')}
              style={{width: 45, height: 45, marginBottom: -5, marginLeft: -3}}
              resizeMode="contain"
            />
          }
          color="#F97316"
          score={bpScore}
          titleColor="#b62610ff">
          <View style={styles.bpContainer}>
            <View style={styles.bpReading}>
              <Text style={styles.bpValue}>{bp?.sys || '--'}</Text>
              <Text style={styles.bpLabel}>SYS</Text>
            </View>
            <Text style={styles.bpDivider}>/</Text>
            <View style={styles.bpReading}>
              <Text style={styles.bpValue}>{bp?.dia || '--'}</Text>
              <Text style={styles.bpLabel}>DIA</Text>
            </View>
            <Text style={styles.bpUnit}>mmHg</Text>
          </View>
          {bp?.date && (
            <Text style={styles.timestamp}>{formatDate(bp.date)}</Text>
          )}
        </DetailCard>

        <DetailCard
          title="Body Metrics"
          icon={
            <Image
              source={require('../Assets/bmi.png')}
              style={{width: 45, height: 45, marginBottom: -5, marginLeft: -3}}
              resizeMode="contain"
            />
          }
          color="#10B981">
          <View style={styles.metricsGrid}>
            <MetricItem
              label="Weight"
              value={hw?.weight ? `${hw.weight} kg` : 'N/A'}
            />
            <MetricItem
              label="Height"
              value={hw?.height ? `${hw.height} m` : 'N/A'}
            />
            <MetricItem
              label="BMI"
              value={hw?.bmi ? hw.bmi.toFixed(1) : 'N/A'}
              highlight
            />
          </View>
          {hw?.date && (
            <Text style={styles.timestamp}>{formatDate(hw.date)}</Text>
          )}
        </DetailCard>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => navigation.navigate('DepressionRisk')}>
          <Text style={styles.detailsButtonText}>View Detailed Analytics</Text>
          <Text style={styles.detailsArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {!isIOS && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Full health data requires iOS with HealthKit
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ... (Rest of your component definitions like QuickStatCard, DetailCard, etc. remain unchanged) ...
const QuickStatCard = ({
  title,
  value,
  unit,
  icon,
  color,
  score,
  date,
  formatDate,
  onPress,
  titleColor,
  overrideColor, // <--- New Prop
}: {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  color: string;
  score?: number | string | null; // <--- Now accepts string
  date?: string | null;
  formatDate?: (dateString: string) => string;
  onPress?: () => void;
  titleColor?: string;
  overrideColor?: string; // <--- New Type
}) => {
  // Default color logic (Standard 0-100% scale)
  const getScoreColor = (s: number | string | null | undefined) => {
    if (s === null || s === undefined) return '#9CA3AF'; // Gray

    let numericScore = 0;

    if (typeof s === 'number') {
      numericScore = s;
    } else if (typeof s === 'string') {
      // Extract first number found in string (e.g. "Score: 85" -> 85)
      const match = s.match(/\d+/);
      numericScore = match ? parseInt(match[0], 10) : 0;
    }

    if (numericScore >= 80) return '#10B981'; // Green
    if (numericScore >= 60) return '#F59E0B'; // Yellow
    if (numericScore >= 40) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Decide final color: Use override if provided, else calculate it
  const finalScoreColor = overrideColor || getScoreColor(score);

  const CardContent = (
    <View style={styles.quickStatCard}>
      {/* Only show the top-right indicator if score exists */}
      {score !== null && score !== undefined && (
        <View
          style={[
            styles.scoreIndicatorTopRight,
            {backgroundColor: finalScoreColor + '20'},
          ]}>
          <View style={[styles.scoreDot, {backgroundColor: finalScoreColor}]} />
          <Text style={[styles.scoreText, {color: finalScoreColor}]}>
            {/* If score is a number, add %, otherwise show text */}
            {typeof score === 'number' ? `${score}%` : score}
          </Text>
        </View>
      )}

      <View style={styles.quickStatContent}>
        <View style={[styles.iconBadge, {backgroundColor: color + '15'}]}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
        <View style={styles.quickStatInfo}>
          <Text
            style={[styles.quickStatTitle, titleColor && {color: titleColor}]}>
            {title}
          </Text>
          <View style={styles.quickStatValueContainer}>
            <Text style={styles.quickStatValue}>{value}</Text>
            {unit && <Text style={styles.quickStatUnit}>{unit}</Text>}
          </View>
        </View>
      </View>
      {date && formatDate && (
        <Text style={styles.timestamp}>{formatDate(date)}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const DetailCard = ({
  title,
  icon,
  color,
  children,
  score,
  iconColor,
  titleColor,
}: {
  title: string;
  icon?: React.ReactNode;
  color: string;
  iconColor?: string;
  children: React.ReactNode;
  score?: number | null;
  titleColor?: string;
}) => {
  const getScoreColor = (s: number | null | undefined) => {
    if (s === null || s === undefined) return '#9CA3AF';
    if (s >= 80) return '#10B981';
    if (s >= 60) return '#F59E0B';
    if (s >= 40) return '#F97316';
    return '#EF4444';
  };

  const getScoreLabel = (s: number | null | undefined) => {
    if (s === null || s === undefined) return 'No Data';
    if (s >= 80) return 'Optimal';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <View style={styles.detailCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.cardIconBadge,
              {backgroundColor: (iconColor || color) + '15'},
            ]}>
            <Text style={styles.cardIcon}>{icon}</Text>
          </View>
          <Text style={[styles.cardTitle, titleColor && {color: titleColor}]}>
            {title}
          </Text>
        </View>
        {score !== null && score !== undefined && (
          <View
            style={[
              styles.scoreChip,
              {backgroundColor: getScoreColor(score) + '15'},
            ]}>
            <Text style={[styles.scoreChipText, {color: getScoreColor(score)}]}>
              {getScoreLabel(score)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
};

const MetricItem = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View style={[styles.metricItem, highlight && styles.metricItemHighlight]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text
      style={[styles.metricValue, highlight && styles.metricValueHighlight]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#f9f8fcff',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  profileCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 30,
  },
  headerText: {
    flex: 1,
  },
  messageButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    marginTop: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Wellness Score Styles
  wellnessCard: {
    backgroundColor: '#FCF8F8',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#FCF8F8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0,
    borderColor: '#E9D5FF',
  },
  wellnessTitle: {
    fontSize: 29,
    fontWeight: '700',
    color: '#2C2C54',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  wellnessSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C54',
    textAlign: 'center',
    marginBottom: 20,
  },
  wellnessLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  wellnessLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  wellnessIncompleteContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  wellnessIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  wellnessIcon: {
    fontSize: 24,
  },
  wellnessTextContainer: {
    flex: 1,
  },
  wellnessIncompleteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  wellnessIncompleteText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },

  wellnessScoreTextContainer: {
    alignItems: 'center',
  },

  wellnessFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  wellnessTapText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C2C54',
    marginRight: 6,
  },
  wellnessArrow: {
    fontSize: 16,
    color: '#2C2C54',
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  signOutButton: {
    backgroundColor: '#7B68EE',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 20,
  },
  signOutButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  quickStatCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickStatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconEmoji: {
    fontSize: 24,
  },
  quickStatInfo: {
    flex: 1,
  },
  quickStatTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  quickStatValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quickStatValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 5,
  },
  quickStatUnit: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
    fontWeight: '600',
  },
  scoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  scoreIndicatorTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scoreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    gap: 12,
  },
  bpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  bpReading: {
    alignItems: 'center',
  },
  bpValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
  },
  bpLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  bpDivider: {
    fontSize: 32,
    color: '#D1D5DB',
    marginHorizontal: 16,
    fontWeight: '300',
  },
  bpUnit: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
    fontWeight: '600',
  },
  sleepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sleepStat: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sleepStatHighlight: {
    backgroundColor: '#EEF2FF',
  },
  sleepStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sleepStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricItemHighlight: {
    backgroundColor: '#ECFDF5',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  metricValueHighlight: {
    color: '#10B981',
  },
  timestamp: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'right',
  },
  noData: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  detailsButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  detailsArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tapToLogText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  sleepSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  sleepDurationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  sleepDurationValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#6366F1',
  },
  sleepTimes: {
    flexDirection: 'row',
    gap: 16,
  },
  sleepTimeItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  sleepTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  sleepTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  sleepHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  wellnessScoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FCF8F8',
  },
  // Creates a soft glow/float effect around the circle
  shadowWrapper: {
    borderRadius: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  wellnessScoreTextInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The big number
  wellnessScoreValue: {
    fontSize: 42,
    fontWeight: '800', // Extra bold for impact
    color: '#111827', // Slate 900
    letterSpacing: -1,
  },
  // Separate % sign styling for better typography hierarchy
  percentageSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280', // Muted gray
    position: 'absolute',
    right: -15,
    top: 10,
  },
  // The status label (e.g., "EXCELLENT")
  labelBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6', // Light gray background pill
    borderRadius: 20,
  },
  wellnessScoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

export default DashboardScreen;
