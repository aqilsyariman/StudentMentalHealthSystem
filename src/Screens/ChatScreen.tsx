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
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path, G, Circle} from 'react-native-svg';

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
  const [_loading, setLoading] = useState(true);
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

        if (!userDoc.exists) {
          const counselorDoc = await firestore()
            .collection('counselors')
            .doc(otherPersonId)
            .get();

          if (counselorDoc.exists()) {
            setOtherPersonAvatar(
              counselorDoc.data()?.photoURL ||
              `https://i.pravatar.cc/150?u=${otherPersonId}`
            );
          }
        } else {
          setOtherPersonAvatar(
            userDoc.data()?.photoURL ||
            `https://i.pravatar.cc/150?u=${otherPersonId}`
          );
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
        </View>
        {showDate && (
          <Text style={styles.dateHeader}>
            {formatDateHeader(item.timestamp)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
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

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => {
            // Navigate to profile or do nothing
          }}>
          <Image
            source={{uri: otherPersonAvatar || `https://i.pravatar.cc/150?u=${otherPersonId}`}}
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherPersonName}</Text>
            <Text style={styles.headerStatus}>Active now</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoButton} activeOpacity={0.7}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="1.5" fill="#000000" />
            <Circle cx="12" cy="6" r="1.5" fill="#000000" />
            <Circle cx="12" cy="18" r="1.5" fill="#000000" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToOffset({offset: 0, animated: true})}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.cameraButton} activeOpacity={0.7}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <G
              fill="none"
              stroke="#262626"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round">
              <Path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" />
              <Circle cx="12" cy="13" r="4" />
            </G>
          </Svg>
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#8E8E8E"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
        </View>

        {inputText.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            activeOpacity={0.7}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="#262626"
                  strokeWidth={2}
                  fill="none"
                />
                <Path
                  d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M15 9H15.01M9 9H9.01"
                  stroke="#262626"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle cx="12" cy="12" r="10" stroke="#262626" strokeWidth={2} fill="none" />
                <Path
                  d="M12 6V12L16 14"
                  stroke="#262626"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                  d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17"
                  stroke="#262626"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEFEF',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  headerStatus: {
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    marginVertical: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4e6fdbff',
    marginLeft: 'auto',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFEFEF',
    marginRight: 'auto',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#000000',
  },
  dateHeader: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E8E',
    marginVertical: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },
  cameraButton: {
    padding: 8,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 14,
    color: '#000000',
    maxHeight: 80,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095F6',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ChatScreen;
