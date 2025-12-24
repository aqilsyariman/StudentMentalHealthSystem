import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native'; // Added navigation import

// --- Interfaces ---
interface Student {
  id: string;
  fullName: string;
  email: string;
  photoURL?: string;
}

interface ScheduleData {
  title: string;
  place: string;
  reason: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  studentId: string;
  studentName: string;
  meetingWith: 'Counselor' | 'Doctor' | 'Other';
}

// --- Components ---

// Updated Header with Back Button
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
          <Text style={styles.headerIcon}>📅</Text>
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

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  icon: string;
}) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputContainer, multiline && styles.inputContainerMultiline]}>
      <Text style={styles.inputIcon}>{icon}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  </View>
);

export default function ScheduleScreen() {
  // --- State ---
  const defaultStart = new Date();
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = new Date();
  defaultEnd.setHours(10, 0, 0, 0);

  const [schedule, setSchedule] = useState<ScheduleData>({
    title: '',
    place: '',
    reason: '',
    date: new Date(),
    startTime: defaultStart,
    endTime: defaultEnd,
    studentId: '',
    studentName: '',
    meetingWith: 'Counselor',
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(true);
  
  // UI State
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'date' | 'start' | 'end' | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // --- Effects ---

  useEffect(() => {
    const fetchAssignedStudents = async () => {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      try {
        const snapshot = await firestore()
          .collection('students')
          .where('counselorId', '==', currentUser.uid) 
          .get();

        const studentList = snapshot.docs.map(doc => ({
          id: doc.id,
          fullName: doc.data().fullName || 'Unknown Student',
          email: doc.data().email || '',
          photoURL: doc.data().photoURL,
        })) as Student[];
        
        setStudents(studentList);
      } catch (error) {
        console.error("Error fetching students:", error);
        Alert.alert("Notice", "Could not fetch assigned students.");
      } finally {
        setFetchingStudents(false);
      }
    };

    fetchAssignedStudents();
  }, []);

  // --- Handlers ---

  const getPickerValue = () => {
    if (currentField === 'date') return schedule.date;
    if (currentField === 'start') return schedule.startTime;
    if (currentField === 'end') return schedule.endTime;
    return new Date();
  };

  const openPicker = (field: 'date' | 'start' | 'end') => {
    setCurrentField(field);
    setPickerMode(field === 'date' ? 'date' : 'time');
    setShowPicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      if (currentField === 'date') setSchedule(p => ({ ...p, date: selectedDate }));
      else if (currentField === 'start') setSchedule(p => ({ ...p, startTime: selectedDate }));
      else if (currentField === 'end') setSchedule(p => ({ ...p, endTime: selectedDate }));
    }
  };

  const handleSubmit = async () => {
    if (!schedule.title || !schedule.studentId) {
      Alert.alert('Missing Info', 'Please fill in the Title and select a Student.');
      return;
    }

    setLoading(true);
    const currentUser = auth().currentUser;

    try {
      await firestore().collection('schedules').add({
        title: schedule.title,
        place: schedule.place,
        reason: schedule.reason,
        meetingWith: schedule.meetingWith,
        date: firestore.Timestamp.fromDate(schedule.date),
        startTime: firestore.Timestamp.fromDate(schedule.startTime),
        endTime: firestore.Timestamp.fromDate(schedule.endTime),
        counselorId: currentUser?.uid,
        studentId: schedule.studentId,
        studentName: schedule.studentName,
        createdAt: firestore.FieldValue.serverTimestamp(),
        status: 'upcoming'
      });

      Alert.alert('Success', 'Schedule created successfully!');
      setSchedule(prev => ({
        ...prev,
        title: '',
        place: '',
        reason: '',
        studentId: '',
        studentName: '',
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to create schedule.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render Helpers ---

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      <ModernHeader title="New Session" subtitle="Schedule a meeting" />

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Student Selector Card */}
        <TouchableOpacity style={styles.studentSelectorCard} onPress={() => setShowStudentModal(true)} activeOpacity={0.9}>
          <View>
            <Text style={styles.cardLabel}>Student</Text>
            <Text style={[styles.studentSelectorText, !schedule.studentName && styles.placeholderText]}>
              {schedule.studentName || 'Select Assigned Student'}
            </Text>
          </View>
          <View style={styles.arrowContainer}>
             <Text style={styles.arrowText}>↓</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.formCard}>
          {/* Meeting Type Chips */}
          <Text style={styles.sectionLabel}>Meeting With</Text>
          <View style={styles.chipRow}>
            {['Counselor', 'Doctor', 'Other'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, schedule.meetingWith === type && styles.chipActive]}
                onPress={() => setSchedule(p => ({ ...p, meetingWith: type as any }))}
              >
                <Text style={[styles.chipText, schedule.meetingWith === type && styles.chipTextActive]}>
                  {type === 'Counselor' ? 'Me' : type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <InputField
            label="Title"
            placeholder="e.g. Weekly Review"
            value={schedule.title}
            onChangeText={(t) => setSchedule(p => ({ ...p, title: t }))}
            icon="✨"
          />

          <InputField
            label="Location"
            placeholder="e.g. Room 302 / Online"
            value={schedule.place}
            onChangeText={(t) => setSchedule(p => ({ ...p, place: t }))}
            icon="📍"
          />

          {/* Date & Time Row */}
          <View style={styles.row}>
            <TouchableOpacity style={styles.dateTimeBox} onPress={() => openPicker('date')}>
               <Text style={styles.dateTimeLabel}>Date</Text>
               <Text style={styles.dateTimeValue}>{formatDate(schedule.date)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.dateTimeBox, { flex: 1, marginRight: 8 }]} onPress={() => openPicker('start')}>
               <Text style={styles.dateTimeLabel}>Start</Text>
               <Text style={styles.dateTimeValue}>{formatTime(schedule.startTime)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateTimeBox, { flex: 1, marginLeft: 8 }]} onPress={() => openPicker('end')}>
               <Text style={styles.dateTimeLabel}>End</Text>
               <Text style={styles.dateTimeValue}>{formatTime(schedule.endTime)}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />

          <InputField
            label="Notes"
            placeholder="Tap to add details..."
            value={schedule.reason}
            onChangeText={(t) => setSchedule(p => ({ ...p, reason: t }))}
            multiline
            icon="📝"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Confirm Schedule</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* --- Student Modal --- */}
      <Modal visible={showStudentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Assigned Student</Text>
            <TouchableOpacity onPress={() => setShowStudentModal(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          {fetchingStudents ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.studentItem}
                  onPress={() => {
                    setSchedule(p => ({ ...p, studentId: item.id, studentName: item.fullName }));
                    setShowStudentModal(false);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.fullName}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                  </View>
                  <Text style={styles.selectAction}>Select</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No assigned students found.</Text>
                  <Text style={styles.emptyStateSubtext}>Ensure students have your ID in their profile.</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* --- Date Picker Modal (iOS) --- */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>{pickerMode === 'date' ? 'Select Date' : 'Select Time'}</Text>
                <TouchableOpacity onPress={() => { setShowPicker(false); setCurrentField(null); }}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={getPickerValue()}
                mode={pickerMode}
                display="spinner"
                onChange={onDateChange}
                textColor="black"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={getPickerValue()}
          mode={pickerMode}
          display="default"
          onChange={onDateChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// --- Modern Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  
  // --- Updated Header Styles ---
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

  // Student Card
  studentSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  studentSelectorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  placeholderText: {
    color: '#64748B',
    fontStyle: 'italic',
  },
  arrowContainer: {
    backgroundColor: '#F1F5F9',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: '#4F46E5',
    fontWeight: 'bold',
  },

  // Form Card
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
    marginBottom: 12,
  },
  
  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#4F46E5',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },

  // Inputs
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Date Time Box
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateTimeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Submit Button
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

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  selectAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },

  // IOS Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  pickerCancel: {
    color: '#64748B',
    fontSize: 16,
  },
  pickerDone: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },
});