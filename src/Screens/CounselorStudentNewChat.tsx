import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path, Circle} from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'CounselorStudentNewChat'>;

type Student = {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  hasConversation: boolean;
  conversationId?: string;
};

// --- ICONS ---
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 18l-6-6 6-6" />
  </Svg>
);

const SearchIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={11} cy={11} r={8} />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);

const ChatBubbleIcon = ({color}: {color: string}) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Svg>
);

const PlusIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

// --- HELPER: ROBUST AVATAR GENERATOR ---
const getAvatar = (name: string, photoUrl?: string) => {
  // 1. If we have a valid HTTP link, use it
  if (photoUrl && (photoUrl.startsWith('http') || photoUrl.startsWith('https'))) {
    return photoUrl;
  }
  // 2. Otherwise, generate a colorful one based on the name
  const encodedName = encodeURIComponent(name || 'Student');
  return `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&bold=true&size=128`;
};

// --- SKELETON LOADER ---
const SkeletonRow = () => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(animatedValue, {toValue: 0.3, duration: 1000, useNativeDriver: true}),
      ])
    ).start();
  }, [animatedValue]);

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonAvatar, {opacity: animatedValue}]} />
      <View style={{flex: 1}}>
        <Animated.View style={[styles.skeletonText, {width: '60%', height: 16, marginBottom: 8, opacity: animatedValue}]} />
        <Animated.View style={[styles.skeletonText, {width: '40%', height: 12, opacity: animatedValue}]} />
      </View>
    </View>
  );
};

const CounselorStudentListScreen = ({navigation}: Props) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const counselorId = auth().currentUser?.uid;
    if (!counselorId) { setLoading(false); return; }

    const fetchStudents = async () => {
      try {
        const studentsSnapshot = await firestore().collection('students').where('counselorId', '==', counselorId).get();
        
        if (studentsSnapshot.empty) { 
          setStudents([]); 
          setLoading(false); 
          return; 
        }

        const conversationsSnapshot = await firestore().collection('conversations').where('counselorId', '==', counselorId).get();
        const conversationMap = new Map<string, string>();
        conversationsSnapshot.docs.forEach(doc => { conversationMap.set(doc.data().studentId, doc.id); });

        const studentsList: Student[] = studentsSnapshot.docs.map(doc => {
          const data = doc.data();
          const fullName = data.fullName || 'Unknown Student';
          
          // Use the robust helper function here
          const finalAvatar = getAvatar(fullName, data.avatar || data.photoURL);

          return {
            id: doc.id,
            fullName: fullName,
            email: data.email || '',
            avatar: finalAvatar,
            hasConversation: !!conversationMap.get(doc.id),
            conversationId: conversationMap.get(doc.id),
          };
        });

        studentsList.sort((a, b) => {
          if (a.hasConversation && !b.hasConversation) return -1;
          if (!a.hasConversation && b.hasConversation) return 1;
          return a.fullName.localeCompare(b.fullName);
        });

        setStudents(studentsList);
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
        setLoading(false);
      }
    };
    fetchStudents();
  }, [fadeAnim]);

  const handleStudentPress = async (student: Student) => {
    const counselorId = auth().currentUser?.uid;
    if (!counselorId) return;

    try {
      if (student.hasConversation && student.conversationId) {
        navigation.navigate('ChatScreen', {
          conversationId: student.conversationId,
          otherPersonName: student.fullName,
          otherPersonId: student.id,
        });
      } else {
        const counselorDoc = await firestore().collection('counselors').doc(counselorId).get();
        const counselorData = counselorDoc.data();
        const conversationRef = await firestore().collection('conversations').add({
            studentId: student.id,
            counselorId: counselorId,
            studentName: student.fullName,
            counselorName: counselorData?.fullName || 'Counselor',
            studentAvatar: student.avatar,
            counselorAvatar: counselorData?.photoURL || 'https://i.pravatar.cc/150?u=counselor',
            lastMessage: 'Conversation Started',
            lastMessageTime: firestore.FieldValue.serverTimestamp(),
            unread: false,
            counselorUnread: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        navigation.navigate('ChatScreen', {
          conversationId: conversationRef.id,
          otherPersonName: student.fullName,
          otherPersonId: student.id,
        });
      }
    } catch (error) { console.error('Error creating conversation:', error); }
  };

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderStudent = ({item, index}: {item: Student; index: number}) => {
    const translateY = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50 * (index + 1), 0] });
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
        <TouchableOpacity style={styles.card} onPress={() => handleStudentPress(item)} activeOpacity={0.75}>
          <View style={styles.cardLeft}>
            <Image source={{uri: item.avatar}} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={styles.nameText}>{item.fullName}</Text>
              <Text style={styles.emailText}>{item.email}</Text>
            </View>
          </View>
          {item.hasConversation ? (
             <View style={styles.iconButtonSecondary}><ChatBubbleIcon color="#4F46E5" /></View>
          ) : (
            <View style={styles.iconButtonPrimary}><PlusIcon /></View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Students</Text>
          <View style={{width: 40}} /> 
        </View>

        {/* --- SEARCH BAR --- */}
        <View style={styles.searchContainer}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* --- CONTENT --- */}
      <View style={styles.contentContainer}>
        {!loading && (
            <Text style={styles.resultText}>
                {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} assigned
            </Text>
        )}

        {loading ? (
          <View style={{paddingTop: 10}}>
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? "No matching students." : "You haven't been assigned any students yet."}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5', // Indigo Background
  },
  
  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#4F46E5',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1E293B',
    height: '100%',
  },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  resultText: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 40,
  },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#64748B',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Buttons
  iconButtonSecondary: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonPrimary: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Skeleton
  skeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  skeletonText: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
});

export default CounselorStudentListScreen;