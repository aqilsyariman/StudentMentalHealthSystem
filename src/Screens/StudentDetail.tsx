/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
  ViewStyle,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Svg, {Path, Defs, LinearGradient, Stop} from 'react-native-svg';

const {width} = Dimensions.get('window');

// --- ICONS ---
const HeartIcon = ({size = 32, color = '#FF6F61'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </Svg>
);

const StepIcon = ({size = 32, color = '#6f5be1'}) => (
  <Svg width={size} height={size} viewBox="0 0 640 512" fill={color}>
    <Path d="M192 160h32V32h-32c-35.35 0-64 28.65-64 64s28.65 64 64 64zM0 416c0 35.35 28.65 64 64 64h32V352H64c-35.35 0-64 28.65-64 64zm337.46-128c-34.91 0-76.16 13.12-104.73 32-24.79 16.38-44.52 32-104.73 32v128l57.53 15.97c26.21 7.28 53.01 13.12 80.31 15.05 32.69 2.31 65.6.67 97.58-6.2C472.9 481.3 512 429.22 512 384c0-64-84.18-96-174.54-96zM491.42 7.19C459.44.32 426.53-1.33 393.84.99c-27.3 1.93-54.1 7.77-80.31 15.04L256 32v128c60.2 0 79.94 15.62 104.73 32 28.57 18.88 69.82 32 104.73 32C555.82 224 640 192 640 128c0-45.22-39.1-97.3-148.58-120.81z" />
  </Svg>
);

const BmiIcon = ({size = 32, color = '#10B981'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 12h-2v-6h2v6zm0-8h-2V5h2v2z" />
  </Svg>
);
const BackIcon = ({size = 24, color = '#FFFFFF'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 18l-6-6 6-6" />
  </Svg>
);

const TrashIcon = ({color = '#FFFFFF', size = 20}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </Svg>
);

// --- ANIMATED COMPONENTS ---

interface PulsingViewProps {
  children: React.ReactNode;
  interval?: number;
}

const PulsingView: React.FC<PulsingViewProps> = ({children, interval = 1000}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.delay(interval),
      ]),
    ).start();
  }, [interval, scaleAnim]);

  return (
    <Animated.View style={{transform: [{scale: scaleAnim}]}}>
      {children}
    </Animated.View>
  );
};

interface SlideUpCardProps {
  children: React.ReactNode;
  delay?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

const SlideUpCard: React.FC<SlideUpCardProps> = ({children, delay = 0, onPress, style}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // If onPress is provided, wrap in TouchableOpacity; otherwise just View
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}, {scale: scaleAnim}],
        },
        style,
      ]}>
      <Container
        activeOpacity={1}
        onPress={onPress}
        onPressIn={onPress ? handlePressIn : undefined}
        onPressOut={onPress ? handlePressOut : undefined}>
        {children}
      </Container>
    </Animated.View>
  );
};

// --- TYPES & HELPERS ---
type Student = {
  fullName: string;
  email: string;
  avatar?: string;
  status?: string;
  counselorId?: string;
};

type SensorData = {
  heartRate: number | null;
  stepCount: number | null;
  weight: number | null;
  height: number | null;
  heartRateTimestamp: any;
  stepCountTimestamp: any;
};

const getLatestSensorValue = (sensorDoc: any) => {
  if (sensorDoc.exists()) {
    const docData = sensorDoc.data();
    if (docData && docData.data) {
      const data = docData.data;
      const dateKeys = Object.keys(data);
      if (dateKeys.length === 0) {
        return null;
      }
      dateKeys.sort().reverse();
      const latestDateKey = dateKeys[0];
      const readingsArray = data[latestDateKey];
      if (readingsArray && readingsArray.length > 0) {
        return readingsArray[readingsArray.length - 1];
      }
    }
  }
  return null;
};

