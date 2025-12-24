/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path} from 'react-native-svg';

// --- TYPES ---
interface WellnessScore {
  finalScore: number;
  sleepScore: number;
  stepsScore: number;
  heartRateScore: number;
  bloodPressureScore: number;
  timestamp: any;
  date: string;
}

interface StudentWithScore {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  latestScore: WellnessScore | null;
  counselorId: string;
}

// --- ICONS ---
const AlertIcon = ({color = '#EF4444', size = 24}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <Path d="M12 9v4" />
    <Path d="M12 17h.01" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

const CounselorActiveAlerts = ({navigation}: {navigation: any}) => {
  const [atRiskStudents, setAtRiskStudents] = useState<StudentWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- FETCH AND SAVE AT-RISK STUDENTS ---
  const fetchAtRiskStudents = async () => {
    const currentCounselorId = auth().currentUser?.uid;

    if (!currentCounselorId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 1. Fetch students assigned to counselor
      const studentSnapshot = await firestore()
        .collection('students')
        .where('counselorId', '==', currentCounselorId)
        .get();

      const tempStudentList: StudentWithScore[] = [];

      // 2. Iterate and get scores
      for (const doc of studentSnapshot.docs) {
        const studentData = doc.data();

        const scoresDoc = await firestore()
          .collection('students')
          .doc(doc.id)
          .collection('wellnessScore')
          .doc('scores')
          .get();

        let latestScore: WellnessScore | null = null;

        if (scoresDoc.exists()) {
          const scoresData = scoresDoc.data();
          if (scoresData?.data) {
            const dateKeys = Object.keys(scoresData.data).sort().reverse();
            if (dateKeys.length > 0) {
              const latestDateKey = dateKeys[0];
              const scoreData = scoresData.data[latestDateKey];

              latestScore = {
                finalScore: scoreData.finalScore || 0,
                sleepScore: scoreData.sleepScore || 0,
                stepsScore: scoreData.stepsScore || 0,
                heartRateScore: scoreData.heartRateScore || 0,
                bloodPressureScore: scoreData.bloodPressureScore || 0,
                timestamp: scoreData.timestamp,
                date: latestDateKey,
              };
            }
          }
        }

        // 3. FILTER: Only add if score < 40
        if (latestScore && latestScore.finalScore < 40) {
          tempStudentList.push({
            id: doc.id,
            name: studentData.fullName || 'Unnamed Student',
            email: studentData.email || 'No Email',
            avatar: studentData.avatar || null,
            counselorId: studentData.counselorId || null,
            latestScore,
          });
        }
      }

      // 4. Sort (Lowest first)
      tempStudentList.sort((a, b) => {
        return (a.latestScore?.finalScore || 0) - (b.latestScore?.finalScore || 0);
      });

      // ============================================================
      // 5. SAVE TO FIRESTORE (New Feature)
      // Path: counselors -> [counselorID] -> activeAlerts -> [studentID]
      // ============================================================
      if (tempStudentList.length > 0) {
        const batch = firestore().batch();

        tempStudentList.forEach(student => {
          const alertRef = firestore()
            .collection('counselors')
            .doc(currentCounselorId)
            .collection('activeAlerts')
            .doc(student.id); // Use Student ID as Document ID

          batch.set(alertRef, {
            studentName: student.name,
            score: student.latestScore?.finalScore,
            studentId: student.id,
            email: student.email,
            flaggedAt: firestore.FieldValue.serverTimestamp(), // When the system flagged them
            scoreDate: student.latestScore?.date, // When the score was recorded
          }, { merge: true });
        });

        await batch.commit();
        console.log(`✅ Saved ${tempStudentList.length} alerts to Firestore.`);
      }
      // ============================================================

      setAtRiskStudents(tempStudentList);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      Alert.alert('Error', 'Could not fetch active alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAtRiskStudents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAtRiskStudents();
  };

  const handleStudentPress = (student: StudentWithScore) => {
    if (navigation) {
      navigation.navigate('HealthScoreScreen', {
        studentId: student.id,
        studentName: student.name,
      });
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Scanning for alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <AlertIcon size={32} />
          <Text style={styles.headerTitle}>Active Alerts</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {atRiskStudents.length} student{atRiskStudents.length !== 1 ? 's' : ''} require immediate attention.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#EF4444']}
            tintColor="#EF4444"
          />
        }>
        {atRiskStudents.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.successIconCircle}>
              <Text style={{fontSize: 32}}>🛡️</Text>
            </View>
            <Text style={styles.emptyStateTitle}>No Active Alerts</Text>
            <Text style={styles.emptyStateText}>
              Great news! All your students are currently within safe wellness ranges.
            </Text>
          </View>
        ) : (
          atRiskStudents.map(student => {
            const score = student.latestScore?.finalScore || 0;
            const avatarUrl = student.avatar || `https://i.pravatar.cc/150?u=${student.email}`;

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.alertCard}
                onPress={() => handleStudentPress(student)}
                activeOpacity={0.8}>

                <View style={styles.urgencyStrip} />

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Image style={styles.avatar} source={{uri: avatarUrl}} />
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.alertTimestamp}>
                        Flagged on {formatDate(student.latestScore!.date)}
                      </Text>
                    </View>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>{score}</Text>
                      <Text style={styles.scoreBadgeLabel}>SCORE</Text>
                    </View>
                  </View>

                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Sleep</Text>
                      <Text style={[styles.metricValue, student.latestScore!.sleepScore < 40 && styles.criticalText]}>
                        {student.latestScore?.sleepScore}
                      </Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Steps</Text>
                      <Text style={[styles.metricValue, student.latestScore!.stepsScore < 40 && styles.criticalText]}>
                        {student.latestScore?.stepsScore}
                      </Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>HR</Text>
                      <Text style={[styles.metricValue, student.latestScore!.heartRateScore < 40 && styles.criticalText]}>
                        {student.latestScore?.heartRateScore}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <Text style={styles.actionText}>View Analysis</Text>
                    <ChevronRight />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    paddingBottom: 20,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B91C1C',
    marginTop: 6,
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  urgencyStrip: {
    width: 6,
    backgroundColor: '#EF4444',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  scoreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  scoreBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  scoreBadgeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: -2,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  criticalText: {
    color: '#EF4444',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    height: '80%',
    alignSelf: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#D1FAE5',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default CounselorActiveAlerts;
