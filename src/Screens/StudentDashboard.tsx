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
} from 'react-native';
import AppleHealthKit, {HealthKitPermissions} from 'react-native-health';
import auth from '@react-native-firebase/auth';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {getHeightWeightAndBMI} from '../Services/HeightAndWeight';
import {getHeartRate} from '../Services/HeartRate';
import {getDailyStepCount} from '../Services/StepDailyCount';
import {getSleepData} from '../Services/SleepPatterns';
import {getBloodPressure} from '../Services/BloodPressure';
import {RootStackParamList} from '../types/navigation';
import {Image} from 'react-native';

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
  console.log('User UID:', auth().currentUser?.uid);
  const isIOS = Platform.OS === 'ios';

  const [steps, setSteps] = useState<HealthDataWithScore | null>(null);
  const [heartRate, setHeartRateState] = useState<HealthDataWithScore | null>(
    null,
  );
  // const [sleep, setSleep] = useState<{
  //   summary: any;
  //   date: string | null;
  // } | null>(null);

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
  const [bp, setBP] = useState<BloodPressureData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const heartRateScore = heartRate?.score;
  const stepCountScore = steps?.score;
  const bpScore = bp?.score;
  const sleepScore = sleep?.score;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => auth().signOut(),
        },
      ],
      {cancelable: true},
    );
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

  // Extract health data fetching into a reusable function
  const fetchHealthData = useCallback(() => {
    if (!isIOS) return;

    getDailyStepCount((data: HealthDataWithScore) => {
      if (data && data.value !== null) {
        setSteps(data);
      } else {
        setSteps(null);
      }
    });

    getHeartRate((data: HealthDataWithScore) => {
      if (data && data.value !== null) {
        setHeartRateState(data);
      } else {
        setHeartRateState(null);
      }
    });

    getBloodPressure((data: BloodPressureData) => {
      if (data && data.sys !== null && data.dia !== null) {
        setBP(data);
      } else {
        setBP(null);
      }
    });

    getSleepData(setSleep);
    getHeightWeightAndBMI(setHW);
  }, [isIOS]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    
    AppleHealthKit.initHealthKit(permissions, err => {
      if (err) {
        console.error('HealthKit not initialized:', err);
        setRefreshing(false);
        return;
      }

      fetchHealthData();
      
      // Give a slight delay for better UX
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    });
  }, [fetchHealthData]);

  useEffect(() => {
    if (!isIOS) return;

    AppleHealthKit.initHealthKit(permissions, err => {
      if (err) {
        console.error('HealthKit not initialized:', err);
        return;
      }

      fetchHealthData();
    });
  }, [isIOS, fetchHealthData]);

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
  if (hours >= 7 && hours <= 9) return { text: 'Excellent', color: '#10B981' };
  if (hours >= 6 && hours < 7) return { text: 'Good', color: '#3B82F6' };
  if (hours >= 5 && hours < 6) return { text: 'Fair', color: '#F59E0B' };
  return { text: 'Poor', color: '#EF4444' };
};

const getScoreColor = (s: number | null | undefined) => {
  if (s === null || s === undefined) return '#9CA3AF';
  if (s >= 85) return '#10B981';
  if (s >= 70) return '#3B82F6';
  if (s >= 50) return '#F59E0B';
  return '#EF4444';
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
            <Text style={styles.greeting}>Hello, Aqil! 👋</Text>
            <Text style={styles.subtitle}>Here's your health overview</Text>
          </View>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => navigation.navigate('Messages')}
            activeOpacity={0.7}>
            <Image
              source={require('../Assets/chat.png')}
              style={{width: 40, height: 40}}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Full Width Stats Cards */}
        <QuickStatCard
          title="Steps"
          value={
            steps?.value !== null && steps?.value !== undefined
              ? steps.value.toLocaleString()
              : '---'
          }
          icon={
            <Image
              source={require('../Assets/burn.png')}
              style={{width: 35, height: 35, marginBottom: -10}}
              resizeMode="contain"
            />
          }
          color="#8B5CF6"
          score={stepCountScore}
          date={steps?.date}
          formatDate={formatDate}
          onPress={handleStepsPress}
          titleColor="#e6602cff"
        />

        <QuickStatCard
          title="Heart Rate"
          value={heartRate?.value ? `${heartRate.value}` : '---'}
          unit={heartRate?.value ? 'BPM' : ''}
          icon={
            <Image
              source={require('../Assets/heart-rate.png')}
              style={{width: 35, height: 35, marginBottom: -10}}
              resizeMode="contain"
            />
          }
          color="#EF4444"
          score={heartRateScore}
          date={heartRate?.date}
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
      {sleepScore !== null && sleepScore !== undefined && (
        <View
          style={[
            styles.scoreChip,
            {backgroundColor: getScoreColor(sleepScore) + '15'},
          ]}>
          <Text style={[styles.scoreChipText, {color: getScoreColor(sleepScore)}]}>
            {sleepScore}
          </Text>
        </View>
      )}
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
                    getSleepQuality(parseFloat(sleep.summary.duration)).color + '20',
                },
              ]}>
              <Text
                style={[
                  styles.qualityText,
                  {color: getSleepQuality(parseFloat(sleep.summary.duration)).color},
                ]}>
                {getSleepQuality(parseFloat(sleep.summary.duration)).text}
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

        {/* Main Health Cards */}
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

        {/* Navigation Button */}
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => navigation.navigate('HealthScoreScreen')}>
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

// Component definitions remain the same...
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
}: {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  color: string;
  score?: number | null;
  date?: string | null;
  formatDate?: (dateString: string) => string;
  onPress?: () => void;
  titleColor?: string;
}) => {
  const getScoreColor = (s: number | null | undefined) => {
    if (s === null || s === undefined) return '#9CA3AF';
    if (s >= 80) return '#10B981';
    if (s >= 60) return '#F59E0B';
    if (s >= 40) return '#F97316';
    return '#EF4444';
  };

  const CardContent = (
    <View style={styles.quickStatCard}>
      {score !== null && score !== undefined && (
        <View
          style={[
            styles.scoreIndicatorTopRight,
            {backgroundColor: getScoreColor(score) + '20'},
          ]}>
          <View
            style={[styles.scoreDot, {backgroundColor: getScoreColor(score)}]}
          />
          <Text style={[styles.scoreText, {color: getScoreColor(score)}]}>
            {score}%
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
    backgroundColor: '#ece3f6ff',
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
  },
  quickStatValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quickStatValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1F2937',
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
});

export default DashboardScreen;
