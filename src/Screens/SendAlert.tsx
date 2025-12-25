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
  
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path} from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  withSequence 
} from 'react-native-reanimated';


// --- ICONS ---
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 18l-6-6 6-6" />
  </Svg>
);

const SendIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </Svg>
);

// --- ANIMATED COMPONENTS ---
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SendAlertScreen = ({navigation}: {navigation: any}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  // Animation Values
  const buttonScale = useSharedValue(1);

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
    buttonScale.value = withSequence(withSpring(0.9), withSpring(1));
    
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

  // --- RENDER HELPERS ---
  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'critical': return ['#FF416C', '#FF4B2B']; // Red Gradient
      case 'warning': return ['#F7971E', '#FFD200']; // Orange Gradient
      default: return ['#56CCF2', '#2F80ED']; // Blue Gradient
    }
  };

  const SeverityCard = ({level, label}: {level: 'info' | 'warning' | 'critical', label: string}) => {
    const isSelected = severity === level;
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: withTiming(isSelected ? 1.05 : 1) }],
        opacity: withTiming(isSelected ? 1 : 0.6),
      };
    });

    const colors = getSeverityColor(level);

    return (
      <AnimatedTouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSeverity(level)}
        style={[styles.severityCard, animatedStyle]}
      >
        <LinearGradient
          colors={isSelected ? colors : ['#FFFFFF', '#F9FAFB']}
          style={styles.severityGradient}
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        >
          <Text style={[
            styles.severityText, 
            { color: isSelected ? '#FFF' : '#6B7280' }
          ]}>
            {label}
          </Text>
          {isSelected && <View style={styles.activeDot} />}
        </LinearGradient>
      </AnimatedTouchableOpacity>
    );
  };

  return (
    <LinearGradient 
      colors={['#F0F3FF', '#FFFFFF']} 
      style={styles.container}
      start={{x: 0, y: 0}} end={{x: 1, y: 1}}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}>
          
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* HEADER WITH BACK BUTTON */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.headerRow}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
              >
                <BackIcon />
              </TouchableOpacity>
              
              <View>
                <Text style={styles.headerTitle}>New Alert</Text>
                <Text style={styles.headerSubtitle}>Notify a student instantly.</Text>
              </View>
            </Animated.View>

            {/* 1. SEVERITY SELECTOR */}
            <Animated.View style={styles.section} entering={FadeInDown.delay(200).duration(600)}>
              <Text style={styles.sectionLabel}>Priority Level</Text>
              <View style={styles.severityContainer}>
                <SeverityCard level="info" label="Info" />
                <SeverityCard level="warning" label="Warning" />
                <SeverityCard level="critical" label="Critical" />
              </View>
            </Animated.View>

            {/* 2. RECIPIENT SELECTOR */}
            <Animated.View style={styles.section} entering={FadeInDown.delay(300).duration(600)}>
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
                        entering={FadeInDown.delay(index * 50 + 300)}
                        onPress={() => setSelectedStudentId(student.id)}
                        style={[
                          styles.studentCard,
                          isSelected && styles.studentCardSelected
                        ]}
                      >
                        <LinearGradient
                          colors={isSelected ? ['#6366F1', '#4F46E5'] : ['#FFFFFF', '#F3F4F6']}
                          style={styles.avatar}
                        >
                          <Text style={[styles.avatarText, isSelected && {color: '#FFF'}]}>{student.initials}</Text>
                        </LinearGradient>
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
            <Animated.View style={styles.section} entering={FadeInDown.delay(400).duration(600)}>
              <Text style={styles.sectionLabel}>Message</Text>
              <View style={[styles.inputContainer, styles.shadow]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your message..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={message}
                  onChangeText={setMessage}
                />
                {/* Quick Tags */}
                <View style={styles.quickTagsContainer}>
                  {['Book Session', 'Update Log', 'Urgent'].map(tag => (
                    <TouchableOpacity 
                      key={tag} 
                      onPress={() => setMessage(prev => prev + (prev ? ' ' : '') + tag)}
                      style={styles.tag}
                    >
                      <Text style={styles.tagText}>+ {tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>

          </ScrollView>

          {/* FOOTER BUTTON */}
          <Animated.View entering={FadeInUp.delay(600)} style={styles.footer}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={handleSend}
              disabled={sending}
            >
              <LinearGradient
                colors={!selectedStudentId ? ['#D1D5DB', '#9CA3AF'] : getSeverityColor(severity)}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.sendButton}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.sendButtonText}>Send {severity.toUpperCase()} Alert</Text>
                    <SendIcon />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  // HEADER
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    // Soft shadow for button
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // SECTIONS
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // SEVERITY CARDS
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  severityCard: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFF',
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  severityGradient: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  severityText: {
    fontWeight: '700',
    fontSize: 13,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginLeft: 6,
  },

  // STUDENTS
  studentScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  studentCard: {
    alignItems: 'center',
    marginRight: 16,
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
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  studentName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  studentNameSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },

  // INPUT
  inputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F9FAFB',
  },
  textInput: {
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'top',
    flex: 1,
  },
  quickTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },

  // FOOTER
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 10 : 24,
  },
  sendButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SendAlertScreen;