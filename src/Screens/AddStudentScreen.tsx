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
  SafeAreaView,
  RefreshControl,
  Image, // Added Image import
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, { Path, Circle } from 'react-native-svg';

// --- TYPES ---
type Student = {
  id: string;
  name: string;
  email: string;
  counselorId: string | null;
  counselorName?: string;
  avatar: string; // NEW: Added avatar field
};

// --- ICONS ---
const SearchIcon = ({ color = '#9CA3AF' }) => (
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

        // NEW: Avatar Logic (Photo URL or Fallback based on Email)
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
      // We removed organizeSections here to rely on the useEffect below
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

  // --- UPDATE LIST ON SEARCH ---
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
          {/* UPDATED: Uses Image instead of Text/View */}
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
                  {isAssignedToMe ? 'Assigned to You' : `Under ${item.counselorName}`}
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>Add new students to your class</Text>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptyText}>Try adjusting your search terms</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  searchWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
    height: '100%',
  },
  listContent: {
    padding: 24,
    paddingTop: 0,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  // --- CARD STYLES ---
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // NEW: Avatar Image Style
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB', // Fallback gray while loading
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  studentEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // --- STATUS BADGES ---
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeMine: {
    backgroundColor: '#ECFDF5',
  },
  badgeOthers: {
    backgroundColor: '#FEF2F2',
  },
  textMine: {
    color: '#059669',
  },
  textOthers: {
    color: '#DC2626',
  },
  // --- BUTTONS ---
  addButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
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
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default AddStudentScreen;