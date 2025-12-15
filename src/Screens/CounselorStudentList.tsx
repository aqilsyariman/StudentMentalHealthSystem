import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path, G} from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'CounselorStudentList'>;

type Student = {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  hasConversation: boolean;
  conversationId?: string;
};

const CounselorStudentListScreen = ({navigation}: Props) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const counselorId = auth().currentUser?.uid;
    if (!counselorId) {
      setLoading(false);
      return;
    }

    const fetchStudents = async () => {
      try {
        // Fetch all students assigned to this counselor
        const studentsSnapshot = await firestore()
          .collection('students')
          .where('counselorId', '==', counselorId)
          .get();

        if (studentsSnapshot.empty) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // Fetch all conversations for this counselor
        const conversationsSnapshot = await firestore()
          .collection('conversations')
          .where('counselorId', '==', counselorId)
          .get();

        // Create a map of studentId -> conversationId
        const conversationMap = new Map<string, string>();
        conversationsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          conversationMap.set(data.studentId, doc.id);
        });

        // Map students with conversation info
        const studentsList: Student[] = studentsSnapshot.docs.map(doc => {
          const data = doc.data();
          const studentId = doc.id;
          const conversationId = conversationMap.get(studentId);

          return {
            id: studentId,
            fullName: data.fullName || 'Unknown Student',
            email: data.email || '',
            avatar: data.photoURL || `https://i.pravatar.cc/150?u=${data.email}`,
            hasConversation: !!conversationId,
            conversationId: conversationId,
          };
        });

        // Sort: students with conversations first, then alphabetically
        studentsList.sort((a, b) => {
          if (a.hasConversation && !b.hasConversation) return -1;
          if (!a.hasConversation && b.hasConversation) return 1;
          return a.fullName.localeCompare(b.fullName);
        });

        setStudents(studentsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleStudentPress = async (student: Student) => {
    const counselorId = auth().currentUser?.uid;
    if (!counselorId) return;

    try {
      if (student.hasConversation && student.conversationId) {
        // Navigate to existing conversation
        navigation.navigate('ChatScreen', {
          conversationId: student.conversationId,
          otherPersonName: student.fullName,
          otherPersonId: student.id,
        });
      } else {
        // Create new conversation
        const counselorDoc = await firestore()
          .collection('counselors')
          .doc(counselorId)
          .get();

        const counselorData = counselorDoc.data();

        const conversationRef = await firestore()
          .collection('conversations')
          .add({
            studentId: student.id,
            counselorId: counselorId,
            studentName: student.fullName,
            counselorName: counselorData?.fullName || 'Counselor',
            studentAvatar: student.avatar,
            counselorAvatar: counselorData?.photoURL || 'https://i.pravatar.cc/150?u=counselor',
            lastMessage: '',
            lastMessageTime: firestore.FieldValue.serverTimestamp(),
            unread: false,
            counselorUnread: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        // Navigate to new conversation
        navigation.navigate('ChatScreen', {
          conversationId: conversationRef.id,
          otherPersonName: student.fullName,
          otherPersonId: student.id,
        });
      }
    } catch (error) {
      console.error('Error creating/opening conversation:', error);
    }
  };

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderStudent = ({item}: {item: Student}) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => handleStudentPress(item)}
      activeOpacity={0.7}>
      <Image source={{uri: item.avatar}} style={styles.avatar} />
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.fullName}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
      </View>
      <View style={styles.statusContainer}>
        {item.hasConversation ? (
          <View style={styles.activeStatus}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        ) : (
          <Text style={styles.startChatText}>Start Chat</Text>
        )}
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M9 18L15 12L9 6"
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Students</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.searchIcon}>
          <G
            fill="none"
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round">
            <Path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" />
          </G>
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Student Count */}
      {!loading && students.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
            {searchQuery && ` found`}
          </Text>
        </View>
      )}

      {/* Students List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No Students Found' : 'No Students Assigned'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Try searching with a different name or email'
              : 'Students assigned to you will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudent}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ece3f6ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#1F2937',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  listContent: {
    padding: 20,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  startChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
  },
});

export default CounselorStudentListScreen;