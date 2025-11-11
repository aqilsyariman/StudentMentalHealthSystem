import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator, // <-- Added for loading
} from 'react-native';
import firestore from '@react-native-firebase/firestore'; // <-- Added Firebase

// --- (FIX 1: TYPES) ---
// Define the "shape" of your data
type StudentStatus = 'At Risk' | 'Needs Check-in' | 'Stable';

type Student = {
  id: string; // This will be the document ID
  name: string;
  email: string;
  status: StudentStatus;
  avatar: string; // Assuming 'avatar' is a field in your doc
};

// --- Helper function to get colors for status ---
// (FIX 2: Add type for status)
const getStatusStyles = (status: StudentStatus) => {
  switch (status) {
    case 'At Risk':
      return {
        backgroundColor: '#f8e3e3ff',
        color: '#f15252ff',
      };
    case 'Needs Check-in':
      return {
        backgroundColor: '#fef9e6',
        color: '#FFA500',
      };
    case 'Stable':
    default:
      return {
        backgroundColor: '#dff6dfff',
        color: '#489448ff',
      };
  }
};

// (FIX 3: Add navigation prop)
// We will use 'any' for simplicity, but you can get
// the proper type from React Navigation if you want
const ListStudent = ({navigation}: {navigation: any}) => {
  // --- (FIX 4: STATE MANAGEMENT) ---
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // --- (FIX 5: DATA FETCHING) ---
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentList: Student[] = [];
        const snapshot = await firestore().collection('students').get();

        snapshot.forEach(doc => {
          // Get data and add the document ID
          const data = doc.data();
          studentList.push({
            id: doc.id,
            name: data.fullName || 'No Name', // Add fallbacks
            email: data.email || 'No Email',
            status: data.status || 'Stable',
            avatar: data.avatar || '',
          });
        });

        setStudents(studentList);
      } catch (error) {
        console.error('Error fetching students: ', error);
        // You could add an error state here
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []); // Empty array means this runs once on mount

  // --- (FIX 6: PRESS HANDLERS) ---
  // const handleBackPress = () => {
  //   if (navigation) {
  //     navigation.goBack(); // <-- Go back to Dashboard
  //   }
  // };

  // (FIX 2: Add type for student)
  const handleStudentPress = (student: Student) => {
    console.log('Navigate to student details for:', student.name);
    if (navigation) {
      // Navigate to a detail screen, passing the student's ID
      navigation.navigate('StudentDetail', {studentId: student.id});
    }
  };

  // --- (FIX 7: LOADING UI) ---
  if (loading) {
    return (
      <View style={[styles.fullContainer, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#6f5be1ff" />
        <Text style={styles.loadingText}>Loading Students...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* --- HEADER --- */}
        {/* (FIX 6: Added Back Button) */}

        <Text style={styles.appTitle}>All Students</Text>

        {/* --- (FIX 8: RENDER LIVE DATA) --- */}
        {students.length === 0 ? (
          <Text style={styles.loadingText}>No students found.</Text>
        ) : (
          students.map(student => {
            const statusStyles = getStatusStyles(student.status);
            return (
              <TouchableOpacity
                key={student.id}
                style={styles.card} // Re-using your card style
                onPress={() => handleStudentPress(student)}
                activeOpacity={0.7}>
                <View style={styles.studentItemContainer}>
                  {/* Avatar */}
                  <Image
                    style={styles.avatar}
                    source={{
                      // Using a placeholder avatar, you can change this
                      uri: `https://i.pravatar.cc/100?u=${student.email}`,
                    }}
                  />

                  {/* Info */}
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                  </View>

                  {/* Status Tag */}
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
  // --- NEW STYLES ---
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  // ---
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
  welcomeUser: {
    fontSize: 35,
    color: '#482ce7ff',
    fontWeight: '800',
    marginTop: 100,
    textAlign: 'left',
  },
  backButton: {
    marginTop: 50,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6f5be1ff',
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
    backgroundColor: '#ddd', // Added a background for the placeholder
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
  // (Omitted unused styles for brevity)
});

export default ListStudent;
