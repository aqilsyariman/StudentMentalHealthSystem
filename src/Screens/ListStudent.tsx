/* eslint-disable react-native/no-inline-styles */
import React, {useState, useCallback, useEffect} from 'react'; // Added useEffect to imports
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
import {useFocusEffect} from '@react-navigation/native';

// --- TYPES ---
type StudentStatus = 'At Risk' | 'Needs Check-in' | 'Stable' | 'No Data';

type Student = {
  id: string;
  name: string;
  email: string;
  status: StudentStatus;
  avatar: string | null;
  score: number | null;
};

// --- HELPER FUNCTIONS (Moved Outside Component) ---
// These are now stable and won't cause re-renders
const getTodayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateStatus = (score: number): StudentStatus => {
  if (score < 50) return 'At Risk';
  if (score < 75) return 'Needs Check-in';
  return 'Stable';
};

// --- SEARCH ICON ---
const SearchIcon = ({color = '#9CA3AF'}) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Svg>
);

const ListStudent = ({navigation}: {navigation: any}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // 1. fetchStudents is now truly stable because its helpers are external
  const fetchStudents = useCallback(async () => {
    const currentCounselorId = auth().currentUser?.uid;

    if (!currentCounselorId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const studentSnapshot = await firestore()
        .collection('students')
        .where('counselorId', '==', currentCounselorId)
        .get();

      const todayKey = getTodayKey();

      const studentPromises = studentSnapshot.docs.map(async doc => {
        const data = doc.data();
        let currentStatus: StudentStatus = 'No Data';
        let currentScore: number | null = null;

        try {
          const scoreDoc = await firestore()
            .collection('students')
            .doc(doc.id)
            .collection('wellnessScore')
            .doc('scores')
            .get();

          if (scoreDoc.exists()) {
            const scoreData = scoreDoc.data();
            if (scoreData?.data && scoreData.data[todayKey]) {
              currentScore = scoreData.data[todayKey].finalScore;
              if (currentScore !== null && currentScore !== undefined) {
                currentStatus = calculateStatus(currentScore);
              }
            }
          }
        } catch (err) {
          console.log(`Error fetching score for ${data.fullName}`, err);
        }

        return {
          id: doc.id,
          name: data.fullName || 'Unnamed Student',
          email: data.email || 'No Email',
          status: currentStatus,
          score: currentScore,
          avatar: data.avatar || null,
        };
      });

      const studentList = await Promise.all(studentPromises);

      const statusPriority = {
        'At Risk': 1,
        'Needs Check-in': 2,
        'No Data': 3,
        'Stable': 4,
      };

      studentList.sort((a, b) => {
        return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
      });

      setStudents(studentList);
      setFilteredStudents(studentList);
    } catch (error) {
      console.error('Error fetching students: ', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Dependencies are now safely empty

  // 2. This is the correct way to trigger it on focus
  useFocusEffect(
    useCallback(() => {
      fetchStudents();
    }, [fetchStudents]) // Now this is valid because fetchStudents is memoized
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

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

  // --- COLORS ---
  const getStatusColor = (status: StudentStatus) => {
    switch (status) {
      case 'At Risk': return {bg: '#FEF2F2', text: '#EF4444', dot: '#EF4444'};
      case 'Needs Check-in': return {bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B'};
      case 'No Data': return {bg: '#F3F4F6', text: '#9CA3AF', dot: '#9CA3AF'};
      case 'Stable': default: return {bg: '#ECFDF5', text: '#10B981', dot: '#10B981'};
    }
  };

  const handleStudentPress = (student: Student) => {
    if (navigation) {
      navigation.navigate('StudentDetail', {
        studentId: student.id,
        studentName: student.name
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading Student Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f8fc" />
      
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerSubtitle}>
            You have <Text style={{fontWeight: '700', color: '#8B5CF6'}}>{students.length}</Text> assigned students
          </Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* LIST */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
        }
        keyboardShouldPersistTaps="handled">
        
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>🔍</Text>
            <Text style={styles.emptyStateTitle}>No students found</Text>
            <Text style={styles.emptyStateText}>Try adjusting your search terms</Text>
          </View>
        ) : (
          filteredStudents.map(student => {
            const colors = getStatusColor(student.status);
            const avatarUrl = student.avatar ? student.avatar : `https://i.pravatar.cc/150?u=${student.email}`;

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.card}
                onPress={() => handleStudentPress(student)}
                activeOpacity={0.7}>
                
                <View style={styles.cardContent}>
                  <Image style={styles.avatar} source={{uri: avatarUrl}} />
                  <View style={styles.infoContainer}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    {student.score !== null && (
                        <Text style={styles.scoreText}>
                            Today's Score: <Text style={{fontWeight: '700', color: colors.text}}>{student.score}</Text>
                        </Text>
                    )}
                  </View>
                  <View style={[styles.statusPill, {backgroundColor: colors.bg}]}>
                     <View style={[styles.statusDot, {backgroundColor: colors.dot}]} />
                     <Text style={[styles.statusText, {color: colors.text}]}>
                        {student.status === 'Needs Check-in' ? 'Check-in' : student.status}
                     </Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
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
    backgroundColor: '#f9f8fc',
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  scoreText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
    marginTop: -4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyStateEmoji: {
    fontSize: 40,
    marginBottom: 10,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default ListStudent;