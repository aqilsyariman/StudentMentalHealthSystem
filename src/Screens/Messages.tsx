import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path, G, Circle} from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Messages'>;

type Message = {
  id: string;
  otherPersonId: string;
  otherPersonName: string;
  otherPersonAvatar: string;
  lastMessage: string;
  timestamp: any;
  unread: boolean;
  isOnline?: boolean;
};

const MessagesScreen = ({navigation}: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'student' | 'counselor' | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkUserRole = async () => {
      try {
        const studentDoc = await firestore()
          .collection('students')
          .doc(userId)
          .get();

        if (studentDoc.exists()) {
          setUserRole('student');
          setUserName(studentDoc.data()?.fullName || 'User');
          return 'student';
        }

        const counselorDoc = await firestore()
          .collection('counselors')
          .doc(userId)
          .get();

        if (counselorDoc.exists()) {
          setUserRole('counselor');
          setUserName(counselorDoc.data()?.fullName || 'User');
          return 'counselor';
        }

        setUserRole(null);
        return null;
      } catch (error) {
        console.error('Error checking user role:', error);
        return null;
      }
    };

    const setupListener = async () => {
      const role = await checkUserRole();
      if (!role) {
        setLoading(false);
        return;
      }

      let query;
      
      if (role === 'student') {
        query = firestore()
          .collection('conversations')
          .where('studentId', '==', userId);
      } else {
        query = firestore()
          .collection('conversations')
          .where('counselorId', '==', userId);
      }

      const unsubscribe = query.onSnapshot(
        snapshot => {
          if (!snapshot || snapshot.empty) {
            setMessages([]);
            setLoading(false);
            return;
          }

          const messagesList: Message[] = snapshot.docs.map(doc => {
            const data = doc.data();
            const isStudent = role === 'student';
            
            return {
              id: doc.id,
              otherPersonId: isStudent ? data.counselorId : data.studentId,
              otherPersonName: isStudent 
                ? (data.counselorName || 'Counselor')
                : (data.studentName || 'Student'),
              otherPersonAvatar: isStudent
                ? (data.counselorAvatar || 'https://i.pravatar.cc/150?u=counselor')
                : (data.studentAvatar || 'https://i.pravatar.cc/150?u=student'),
              lastMessage: data.lastMessage || 'Start a conversation',
              timestamp: data.lastMessageTime,
              unread: isStudent ? (data.unread || false) : (data.counselorUnread || false),
              isOnline: Math.random() > 0.5, // Mock online status
            };
          });
          
          messagesList.sort((a, b) => {
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return b.timestamp.toMillis() - a.timestamp.toMillis();
          });
          
          setMessages(messagesList);
          setLoading(false);
        },
        error => {
          console.error('Error fetching messages:', error);
          setMessages([]);
          setLoading(false);
        },
      );

      return unsubscribe;
    };

    const unsubscribePromise = setupListener();

    return () => {
      unsubscribePromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, []);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks}w`;
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return 'now';
  };

  const renderMessage = ({item}: {item: Message}) => (
    <TouchableOpacity
      style={styles.messageRow}
      onPress={() =>
        navigation.navigate('ChatScreen', {
          conversationId: item.id,
          otherPersonName: item.otherPersonName,
          otherPersonId: item.otherPersonId,
        })
      }
      activeOpacity={0.6}>
      <View style={styles.avatarContainer}>
        <Image
          source={{uri: item.otherPersonAvatar}}
          style={styles.avatar}
        />
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
      
      <View style={styles.messageContent}>
        <View style={styles.topRow}>
          <Text style={styles.personName} numberOfLines={1}>
            {item.otherPersonName}
          </Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text
          style={[
            styles.lastMessage,
            item.unread && styles.unreadMessage
          ]}
          numberOfLines={2}>
          {item.lastMessage}
        </Text>
      </View>

      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Instagram-style Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path
              d="M15 18L9 12L15 6"
              stroke="#000000"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerUsername}>{userName}</Text>
          <Svg width={12} height={8} viewBox="0 0 12 8" style={styles.dropdownIcon}>
            <Path
              d="M1 1L6 6L11 1"
              stroke="#000000"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>

        {userRole === 'counselor' && (
          <TouchableOpacity
            style={styles.newMessageButton}
            onPress={() => navigation.navigate('CounselorStudentList')}
            activeOpacity={0.7}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <G
                fill="none"
                stroke="#000000"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round">
                <Path d="M3 3H21V21L12 15L3 21V3Z" />
                <Path d="M12 10V6M10 8H14" />
              </G>
            </Svg>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Svg width={96} height={96} viewBox="0 0 96 96">
              <Circle
                cx="48"
                cy="48"
                r="46"
                stroke="#000000"
                strokeWidth={2}
                fill="none"
              />
              <Path
                d="M32 38C32 35.7909 33.7909 34 36 34H60C62.2091 34 64 35.7909 64 38V58C64 60.2091 62.2091 62 60 62H36C33.7909 62 32 60.2091 32 58V38Z"
                stroke="#000000"
                strokeWidth={2}
                fill="none"
              />
              <Path
                d="M32 38L48 50L64 38"
                stroke="#000000"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
          <Text style={styles.emptyTitle}>Your Messages</Text>
          <Text style={styles.emptyText}>
            {userRole === 'counselor' 
              ? 'Send private messages to students' 
              : 'Messages from your counselor will appear here'}
          </Text>
          {userRole === 'counselor' && (
            <TouchableOpacity
              style={styles.sendMessageButton}
              onPress={() => navigation.navigate('CounselorStudentList')}
              activeOpacity={0.8}>
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  dropdownIcon: {
    marginTop: 2,
  },
  newMessageButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFEFEF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#44D058',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageContent: {
    flex: 1,
    paddingRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#8E8E8E',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E8E',
    lineHeight: 18,
  },
  unreadMessage: {
    fontWeight: '500',
    color: '#262626',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0095F6',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: '#000000',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  sendMessageButton: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E8E',
  },
});

export default MessagesScreen;