/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
  TextInput,
  Platform,
  ScrollView,
  Easing,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path, Circle} from 'react-native-svg';

// --- ICONS ---
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 18l-6-6 6-6" />
  </Svg>
);

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={11} cy={11} r={8} />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);

const EditIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Svg>
);

const EmptyStateGraphic = () => (
  <Svg width={140} height={140} viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth={0.5}>
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Svg>
);

// --- TYPES ---
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

// --- SKELETON LOADER ---
const SkeletonRow = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {toValue: 1, duration: 1000, useNativeDriver: true}),
        Animated.timing(animatedValue, {toValue: 0, duration: 1000, useNativeDriver: true}),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonRow}>
      <Animated.View style={[styles.skeletonAvatar, {opacity}]} />
      <View style={styles.skeletonTextContainer}>
        <Animated.View style={[styles.skeletonTextBarShort, {opacity}]} />
        <Animated.View style={[styles.skeletonTextBarLong, {opacity}]} />
      </View>
    </View>
  );
};

// --- MESSAGE CARD COMPONENT ---
const MessageCard = ({
  item,
  index,
  onPress,
}: {
  item: Message;
  index: number;
  onPress: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, index, slideAnim]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) { return ''; }
    const date = timestamp.toDate();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) { return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); }
    if (diffDays === 1) { return 'Yesterday'; }
    if (diffDays < 7) { return date.toLocaleDateString([], {weekday: 'short'}); }
    return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
  };

  return (
    <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
      <TouchableOpacity
        style={[styles.card, item.unread && styles.cardActive]}
        activeOpacity={0.7}
        onPress={onPress}>
        <Image source={{uri: item.otherPersonAvatar}} style={styles.cardAvatar} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardName, item.unread && styles.boldText]}>
              {item.otherPersonName}
            </Text>
            <Text style={[styles.cardTime, item.unread && styles.accentText]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={[styles.cardMessage, item.unread && styles.boldText]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- MAIN SCREEN ---
const MessagesScreen = ({navigation}: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'student' | 'counselor' | null>(null);

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) { setLoading(false); return; }

    const checkUserRole = async () => {
      try {
        const studentDoc = await firestore().collection('students').doc(userId).get();
        if (studentDoc.exists()) { setUserRole('student'); return 'student'; }
        const counselorDoc = await firestore().collection('counselors').doc(userId).get();
        if (counselorDoc.exists()) { setUserRole('counselor'); return 'counselor'; }
        return null;
      } catch (error) { console.error(error); return null; }
    };

    const setupListener = async () => {
      const role = await checkUserRole();
      if (!role) { setLoading(false); return; }
      const queryField = role === 'student' ? 'studentId' : 'counselorId';
      const query = firestore().collection('conversations').where(queryField, '==', userId);

      const unsubscribe = query.onSnapshot(snapshot => {
        if (!snapshot || snapshot.empty) { setMessages([]); setLoading(false); return; }
        const list: Message[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const isStudent = role === 'student';
          return {
            id: doc.id,
            otherPersonId: isStudent ? data.counselorId : data.studentId,
            otherPersonName: isStudent ? data.counselorName || 'Counselor' : data.studentName || 'Student',
            otherPersonAvatar: isStudent
              ? data.counselorAvatar || `https://ui-avatars.com/api/?name=${data.counselorName}&background=random`
              : data.studentAvatar || `https://ui-avatars.com/api/?name=${data.studentName}&background=random`,
            lastMessage: data.lastMessage || 'Start a conversation',
            timestamp: data.lastMessageTime,
            unread: isStudent ? data.unread : data.counselorUnread,
            isOnline: Math.random() > 0.6,
          };
        });
        list.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
        setMessages(list);
        setLoading(false);
      });
      return unsubscribe;
    };

    const unsub = setupListener();
    return () => { unsub.then(fn => fn && fn()); };
  }, []);

  const renderOnlineUser = ({item}: {item: Message}) => (
    <TouchableOpacity
      style={styles.onlineUserContainer}
      onPress={() => navigation.navigate('ChatScreen', {
        conversationId: item.id,
        otherPersonName: item.otherPersonName,
        otherPersonId: item.otherPersonId,
      })}>
      <View style={styles.onlineAvatarRing}>
        <Image source={{uri: item.otherPersonAvatar}} style={styles.onlineAvatar} />
        <View style={styles.onlineBadgeLarge} />
      </View>
      <Text style={styles.onlineName} numberOfLines={1}>{item.otherPersonName.split(' ')[0]}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          
          {/* LEFT: BACK BUTTON + TITLE */}
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <BackIcon />
            </TouchableOpacity>
            
            <View>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>
                {userRole === 'student' ? 'Chat with counselors' : 'Student inquiries'}
              </Text>
            </View>
          </View>

          {/* RIGHT: COMPOSE BUTTON */}
          {userRole === 'counselor' && (
            <TouchableOpacity
              style={styles.composeBtn}
              onPress={() => navigation.navigate('CounselorStudentNewChat')}>
              <EditIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* --- CONTENT AREA --- */}
      <View style={styles.contentContainer}>
        {loading ? (
           <View style={styles.skeletonContainer}>
             <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
           </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyStateGraphic />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>When you connect with someone, your chat will appear here.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.storiesSection}>
              <Text style={styles.sectionLabel}>ACTIVE NOW</Text>
              <FlatList
                horizontal
                data={messages}
                renderItem={renderOnlineUser}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesList}
              />
            </View>
            <View style={styles.listSection}>
              <Text style={styles.sectionLabel}>RECENT CHATS</Text>
              {messages.map((item, index) => (
                <MessageCard
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={() => navigation.navigate('ChatScreen', {
                    conversationId: item.id,
                    otherPersonName: item.otherPersonName,
                    otherPersonId: item.otherPersonId,
                  })}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#4F46E5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  // New container to align Back Button + Text
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4, // Hit slop
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 38,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '500',
    marginTop: -4,
  },
  composeBtn: {
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
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
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  storiesSection: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  storiesList: {
    paddingLeft: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginLeft: 24,
    marginBottom: 16,
  },
  onlineUserContainer: {
    marginRight: 20,
    alignItems: 'center',
    width: 60,
  },
  onlineAvatarRing: {
    padding: 3,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#4F46E5',
    marginBottom: 6,
    position: 'relative',
  },
  onlineAvatar: {
    width: 54, height: 54,
    borderRadius: 27,
    backgroundColor: '#CBD5E1',
  },
  onlineBadgeLarge: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  listSection: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#64748B',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardActive: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  cardAvatar: {
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMessage: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  boldText: { fontWeight: '700', color: '#0F172A' },
  accentText: { color: '#4F46E5', fontWeight: '700' },
  unreadDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonAvatar: {
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTextBarShort: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    width: '40%',
    marginBottom: 8,
  },
  skeletonTextBarLong: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    width: '80%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default MessagesScreen;