const StudentDetail = ({route, navigation}: any) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

        const heartRateRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('sensorData')
          .doc('heartRate')
          .get();
        const stepCountRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('sensorData')
          .doc('stepCount')
          .get();
        const weightRef = firestore()
          .collection('students')
          .doc(studentId)
          .collection('BMIdata')
          .doc('bodyMetrics')
          .get();

        const [heartRateDoc, stepCountDoc, weightDoc] = await Promise.all([
          heartRateRef,
          stepCountRef,
          weightRef,
        ]);

        const latestHeartRate = getLatestSensorValue(heartRateDoc);
        const latestStepCount = getLatestSensorValue(stepCountDoc);
        const latestWeight = getLatestSensorValue(weightDoc);

        setSensorData({
          heartRate: latestHeartRate?.value || null,
          heartRateTimestamp: latestHeartRate?.timestamp || null,
          stepCount: latestStepCount?.value || null,
          stepCountTimestamp: latestStepCount?.timestamp || null,
          weight: latestWeight?.weight || null,
          height: latestWeight?.height || null,
        });
      } catch (err) {
        console.error('Error fetching data: ', err);
        setError('Failed to load student data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [studentId]);

  const handleRemoveStudent = () => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${student?.fullName} from your assigned students?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await firestore()
                .collection('students')
                .doc(studentId)
                .update({counselorId: firestore.FieldValue.delete()});
              Alert.alert(
                'Success',
                'Student has been removed from your assignments.',
                [{text: 'OK', onPress: () => navigation.goBack()}],
              );
            } catch (err) {
              console.error('Error removing student: ', err);
              Alert.alert(
                'Error',
                'Failed to remove student. Please try again.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return 'No recent data';
    }
    // Updated to show Date + Time (e.g., "Dec 25, 5:16 PM")
    return timestamp.toDate().toLocaleString([], {
      month: 'short',   // Adds "Dec"
      day: 'numeric',   // Adds "25"
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <ActivityIndicator size="large" color="#FF6F61" />
        <Text style={styles.loadingText}>Syncing Vitals...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <Text style={{color: '#EF4444', fontSize: 16, fontWeight: 'bold'}}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
          <Text style={{color: '#3b5998'}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- RENDERING ---
  return (
    <View style={styles.fullContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <BackIcon size={24} color="#FFF" />
      </TouchableOpacity>

      {/* --- CUSTOM CURVED HEADER BACKGROUND --- */}
     <View style={styles.headerBackground}>
        <Svg
          height="100%"
          width={width}
          viewBox={`0 0 ${width} 350`} // Update viewbox height
          preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4c669f" stopOpacity="1" />
              <Stop offset="1" stopColor="#3b5998" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Path
            fill="url(#grad)"
            // Deepened the curve: Sides are now 250, Center curve is 330
            d={`M0,0 L${width},0 L${width},250 Q${width / 2},330 0,250 Z`}
          />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>

        {/* --- PROFILE SECTION --- */}
        <Animated.View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image
              style={styles.avatar}
              source={{
                uri:
                  student?.avatar ||
                  `https://i.pravatar.cc/150?u=${student?.email}`,
              }}
            />
            {/* Online Status Dot */}
            <View style={styles.statusDot} />
          </View>
          <Text style={styles.studentName}>{student?.fullName}</Text>
          <Text style={styles.studentEmail}>{student?.email}</Text>
        </Animated.View>

        <Text style={styles.sectionHeader}>LIVE METRICS</Text>

        {/* --- CARD 1: HEART RATE (With Pulse Animation) --- */}
        <SlideUpCard
          delay={100}
          onPress={() => navigation.navigate('HeartRateGraph', {studentId})}
          style={styles.cardWrapper}>
          <View style={[styles.cardInner, styles.cardHeart]}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircleHeart}>
                <PulsingView interval={800}>
                  <HeartIcon size={28} color="#FF6F61" />
                </PulsingView>
              </View>
              <Text style={styles.timestampBadge}>
                {formatTimestamp(sensorData?.heartRateTimestamp)}
              </Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.bigValue}>
                {sensorData?.heartRate || '--'}
              </Text>
              <Text style={styles.unitLabel}>BPM</Text>
            </View>
            <Text style={styles.subText}>Tap to view history &rarr;</Text>
          </View>
        </SlideUpCard>

        {/* --- CARD 2: STEPS --- */}
        <SlideUpCard
          delay={250}
          onPress={() => navigation.navigate('StepsGraph', {studentId})}
          style={styles.cardWrapper}>
          <View style={[styles.cardInner, styles.cardSteps]}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircleSteps}>
                <StepIcon size={28} color="#6f5be1" />
              </View>
              <Text style={styles.timestampBadge}>
                {formatTimestamp(sensorData?.stepCountTimestamp)}
              </Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.bigValue}>
                {sensorData?.stepCount || '--'}
              </Text>
              <Text style={styles.unitLabel}>Steps</Text>
            </View>
            <Text style={styles.subText}>Activity Analysis &rarr;</Text>
          </View>
        </SlideUpCard>

        {/* --- CARD 3: BMI / METRICS --- */}
        <SlideUpCard delay={400} style={styles.cardWrapper}>
          <View style={[styles.cardInner, styles.cardBmi]}>
            <View style={styles.cardTopRow}>
              <View style={styles.iconCircleBmi}>
                <BmiIcon size={28} color="#10B981" />
              </View>
              <Text style={styles.headerLabel}>Physical Stats</Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Weight</Text>
                <Text style={styles.metricValue}>
                  {sensorData?.weight || '--'} <Text style={styles.metricUnit}>kg</Text>
                </Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Height</Text>
                <Text style={styles.metricValue}>
                  {sensorData?.height || '--'} <Text style={styles.metricUnit}>cm</Text>
                </Text>
              </View>
            </View>
          </View>
        </SlideUpCard>

        {/* --- DELETE BUTTON --- */}
        {student?.counselorId && (
          <SlideUpCard delay={550}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleRemoveStudent}
              disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <TrashIcon color="rgba(255,255,255,0.9)" />
                  <Text style={styles.deleteText}>Remove from List</Text>
                </>
              )}
            </TouchableOpacity>
          </SlideUpCard>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Very light gray background
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#3b5998',
    fontWeight: '600',
  },

  // Header
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    zIndex: 0,
  },
  scrollContainer: {
    paddingTop: 100, // Push content down to show the curve
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  studentName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF', // White text against the blue curve
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 15,
    letterSpacing: 1.2,
    marginLeft: 5,
  },

  // Cards
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFF',
    shadowColor: '#3b5998',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6, // Android shadow
  },
  cardInner: {
    padding: 24,
    borderRadius: 24,
  },
  // Color stripes or slight tinting
  cardHeart: {
    borderLeftWidth: 6,
    borderLeftColor: '#FF6F61',
  },
  cardSteps: {
    borderLeftWidth: 6,
    borderLeftColor: '#6f5be1',
  },
  cardBmi: {
    borderLeftWidth: 6,
    borderLeftColor: '#10B981',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircleHeart: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255, 111, 97, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconCircleSteps: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(111, 91, 225, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconCircleBmi: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  timestampBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    overflow: 'hidden',
  },

  // Values
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  bigValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  unitLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
    marginLeft: 8,
  },
  subText: {
    fontSize: 13,
    color: '#3b5998',
    fontWeight: '600',
    marginTop: 4,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },

  // BMI Specific
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#374151',
  },
  metricUnit: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
  },

  // Buttons
  deleteButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  backButton: {
    position: 'absolute',
    top: 60, // Clear the status bar/dynamic island
    left: 20,
    zIndex: 50, // Ensure it's clickable above the background
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Glass effect
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default StudentDetail;