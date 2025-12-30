import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  withSpring, 
  useSharedValue, 
  withSequence 
} from 'react-native-reanimated';

// --- COMPONENTS ---

// 1. Modern Header (Same as Schedule Screen)
const ModernHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      {/* Top Row: Back Button & Icon */}
      <View style={styles.headerTopRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>🔔</Text>
        </View>
      </View>

      {/* Title Section */}
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>

      {/* Decorative Circle */}
      <View style={styles.decorativeCircle} />
    </View>
  );
};

// 2. Animated Touchable for interactive elements
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SendAlertScreen = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  // Animation Values
  const buttonScale = useSharedValue(1);
  const navigation = useNavigation();

  // --- FETCH STUDENTS ---
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
          initials: (doc.data().fullName || 'U').charAt(0).toUpperCase(),
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

  // --- LOGIC ---
  const handleSend = async () => {
    if (!selectedStudentId) {
      Alert.alert('Missing Info', 'Please select a student first.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing Info', 'Please write a message.');
      return;
    }

    setSending(true);
    // Button Bounce Animation
    buttonScale.value = withSequence(withSpring(0.95), withSpring(1));
    
    const counselorId = auth().currentUser?.uid;

    try {
      await firestore().collection('notifications').add({
        recipientId: selectedStudentId,
        senderId: counselorId,
        title: getTitleBySeverity(severity),
        message: message,
        type: 'alert',
        severity: severity,
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Sent!', 'Your alert has been delivered.', [
        {text: 'Done', onPress: () => navigation.goBack()},
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

  const getSeverityStyle = (level: string) => {
    switch (level) {
      case 'critical': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'warning': return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      default: return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' }; // Info
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      <ModernHeader title="New Alert" subtitle="Notify a student instantly" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. SEVERITY SELECTOR */}
        <Animated.View style={styles.formCard} entering={FadeInDown.delay(100).duration(600)}>
          <Text style={styles.sectionLabel}>Priority Level</Text>
          <View style={styles.severityContainer}>
            {['info', 'warning', 'critical'].map((level) => {
              const isSelected = severity === level;
              const style = getSeverityStyle(level);
              return (
                 <TouchableOpacity
                    key={level}
                    activeOpacity={0.7}
                    onPress={() => setSeverity(level as any)}
                    style={[
                      styles.severityCard,
                      { 
                        backgroundColor: isSelected ? style.bg : '#F8FAFC',
                        borderColor: isSelected ? style.border : '#F1F5F9',
                      }
                    ]}
                 >
                    
                    <Text style={[
                      styles.severityText,
                      { color: isSelected ? style.text : '#64748B' }
                    ]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                 </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* 2. RECIPIENT SELECTOR */}
        <Animated.View style={[styles.formCard, { marginTop: 20 }]} entering={FadeInDown.delay(200).duration(600)}>
          <Text style={styles.sectionLabel}>Select Student</Text>
          {loading ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentScroll}>
              {students.map((student, index) => {
                const isSelected = selectedStudentId === student.id;
                return (
                  <AnimatedTouchableOpacity
                    key={student.id}
                    activeOpacity={0.8}
                    entering={FadeInDown.delay(index * 50 + 300)}
                    onPress={() => setSelectedStudentId(student.id)}
                    style={[
                      styles.studentCard,
                      isSelected && styles.studentCardSelected
                    ]}
                  >
                    <View style={[
                      styles.avatar,
                      isSelected ? { backgroundColor: '#4F46E5' } : { backgroundColor: '#EEF2FF' }
                    ]}>
                      <Text style={[
                        styles.avatarText,
                        isSelected ? { color: '#FFF' } : { color: '#4F46E5' }
                      ]}>{student.initials}</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.studentName, isSelected && styles.studentNameSelected]}>
                      {student.name.split(' ')[0]}
                    </Text>
                  </AnimatedTouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>

        {/* 3. MESSAGE INPUT */}
        <Animated.View style={[styles.formCard, { marginTop: 20 }]} entering={FadeInDown.delay(300).duration(600)}>
          <Text style={styles.sectionLabel}>Message</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your message here..."
              placeholderTextColor="#94A3B8"
              multiline
              value={message}
              onChangeText={setMessage}
            />
          </View>
          
          {/* Quick Tags */}
          <View style={styles.quickTagsContainer}>
            {['Please reply', 'Meeting required', 'Wellness Check', 'Urgent'].map(tag => (
              <TouchableOpacity 
                key={tag} 
                onPress={() => setMessage(prev => prev + (prev ? ' ' : '') + tag)}
                style={styles.tag}
              >
                <Text style={styles.tagText}>+ {tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* FOOTER BUTTON */}
        <Animated.View entering={FadeInUp.delay(400)} style={{ marginBottom: 40 }}>
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (sending || !selectedStudentId) && styles.disabledButton,
              { backgroundColor: severity === 'critical' ? '#EF4444' : severity === 'warning' ? '#F59E0B' : '#4F46E5' }
            ]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Send Alert</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },

  // --- Header Styles (Copied from Theme) ---
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
  headerIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
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

  // --- Form Cards ---
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  // --- Severity Chips ---
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  severityCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {
    fontWeight: '700',
    fontSize: 13,
  },

  // --- Student List ---
  studentScroll: {
    marginHorizontal: -10, // pull back to align with padding
  },
  studentCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 4,
    width: 70,
  },
  studentCardSelected: {
    transform: [{scale: 1.05}],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  studentName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  studentNameSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },

  // --- Input ---
  inputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 120,
  },
  textInput: {
    fontSize: 16,
    color: '#1E293B',
    textAlignVertical: 'top',
    flex: 1,
  },
  quickTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Button ---
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SendAlertScreen;