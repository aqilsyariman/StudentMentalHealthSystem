import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
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

// --- SEARCH ICON ---
const SearchIcon = ({color = '#9CA3AF'}) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round">
    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Svg>
);

const CounselorWellnessDashboard = ({navigation}: {navigation: any}) => {
  const [students, setStudents] = useState<StudentWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<StudentWithScore[]>(
    [],
  );

  // --- FETCH STUDENTS WITH WELLNESS SCORES ---
  const fetchStudentsWithScores = async () => {
    const currentCounselorId = auth().currentUser?.uid;

    if (!currentCounselorId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Fetch all students assigned to this counselor
      const studentSnapshot = await firestore()
        .collection('students')
        .where('counselorId', '==', currentCounselorId)
        .get();

      const studentList: StudentWithScore[] = [];

      // For each student, fetch their latest wellness score
      for (const doc of studentSnapshot.docs) {
        const studentData = doc.data();

        // Fetch wellness scores
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
            // Get all date keys and sort them to find the latest
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

        studentList.push({
          id: doc.id,
          name: studentData.fullName || 'Unnamed Student',
          email: studentData.email || 'No Email',
          avatar: studentData.avatar || null,
          counselorId: studentData.counselorId || null,
          latestScore,
        });
      }

      // Sort by score (lowest first - students needing attention)
      studentList.sort((a, b) => {
        const scoreA = a.latestScore?.finalScore ?? -1;
        const scoreB = b.latestScore?.finalScore ?? -1;
        return scoreA - scoreB;
      });

      // --- SAVE STATS TO SUB-COLLECTION ---
      // 1. Calculate Stats
      const studentsWithScores = studentList.filter(
        s => s.latestScore !== null,
      );

      const calculatedAvgScore =
        studentsWithScores.length > 0
          ? Math.round(
              studentsWithScores.reduce(
                (sum, s) => sum + (s.latestScore?.finalScore || 0),
                0,
              ) / studentsWithScores.length,
            )
          : 0;

      const totalStudentsCount = studentList.length;
      const atRiskCount = studentsWithScores.filter(
        s => (s.latestScore?.finalScore || 0) < 40,
      ).length;
      // 2. Save to 'dashboardStats' SUB-COLLECTION inside the counselor's doc
      await firestore()
        .collection('counselors') // 1. Go to counselors collection
        .doc(currentCounselorId) // 2. Find THIS counselor's document
        .collection('dashboardStats') // 3. Create/Go to 'dashboardStats' sub-collection
        .doc('summary') // 4. Create/Update the 'summary' document
        .set(
          {
            averageWellnessScore: calculatedAvgScore,
            totalStudents: totalStudentsCount,
            atRiskStudents: atRiskCount,
            lastUpdated: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );

      console.log(
        '✅ Stats saved to sub-collection: counselors -> [ID] -> dashboardStats -> summary',
      );
      // -------------------------------

      setStudents(studentList);
      setFilteredStudents(studentList);
    } catch (error) {
      console.error('Error fetching students with scores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentsWithScores();
  }, []);

  // --- SEARCH LOGIC ---
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredStudents(students);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = students.filter(
        student =>
          student.name.toLowerCase().includes(lowerCaseQuery) ||
          student.email.toLowerCase().includes(lowerCaseQuery),
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  // --- REFRESH ---
  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentsWithScores();
  };

  // --- HELPER FUNCTIONS ---
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
    return 'At Risk';
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleStudentPress = (student: StudentWithScore) => {
    if (navigation) {
      // Navigate to student detail screen
      navigation.navigate('HealthScoreScreen', {
        studentId: student.id,
        studentName: student.name,
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading Wellness Data...</Text>
      </View>
    );
  }

  // Calculate statistics for UI display (using current state)
  const studentsWithScores = students.filter(s => s.latestScore !== null);
  const avgScore =
    studentsWithScores.length > 0
      ? Math.round(
          studentsWithScores.reduce(
            (sum, s) => sum + (s.latestScore?.finalScore || 0),
            0,
          ) / studentsWithScores.length,
        )
      : 0;
  const atRiskCount = studentsWithScores.filter(
    s => (s.latestScore?.finalScore || 0) < 40,
  ).length;

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER WITH STATS */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Student Wellness</Text>
        <Text style={styles.headerSubtitle}>
          Monitoring {students.length} assigned students
        </Text>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, {backgroundColor: '#EEF2FF'}]}>
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>

          <View style={[styles.statCard, {backgroundColor: '#ECFDF5'}]}>
            <Text style={[styles.statValue, {color: '#10B981'}]}>
              {avgScore}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>

          <View style={[styles.statCard, {backgroundColor: '#FEF2F2'}]}>
            <Text style={[styles.statValue, {color: '#EF4444'}]}>
              {atRiskCount}
            </Text>
            <Text style={styles.statLabel}>At Risk</Text>
          </View>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* STUDENT LIST */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
          />
        }>
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>🔍</Text>
            <Text style={styles.emptyStateTitle}>No students found</Text>
            <Text style={styles.emptyStateText}>Try adjusting your search</Text>
          </View>
        ) : (
          filteredStudents.map(student => {
            const score = student.latestScore?.finalScore;
            const hasScore = score !== null && score !== undefined;
            const scoreColor = hasScore ? getScoreColor(score) : '#9CA3AF';
            const avatarUrl =
              student.avatar || `https://i.pravatar.cc/150?u=${student.email}`;

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                onPress={() => handleStudentPress(student)}
                activeOpacity={0.7}>
                <View style={styles.studentCardContent}>
                  {/* Avatar */}
                  <Image style={styles.avatar} source={{uri: avatarUrl}} />

                  {/* Student Info */}
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    {student.latestScore && (
                      <Text style={styles.scoreDate}>
                        Last update: {formatDate(student.latestScore.date)}
                      </Text>
                    )}
                  </View>

                  {/* Wellness Score Circle */}
                  <View style={styles.scoreContainer}>
                    {hasScore ? (
                      <View style={styles.circleContainer}>
                        <AnimatedCircularProgress
                          size={70}
                          width={6}
                          fill={score}
                          tintColor={scoreColor}
                          backgroundColor="#E5E7EB"
                          rotation={0}
                          lineCap="round">
                          {() => (
                            <View style={styles.scoreCircleContent}>
                              <Text
                                style={[
                                  styles.scoreNumber,
                                  {color: scoreColor},
                                ]}>
                                {score}
                              </Text>
                            </View>
                          )}
                        </AnimatedCircularProgress>
                        <Text style={[styles.scoreStatus, {color: scoreColor}]}>
                          {getScoreLabel(score)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.noScoreContainer}>
                        <View style={styles.noScoreCircle}>
                          <Text style={styles.noScoreText}>--</Text>
                        </View>
                        <Text style={styles.noScoreLabel}>No Data</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Mini Metrics (if score exists) */}
                {student.latestScore && (
                  <View style={styles.miniMetricsContainer}>
                    <View style={styles.miniMetric}>
                      <Image
                        source={require('../Assets/moon.png')}
                        style={styles.miniIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.miniMetricValue}>
                        {student.latestScore.sleepScore}
                      </Text>
                    </View>

                    <View style={styles.miniMetric}>
                      <Image
                        source={require('../Assets/burn.png')}
                        style={styles.miniIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.miniMetricValue}>
                        {student.latestScore.stepsScore}
                      </Text>
                    </View>

                    <View style={styles.miniMetric}>
                      <Image
                        source={require('../Assets/heart-rate.png')}
                        style={styles.miniIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.miniMetricValue}>
                        {student.latestScore.heartRateScore}
                      </Text>
                    </View>

                    <View style={styles.miniMetric}>
                      <Image
                        source={require('../Assets/blood-pressure.png')}
                        style={styles.miniIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.miniMetricValue}>
                        {student.latestScore.bloodPressureScore}
                      </Text>
                    </View>
                  </View>
                )}
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
    color: '#6B7280',
    fontWeight: '500',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  scoreDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  circleContainer: {
    alignItems: 'center',
  },
  scoreCircleContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  scoreStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noScoreContainer: {
    alignItems: 'center',
  },
  noScoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#E5E7EB',
  },
  noScoreText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  noScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  miniMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  miniMetric: {
    alignItems: 'center',
    gap: 4,
  },
  miniIcon: {
    width: 20,
    height: 20,
  },
  miniMetricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default CounselorWellnessDashboard;
