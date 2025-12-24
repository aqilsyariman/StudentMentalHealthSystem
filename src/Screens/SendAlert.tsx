import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,

  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path} from 'react-native-svg';

// --- ICONS ---

const SendIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </Svg>
);

const SendAlertScreen = ({navigation}: {navigation: any}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  // --- 1. FETCH STUDENTS ---
  useEffect(() => {
    const fetchStudents = async () => {
      const counselorId = auth().currentUser?.uid;
      if (!counselorId) return;

      try {
        const snapshot = await firestore()
          .collection('students')
          .where('counselorId', '==', counselorId)
          .get();

        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().fullName || 'Unknown Student',
          email: doc.data().email,
        }));
        setStudents(list);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // --- 2. SEND ALERT LOGIC ---
  const handleSend = async () => {
    if (!selectedStudentId) {
      Alert.alert('Required', 'Please select a student.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter a message.');
      return;
    }

    setSending(true);
    const counselorId = auth().currentUser?.uid;

    try {
      // Create the Notification Object
      await firestore().collection('notifications').add({
        recipientId: selectedStudentId, // Student receives this
        senderId: counselorId,          // You sent it
        title: getTitleBySeverity(severity),
        message: message,
        type: 'alert',
        severity: severity,             // 'info', 'warning', 'critical'
        read: false,                    // Unread by default
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Alert sent successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send alert.');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const getTitleBySeverity = (sev: string) => {
    if (sev === 'critical') return 'URGENT: Wellness Check';
    if (sev === 'warning') return 'Wellness Update Required';
    return 'Message from Counselor';
  };

  // --- RENDER HELPERS ---
  const renderSeverityOption = (level: 'info' | 'warning' | 'critical', label: string, color: string) => (
    <TouchableOpacity
      style={[
        styles.severityOption,
        severity === level && {backgroundColor: color, borderColor: color},
      ]}
      onPress={() => setSeverity(level)}>
      <Text style={[styles.severityText, severity === level && {color: '#FFF'}]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      

      

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. SEVERITY SELECTOR */}
        <Text style={styles.sectionLabel}>Priority Level</Text>
        <View style={styles.severityContainer}>
          {renderSeverityOption('info', 'Info', '#3B82F6')}
          {renderSeverityOption('warning', 'Warning', '#F59E0B')}
          {renderSeverityOption('critical', 'Critical', '#EF4444')}
        </View>

        {/* 2. RECIPIENT SELECTOR */}
        <Text style={styles.sectionLabel}>Select Student</Text>
        {loading ? (
          <ActivityIndicator color="#6366F1" />
        ) : (
          <View style={styles.studentListContainer}>
            {students.map((student) => (
              <TouchableOpacity
                key={student.id}
                style={[
                  styles.studentItem,
                  selectedStudentId === student.id && styles.studentSelected
                ]}
                onPress={() => setSelectedStudentId(student.id)}>
                <View style={[
                  styles.radioCircle,
                  selectedStudentId === student.id && styles.radioSelected
                ]} />
                <Text style={[
                  styles.studentName,
                  selectedStudentId === student.id && {color: '#4F46E5', fontWeight: '700'}
                ]}>{student.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 3. MESSAGE INPUT */}
        <Text style={styles.sectionLabel}>Message</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your alert message here..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />
        </View>

        {/* QUICK TAGS */}
        <View style={styles.quickTags}>
          {['Please book a session', 'Update your logs', 'Urgent check-in'].map(tag => (
            <TouchableOpacity key={tag} onPress={() => setMessage(tag)} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* FOOTER BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.sendButton, (sending || !selectedStudentId) && styles.disabledButton]} 
          onPress={handleSend}
          disabled={sending || !selectedStudentId}>
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.sendButtonText}>Send Alert</Text>
              <SendIcon />
            </>
          )}
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Severity
  severityContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  severityText: {
    fontWeight: '600',
    color: '#374151',
  },
  // Student List
  studentListContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 10,
    maxHeight: 200, // Limit height if many students
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  studentSelected: {
    backgroundColor: '#EEF2FF',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  studentName: {
    fontSize: 15,
    color: '#374151',
  },
  // Input
  inputWrapper: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
  },
  textInput: {
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
  // Tags
  quickTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '500',
  },
  // Footer
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SendAlertScreen;