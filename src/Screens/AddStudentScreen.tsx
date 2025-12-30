/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Platform,

} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

// --- TYPES ---
type Student = {
  id: string;
  name: string;
  email: string;
  counselorId: string | null;
  counselorName?: string;
  avatar: string; // Preserved avatar field
};

// --- ICONS ---
const SearchIcon = ({ color = '#64748B' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={11} cy={11} r={8} />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);

const UserPlusIcon = ({ color = '#FFF' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <Circle cx={8.5} cy={7} r={4} />
    <Path d="M20 8v6M23 11h-6" />
  </Svg>
);

const CheckIcon = ({ color = '#10B981' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
);

// --- COMPONENTS ---

// Modern Header (Consistent with Schedule/Report)
const ModernHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>👥</Text>
        </View>
      </View>

      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.decorativeCircle} />
    </View>
  );
};

const AddStudentScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sections, setSections] = useState<{ title: string; data: Student[] }[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- HELPER: Fetch Counselor Name ---
  const getCounselorName = async (counselorId: string): Promise<string> => {
    try {
      const currentUid = auth().currentUser?.uid;
      if (counselorId === currentUid) return 'You';

      const counselorDoc = await firestore().collection('counselors').doc(counselorId).get();
      if (counselorDoc.exists()) {
        const data = counselorDoc.data();
        return data?.fullName || data?.name || 'Unknown Counselor';
      }
      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  };

  // --- FETCH STUDENTS ---
  const fetchStudents = useCallback(async () => {
    try {
      const studentsRef = firestore().collection('students');
      const snapshot = await studentsRef.orderBy('fullName').limit(100).get();

      const studentList: Student[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const counselorId = data.counselorId || null;
        let counselorName;

        if (counselorId) {
          counselorName = await getCounselorName(counselorId);
        }

        // PRESERVED: Avatar Logic
        const avatar = data.photoURL || `https://i.pravatar.cc/150?u=${data.email}`;

        studentList.push({
          id: doc.id,
          name: data.fullName || 'Unnamed Student',
          email: data.email || 'No Email',
          counselorId: counselorId,
          counselorName: counselorName,
          avatar: avatar,
        });
      }

      setAllStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Could not load student list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --- ORGANIZE SECTIONS ---
  const organizeSections = (students: Student[], query: string) => {
    let filtered = students;
    if (query.trim() !== '') {
      const lowerQuery = query.toLowerCase();
      filtered = students.filter(student =>
        student.name.toLowerCase().includes(lowerQuery) ||
        student.email.toLowerCase().includes(lowerQuery)
      );
    }

    const available = filtered.filter(s => !s.counselorId);
    const assigned = filtered.filter(s => s.counselorId);

    const newSections = [];
    if (available.length > 0) newSections.push({ title: 'Available Students', data: available });
    if (assigned.length > 0) newSections.push({ title: 'Already Assigned', data: assigned });

    setSections(newSections);
  };

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    organizeSections(allStudents, searchQuery);
  }, [searchQuery, allStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  // --- ADD STUDENT ---
  const handleAddStudent = async (studentId: string) => {
    const currentCounselorId = auth().currentUser?.uid;
    if (!currentCounselorId) return;

    try {
      // Optimistic Update
      const updatedList = allStudents.map(s =>
        s.id === studentId ? { ...s, counselorId: currentCounselorId, counselorName: 'You' } : s
      );
      setAllStudents(updatedList);
      
      await firestore().collection('students').doc(studentId).update({
        counselorId: currentCounselorId,
      });

      Alert.alert('Success', 'Student added to your list.');
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert('Error', 'Failed to update database.');
      fetchStudents();
    }
  };

  // --- RENDER ITEM ---
  const renderStudent = ({ item }: { item: Student }) => {
    const isAssigned = !!item.counselorId;
    const isAssignedToMe = item.counselorName === 'You';

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* PRESERVED: Avatar Image */}
          <Image 
            source={{ uri: item.avatar }} 
            style={styles.avatarImage} 
          />

          <View style={styles.infoContainer}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentEmail}>{item.email}</Text>
            {isAssigned && (
              <View style={[styles.statusBadge, isAssignedToMe ? styles.badgeMine : styles.badgeOthers]}>
                <Text style={[styles.statusText, isAssignedToMe ? styles.textMine : styles.textOthers]}>
                  {isAssignedToMe ? 'Assigned to You' : `With ${item.counselorName}`}
                </Text>
              </View>
            )}
          </View>

          {!isAssigned ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddStudent(item.id)}
              activeOpacity={0.7}
            >
              <UserPlusIcon />
            </TouchableOpacity>
          ) : (
            <View style={styles.checkedContainer}>
              {isAssignedToMe && <CheckIcon />}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      <ModernHeader title="Manage Class" subtitle="Add new students to your list" />

      <View style={styles.contentContainer}>
        {/* Search Bar - Floating Style */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderStudent}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No students found</Text>
                <Text style={styles.emptyText}>Try adjusting your search terms</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    flex: 1,
    marginTop: 10, // Pull content up to overlap/connect with header slightly
  },
  
  // --- HEADER STYLES ---
  headerContainer: {
    backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40, // Increased bottom padding for search bar overlap area
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: -2, 
  },
  headerIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTextContainer: {
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF',
    marginTop: 4,
    fontWeight: '500',
  },
  decorativeCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },

  // --- SEARCH BAR ---
  searchWrapper: {
    paddingHorizontal: 20,
    zIndex: 10,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    height: '100%',
    fontWeight: '500',
  },

  // --- LIST CONTENT ---
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },

  // --- CARD STYLES ---
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // --- STATUS BADGES ---
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeMine: {
    backgroundColor: '#DCFCE7',
  },
  badgeOthers: {
    backgroundColor: '#FEE2E2',
  },
  textMine: {
    color: '#166534',
  },
  textOthers: {
    color: '#991B1B',
  },

  // --- BUTTONS ---
  addButton: {
    backgroundColor: '#4F46E5', // Updated Theme Color
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkedContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
});

export default AddStudentScreen;