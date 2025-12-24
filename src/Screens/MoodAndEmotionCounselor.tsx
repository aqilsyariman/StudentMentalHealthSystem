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
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path} from 'react-native-svg';

// --- TYPES ---
interface AnxietyScore {
  score: number;
  maxScore: number;
  level: string;
  timestamp: any;
  dateKey: string;
}

interface DepressionScore {
  score: number;
  maxScore: number;
  level: string;
  timestamp: any;
  dateKey: string;
}

interface StudentMentalHealth {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  counselorId: string;
  latestAnxiety: AnxietyScore | null;
  latestDepression: DepressionScore | null;
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

const MoodAndEmotionCounselor = ({navigation}: {navigation: any}) => {
  const [students, setStudents] = useState<StudentMentalHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<StudentMentalHealth[]>([]);

  // --- FETCH STUDENTS WITH MENTAL HEALTH DATA ---
  const fetchStudentsWithMentalHealth = async () => {
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

      const studentList: StudentMentalHealth[] = [];

      // For each student, fetch their latest anxiety and depression scores
      for (const doc of studentSnapshot.docs) {
        const studentData = doc.data();

        // Fetch Anxiety Data
        const anxietyDoc = await firestore()
          .collection('students')
          .doc(doc.id)
          .collection('questionnaire')
          .doc('anxietyRisk')
          .get();

        let latestAnxiety: AnxietyScore | null = null;

        if (anxietyDoc.exists()) {
          const anxietyData = anxietyDoc.data();
          if (anxietyData?.data) {
            const dateKeys = Object.keys(anxietyData.data).sort().reverse();
            if (dateKeys.length > 0) {
              const latestDateKey = dateKeys[0];
              const entries = anxietyData.data[latestDateKey];
              if (Array.isArray(entries) && entries.length > 0) {
                const latestEntry = entries[entries.length - 1];
                latestAnxiety = {
                  score: latestEntry.score || 0,
                  maxScore: latestEntry.maxScore || 21,
                  level: latestEntry.level || 'Unknown',
                  timestamp: latestEntry.timestamp,
                  dateKey: latestDateKey,
                };
              }
            }
          }
        }

        // Fetch Depression Data
        const depressionDoc = await firestore()
          .collection('students')
          .doc(doc.id)
          .collection('questionnaire')
          .doc('depressionRisk')
          .get();

        let latestDepression: DepressionScore | null = null;

        if (depressionDoc.exists()) {
          const depressionData = depressionDoc.data();
          if (depressionData?.data) {
            const dateKeys = Object.keys(depressionData.data).sort().reverse();
            if (dateKeys.length > 0) {
              const latestDateKey = dateKeys[0];
              const entries = depressionData.data[latestDateKey];
              if (Array.isArray(entries) && entries.length > 0) {
                const latestEntry = entries[entries.length - 1];
                latestDepression = {
                  score: latestEntry.score || 0,
                  maxScore: latestEntry.maxScore || 27,
                  level: latestEntry.level || 'Unknown',
                  timestamp: latestEntry.timestamp,
                  dateKey: latestDateKey,
                };
              }
            }
          }
        }

        studentList.push({
          id: doc.id,
          name: studentData.fullName || 'Unnamed Student',
          email: studentData.email || 'No Email',
          avatar: studentData.avatar || null,
          counselorId: studentData.counselorId || null,
          latestAnxiety,
          latestDepression,
        });
      }

      // Sort by risk level (highest risk first)
      studentList.sort((a, b) => {
        const getRiskScore = (student: StudentMentalHealth) => {
          const anxietyScore = student.latestAnxiety?.score || 0;
          const depressionScore = student.latestDepression?.score || 0;
          // Normalize scores and combine (anxiety max 21, depression max 27)
          const anxietyNorm = (anxietyScore / 21) * 100;
          const depressionNorm = (depressionScore / 27) * 100;
          return (anxietyNorm + depressionNorm) / 2;
        };
        return getRiskScore(b) - getRiskScore(a);
      });

      setStudents(studentList);
      setFilteredStudents(studentList);
    } catch (error) {
      console.error('Error fetching students with mental health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentsWithMentalHealth();
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
    fetchStudentsWithMentalHealth();
  };

  // --- HELPER FUNCTIONS ---
  const getAnxietyColor = (score: number) => {
    if (score <= 4) return '#10B981'; // Minimal
    if (score <= 9) return '#F59E0B'; // Mild
    if (score <= 14) return '#F97316'; // Moderate
    return '#EF4444'; // Severe
  };

  const getDepressionColor = (score: number) => {
    if (score <= 4) return '#10B981'; // Minimal
    if (score <= 9) return '#F59E0B'; // Mild
    if (score <= 14) return '#F97316'; // Moderate
    if (score <= 19) return '#EF4444'; // Moderately Severe
    return '#DC2626'; // Severe
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

  const handleAnxietyPress = (student: StudentMentalHealth) => {
    if (navigation && student.latestAnxiety) {
      navigation.navigate('AnxietyRisk', {
        studentId: student.id,
        studentName: student.name,
        viewOnly: true,
      });
    }
  };

  const handleDepressionPress = (student: StudentMentalHealth) => {
    if (navigation && student.latestDepression) {
      navigation.navigate('DepressionRisk', {
        studentId: student.id,
        studentName: student.name,
        viewOnly: true,
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading Mental Health Data...</Text>
      </View>
    );
  }

  // Calculate statistics
  const highRiskCount = students.filter(s => {
    const anxietyScore = s.latestAnxiety?.score || 0;
    const depressionScore = s.latestDepression?.score || 0;
    return anxietyScore > 14 || depressionScore > 19;
  }).length;

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER WITH STATS */}
      <View style={styles.headerContainer}>
       

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, {backgroundColor: '#F5F3FF'}]}>
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>

          <View style={[styles.statCard, {backgroundColor: '#FEF2F2'}]}>
            <Text style={[styles.statValue, {color: '#EF4444'}]}>
              {highRiskCount}
            </Text>
            <Text style={styles.statLabel}>High Risk</Text>
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
            colors={['#8B5CF6']}
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
            const avatarUrl =
              student.avatar || `https://i.pravatar.cc/150?u=${student.email}`;

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                activeOpacity={1}>
                <View style={styles.studentCardContent}>
                  {/* Avatar */}
                  <Image style={styles.avatar} source={{uri: avatarUrl}} />

                  {/* Student Info */}
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    {(student.latestAnxiety || student.latestDepression) && (
                      <Text style={styles.scoreDate}>
                        Last update:{' '}
                        {formatDate(
                          student.latestAnxiety?.dateKey ||
                            student.latestDepression?.dateKey ||
                            '',
                        )}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Mental Health Scores */}
                <View style={styles.scoresContainer}>
                  {/* Anxiety Score */}
                  <TouchableOpacity
                    style={styles.scoreBox}
                    onPress={() => handleAnxietyPress(student)}
                    activeOpacity={student.latestAnxiety ? 0.7 : 1}
                    disabled={!student.latestAnxiety}>
                    <View style={styles.scoreHeader}>
                      <Image
                        source={require('../Assets/anxiety.png')}
                        style={styles.scoreIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.scoreTitle}>Anxiety</Text>
                    </View>
                    {student.latestAnxiety ? (
                      <>
                        <View style={styles.scoreValueContainer}>
                          <Text
                            style={[
                              styles.scoreNumber,
                              {color: getAnxietyColor(student.latestAnxiety.score)},
                            ]}>
                            {student.latestAnxiety.score}
                          </Text>
                          <Text style={styles.scoreMax}>
                            /{student.latestAnxiety.maxScore}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.levelBadge,
                            {
                              backgroundColor:
                                getAnxietyColor(student.latestAnxiety.score) + '20',
                            },
                          ]}>
                          <Text
                            style={[
                              styles.levelText,
                              {color: getAnxietyColor(student.latestAnxiety.score)},
                            ]}>
                            {student.latestAnxiety.level}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No Data</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Depression Score */}
                  <TouchableOpacity
                    style={styles.scoreBox}
                    onPress={() => handleDepressionPress(student)}
                    activeOpacity={student.latestDepression ? 0.7 : 1}
                    disabled={!student.latestDepression}>
                    <View style={styles.scoreHeader}>
                      <Image
                        source={require('../Assets/think.png')}
                        style={styles.scoreIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.scoreTitle}>Depression</Text>
                    </View>
                    {student.latestDepression ? (
                      <>
                        <View style={styles.scoreValueContainer}>
                          <Text
                            style={[
                              styles.scoreNumber,
                              {
                                color: getDepressionColor(
                                  student.latestDepression.score,
                                ),
                              },
                            ]}>
                            {student.latestDepression.score}
                          </Text>
                          <Text style={styles.scoreMax}>
                            /{student.latestDepression.maxScore}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.levelBadge,
                            {
                              backgroundColor:
                                getDepressionColor(student.latestDepression.score) +
                                '20',
                            },
                          ]}>
                          <Text
                            style={[
                              styles.levelText,
                              {
                                color: getDepressionColor(
                                  student.latestDepression.score,
                                ),
                              },
                            ]}>
                            {student.latestDepression.level}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No Data</Text>
                      </View>
                    )}
                  </TouchableOpacity>
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
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
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
    marginBottom: 16,
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
  scoresContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  scoreIcon: {
    width: 24,
    height: 24,
  },
  scoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 2,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
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

export default MoodAndEmotionCounselor;