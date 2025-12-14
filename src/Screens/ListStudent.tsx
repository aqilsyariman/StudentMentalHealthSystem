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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth'; // Required for getting current user ID

// --- TYPES (Assumed Correct) ---
type StudentStatus = 'At Risk' | 'Needs Check-in' | 'Stable';

type Student = {
  id: string;
  name: string;
  email: string;
  status: StudentStatus;
  avatar: string;
  counselorId: string | null;
};

type CounselorMap = {
  [id: string]: string;
};

// --- Helper function to get colors for status (Assumed Correct) ---
const getStatusStyles = (status: StudentStatus) => {
  switch (status) {
    case 'At Risk':
      return {backgroundColor: '#f8e3e3ff', color: '#f15252ff'};
    case 'Needs Check-in':
      return {backgroundColor: '#fef9e6', color: '#FFA500'};
    case 'Stable':
    default:
      return {backgroundColor: '#dff6dfff', color: '#489448ff'};
  }
};

const ListStudent = ({navigation}: {navigation: any}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [counselorMap, setCounselorMap] = useState<CounselorMap>({});

  // --- DATA FETCHING (Filtered by Counselor ID) ---
  useEffect(() => {
    const fetchAllData = async () => {
      // Get the currently logged-in counselor's ID
      const currentCounselorId = auth().currentUser?.uid;

      if (!currentCounselorId) {
        console.error('No user logged in to fetch assigned students.');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Counselors (needed for the name map)
        const counselorPromise = firestore().collection('counselors').get();

        // 2. QUERY: Filter students where counselorId matches the current user's ID
        const studentQuery = firestore()
          .collection('students')
          .where('counselorId', '==', currentCounselorId)
          .get();

        // 3. Wait for both to finish
        const [studentSnapshot, counselorSnapshot] = await Promise.all([
          studentQuery,
          counselorPromise,
        ]);

        // 4. Process Counselors into a "Map"
        const newCounselorMap: CounselorMap = {};
        counselorSnapshot.forEach(doc => {
          newCounselorMap[doc.id] = doc.data().fullName || 'Unnamed Counselor';
        });
        setCounselorMap(newCounselorMap);

        // 5. Process Students
        const studentList: Student[] = [];
        studentSnapshot.forEach(doc => {
          const data = doc.data();
          studentList.push({
            id: doc.id,
            name: data.fullName || 'No Name',
            email: data.email || 'No Email',
            status: data.status || 'Stable',
            avatar: data.avatar || '',
            counselorId: data.counselorId || null,
          });
        });

        setStudents(studentList);
        setFilteredStudents(studentList);
      } catch (error) {
        console.error('Error fetching assigned students: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // --- CLIENT-SIDE SEARCH FILTERING ---
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredStudents(students);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = students.filter(
        student =>
          // Filter by student name or counselor name (if student has one)
          student.name.toLowerCase().includes(lowerCaseQuery) ||
          (student.counselorId &&
            counselorMap[student.counselorId]
              ?.toLowerCase()
              .includes(lowerCaseQuery)),
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students, counselorMap]);

  const handleStudentPress = (student: Student) => {
    if (navigation) {
      // Assumes 'StudentDetail' route exists and accepts 'studentId'
      navigation.navigate('StudentDetail', {studentId: student.id});
    }
  };

  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#6f5be1ff" />
        <Text style={styles.loadingText}>Loading Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.appTitle}>My Assigned Students</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by student or counselor..."
          placeholderTextColor="#8a8a8a"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {students.length === 0 ? (
          <Text style={styles.loadingText}>No assigned students found.</Text>
        ) : filteredStudents.length === 0 ? (
          <Text style={styles.loadingText}>
            No students match "{searchQuery}"
          </Text>
        ) : (
          filteredStudents.map(student => {
            const statusStyles = getStatusStyles(student.status);

            const counselorName = student.counselorId
              ? counselorMap[student.counselorId] || 'Unknown Counselor'
              : 'Unassigned'; // This should always show the current counselor

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.card}
                onPress={() => handleStudentPress(student)}
                activeOpacity={0.7}>
                <View style={styles.studentItemContainer}>
                  <Image
                    style={styles.avatar}
                    source={{uri: `https://i.pravatar.cc/100?u=${student.email}`}}
                  />

                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>

                    <Text style={[
                        styles.counselorName,
                        { color: student.counselorId ? '#6f5be1ff' : '#888' },
                    ]}>
                      {counselorName}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusTag,
                      {backgroundColor: statusStyles.backgroundColor},
                    ]}>
                    <Text
                      style={[
                        styles.statusTagText,
                        {color: statusStyles.color},
                      ]}>
                      {student.status}
                    </Text>
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
  fullContainer: {flex: 1, backgroundColor: '#d3dbf5ff'},
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  scrollContainer: {padding: 20, paddingBottom: 80},
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6f5be1ff',
    textAlign: 'left',
    marginTop: 15,
    marginBottom: 25,
    letterSpacing: 1,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
    shadowColor: '#7B68EE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  studentItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#ddd',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentEmail: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  counselorName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  statusTag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#7B68EE',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default ListStudent;
