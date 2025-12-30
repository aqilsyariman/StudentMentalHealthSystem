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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path} from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatScreen'>;

type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  senderName?: string;
};

const ChatScreen = ({navigation, route}: Props) => {
  const {conversationId, otherPersonName, otherPersonId} = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherPersonAvatar, setOtherPersonAvatar] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    // Fetch other person's avatar
    const fetchAvatar = async () => {
      try {
        const userDoc = await firestore()
          .collection('students')
          .doc(otherPersonId)
          .get();

        const fallbackAvatar = `https://i.pravatar.cc/150?u=${otherPersonId}`;

        if (!userDoc.exists) {
          const counselorDoc = await firestore()
            .collection('counselors')
            .doc(otherPersonId)
            .get();

          if (counselorDoc.exists()) {
            setOtherPersonAvatar(counselorDoc.data()?.photoURL || fallbackAvatar);
          } else {
            setOtherPersonAvatar(fallbackAvatar);
          }
        } else {
          setOtherPersonAvatar(userDoc.data()?.photoURL || fallbackAvatar);
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
      }
    };

    fetchAvatar();

    // Listen to messages
    const unsubscribe = firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .onSnapshot(
        snapshot => {
          if (!snapshot) {
            setMessages([]);
            setLoading(false);
            return;
          }

          const messagesList: ChatMessage[] = snapshot.docs.map(doc => ({
            id: doc.id,
            text: doc.data().text || '',
            senderId: doc.data().senderId || '',
            timestamp: doc.data().timestamp,
            senderName: doc.data().senderName || '',
          }));

          setMessages(messagesList);
          setLoading(false);
        },
        error => {
          console.error('Error fetching messages:', error);
          setMessages([]);
          setLoading(false);
        },
      );

    // Mark messages as read
    if (currentUserId) {
      firestore()
        .collection('conversations')
        .doc(conversationId)
        .get()
        .then(doc => {
          if (doc.exists()) {
            const data = doc.data();
            const isStudent = data?.studentId === currentUserId;

            firestore()
              .collection('conversations')
              .doc(conversationId)
              .update({
                [isStudent ? 'unread' : 'counselorUnread']: false,
              });
          }
        });
    }

    return () => unsubscribe();
  }, [conversationId, otherPersonId, currentUserId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUserId) {return;}

    const messageText = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    try {
      // Get sender name
      let senderName = 'User';
      const studentDoc = await firestore()
        .collection('students')
        .doc(currentUserId)
        .get();

      if (studentDoc.exists()) {
        senderName = studentDoc.data()?.fullName || 'Student';
      } else {
        const counselorDoc = await firestore()
          .collection('counselors')
          .doc(currentUserId)
          .get();

        if (counselorDoc.exists()) {
          senderName = counselorDoc.data()?.fullName || 'Counselor';
        }
      }

      // Add message to subcollection
      await firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          text: messageText,
          senderId: currentUserId,
          senderName: senderName,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      // Update conversation with last message
      const conversationDoc = await firestore()
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (conversationDoc.exists()) {
        const data = conversationDoc.data();
        const isStudent = data?.studentId === currentUserId;

        await firestore()
          .collection('conversations')
          .doc(conversationId)
          .update({
            lastMessage: messageText,
            lastMessageTime: firestore.FieldValue.serverTimestamp(),
            [isStudent ? 'counselorUnread' : 'unread']: true,
          });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatDateHeader = (timestamp: any) => {
    if (!timestamp) {return '';}
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayLocal = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateLocal.getTime() === todayLocal.getTime()) {
      return 'Today';
    } else if (dateLocal.getTime() === yesterdayLocal.getTime()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const shouldShowDateHeader = (currentMsg: ChatMessage, nextMsg: ChatMessage | undefined) => {
    if (!currentMsg.timestamp) {return false;}
    if (!nextMsg || !nextMsg.timestamp) {return true;}

    const currentDate = currentMsg.timestamp.toDate();
    const nextDate = nextMsg.timestamp.toDate();

    return currentDate.toDateString() !== nextDate.toDateString();
  };

  const renderMessage = ({item, index}: {item: ChatMessage; index: number}) => {
    const isMyMessage = item.senderId === currentUserId;
    const showDate = shouldShowDateHeader(item, messages[index + 1]);

    return (
      <View>
        {showDate && (
          <View style={styles.dateHeaderContainer}>
             <Text style={styles.dateHeader}>{formatDateHeader(item.timestamp)}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessage : styles.theirMessage,
          ]}>
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText,
            ]}>
            {item.text}
          </Text>
          {item.timestamp && (
            <Text style={[styles.timeText, isMyMessage ? {color: 'rgba(255,255,255,0.7)'} : {color: '#94A3B8'}]}>
              {item.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* --- NEW HEADER UI (Logic Unchanged) --- */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          {/* Avatar Display in Header */}
          <View style={styles.headerAvatarContainer}>
             <Image source={{ uri: otherPersonAvatar || `https://i.pravatar.cc/150?u=${otherPersonId}` }} style={styles.headerAvatarImage} />
          </View>
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{otherPersonName}</Text>
          <Text style={styles.headerSubtitle}>Active Now</Text>
        </View>

        <View style={styles.decorativeCircle} />
      </View>
      {/* --------------------------------------- */}

      {/* Messages List */}
      <View style={styles.contentContainer}>
        {loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        ) : (
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                inverted
                contentContainerStyle={styles.messagesListContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToOffset({offset: 0, animated: true})}
            />
        )}
      </View>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Text style={styles.actionButtonText}>+</Text>
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
        </View>

        {inputText.trim().length > 0 ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            activeOpacity={0.7}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
               <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#4F46E5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
             {/* Mic Icon */}
             <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2}>
                <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <Path d="M12 19v4" />
                <Path d="M8 23h8" />
             </Svg>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // --- HEADER STYLES ---
  headerContainer: {
    backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
    zIndex: 2,
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
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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

  // --- MESSAGES ---
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesListContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5', // Indigo Theme
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1E293B',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeader: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // --- INPUT AREA ---
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionButtonText: {
    fontSize: 20,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: -2,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  input: {
    fontSize: 15,
    color: '#1E293B',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;