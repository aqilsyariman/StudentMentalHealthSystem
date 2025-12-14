/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// --- UPDATED TYPE: Added counselorName ---
type Student = {
  id: string;
  name: string;
  email: string;
  counselorId: string | null;
  counselorName?: string; // NEW: Optional counselor name
};

const AddStudentScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // --- NEW: Helper function to fetch counselor name ---
  const getCounselorName = async (counselorId: string): Promise<string> => {
    try {
      const counselorDoc = await firestore()
        .collection('counselors')
        .doc(counselorId)
        .get();

      if (counselorDoc.exists()) {
        const data = counselorDoc.data();
        return data?.fullName || data?.name || 'Unknown Counselor';
      }
      return 'Unknown Counselor';
    } catch (error) {
      console.error('Error fetching counselor:', error);
      return 'Unknown Counselor';
    }
  };

  // --- Search Logic (Diagnostic Test Version - searches ALL students) ---
  const handleSearch = async () => {
    if (searchQuery.trim() === '') {
      Alert.alert('Please enter a name to search.');
      return;
    }
    setLoading(true);
    setSearchResults([]);

    try {
      const normalizedQuery = searchQuery.toLowerCase();
      const studentsRef = firestore().collection('students');

      const q = await studentsRef
        .where('fullName', '>=', normalizedQuery)
        .where('fullName', '<=', normalizedQuery + '\uf8ff')
        .get();

      const students: Student[] = [];

      // Fetch all students first
      for (const doc of q.docs) {
        const data = doc.data();
        const counselorId = data.counselorId || null;

        // Fetch counselor name if counselorId exists
        let counselorName;
        if (counselorId) {
          counselorName = await getCounselorName(counselorId);
        }

        students.push({
          id: doc.id,
          name: data.fullName || 'No Name',
          email: data.email || 'No Email',
          counselorId: counselorId,
          counselorName: counselorName, // NEW: Include counselor name
        });
      }

      setSearchResults(students);
      if (students.length === 0) {
        Alert.alert('No Results', `No student found starting with "${searchQuery}".`);
      }

    } catch (error) {
      console.error('Error during search: ', error);
      Alert.alert('Fatal Error', 'The index or permissions are fundamentally broken.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (studentId: string) => {
    const currentCounselorId = auth().currentUser?.uid;

    if (!currentCounselorId) {
      Alert.alert('Error', 'You must be logged in as a counselor to add students.');
      return;
    }

    try {
      const studentRef = firestore().collection('students').doc(studentId);

      await studentRef.update({
        counselorId: currentCounselorId,
      });

      // Fetch the current counselor's name
      const currentCounselorName = await getCounselorName(currentCounselorId);

      // Update the UI immediately without re-searching
      setSearchResults(prevResults => prevResults.map(student =>
        student.id === studentId
          ? { ...student, counselorId: currentCounselorId, counselorName: currentCounselorName }
          : student
      ));

      Alert.alert('Success', 'Student added to your list.');

    } catch (error) {
      console.error('Error adding student: ', error);
      Alert.alert('Error', 'Failed to add student. Check security rules.');
    }
  };

  // --- Conditional Rendering Function ---
  const renderStudent = ({ item }: { item: Student }) => {
    const isAssigned = item.counselorId && item.counselorId !== '';

    return (
      <View style={styles.card}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>


          {/* NEW: Display counselor name if available */}
          {item.counselorName && (
            <Text style={styles.counselorName}>
              Assigned under {item.counselorName}
            </Text>
          )}
        </View>

        {isAssigned ? (
          <View style={styles.assignedTag}>
            <Text style={styles.assignedTagText}>Assigned</Text>
          </View>
        ) : (
          <Button
            title="Add"
            onPress={() => handleAddStudent(item.id)}
            color="#489448ff"
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Student</Text>
      <Text style={styles.subtitle}>Search for any student by name.</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by student name..."
        placeholderTextColor="#8a8a8a"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleSearch}
        disabled={loading}
      >
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#6f5be1ff" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          style={{ marginTop: 20 }}
          ListEmptyComponent={() => (
            <Text style={styles.loadingText}>No results</Text>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#d3dbf5ff',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6f5be1ff',
    letterSpacing: 1,
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 25,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    shadowColor: '#7B68EE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButton: {
    backgroundColor: '#6f5be1ff',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7B68EE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // NEW: Style for counselor name
  counselorName: {
    fontSize: 12,
    color: '#6f5be1ff',
    marginTop: 4,

  },
  assignedTag: {
    backgroundColor: '#f8e3e3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignedTagText: {
    color: '#f15252ff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default AddStudentScreen;
