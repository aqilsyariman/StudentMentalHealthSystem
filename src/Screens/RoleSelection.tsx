import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

type Role = 'student' | 'counselor';
type Gender = 'male' | 'female';

type RoleSelectionProps = NativeStackScreenProps<
  RootStackParamList,
  'RoleSelection'
> & {
  onRoleSelected: (role: Role) => void;
};

const RoleSelection = ({onRoleSelected}: RoleSelectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // New States for Profile Data
  const [dob, setDob] = useState<Date | null>(null);
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const formSlideAnim = useRef(new Animated.Value(50)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (selectedRole) {
      Animated.parallel([
        Animated.timing(formFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(formSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedRole, formFadeAnim, formSlideAnim]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, close the picker immediately after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      if (Platform.OS === 'android') setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      setDob(selectedDate);

      // Calculate Age
      const today = new Date();
      let calculatedAge = today.getFullYear() - selectedDate.getFullYear();
      const m = today.getMonth() - selectedDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge.toString());
    }
  };

  const toggleDatePicker = () => {
    setShowDatePicker(prev => !prev);
  };

  const handleConfirmRole = async () => {
    if (!selectedRole || !dob || !gender || isLoading) {
      Alert.alert(
        'Missing Information',
        'Please complete all fields to continue.',
      );
      return;
    }

    setIsLoading(true);
    const user = auth().currentUser;

    if (!user) {
      Alert.alert('Session Expired', 'Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      const collection = selectedRole === 'student' ? 'students' : 'counselors';

      await firestore()
        .collection(collection)
        .doc(user.uid)
        .set({
          email: user.email,
          fullName: user.displayName || '',
          createdAt: firestore.FieldValue.serverTimestamp(),
          role: selectedRole,
          dateOfBirth: firestore.Timestamp.fromDate(dob),
          age: parseInt(age, 10),
          gender: gender,
        });

      onRoleSelected(selectedRole);
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'Could not save your choice. Please check your connection.',
      );
      setIsLoading(false);
    }
  };

  const welcomeName = auth().currentUser?.displayName?.split(' ')[0] || 'there';
  const isFormComplete = selectedRole && dob && gender;

  return (
    <LinearGradient
      colors={['#F8FAFC', '#D1E3FF', '#94b9ff']}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <Animated.View
          style={[
            styles.content,
            {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
          ]}>
          <View style={styles.header}>
            <Text style={styles.greeting}>
              Hi {welcomeName.charAt(0).toUpperCase() + welcomeName.slice(1)},
            </Text>
            <Text style={styles.title}>Let's set up your profile.</Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard
              title="Student"
              desc="Access counseling resources"
              image={require('../Assets/students.png')}
              isSelected={selectedRole === 'student'}
              onPress={() => setSelectedRole('student')}
              disabled={isLoading}
            />
            <RoleCard
              title="Counselor"
              desc="Manage students & sessions"
              image={require('../Assets/teacher.png')}
              isSelected={selectedRole === 'counselor'}
              onPress={() => setSelectedRole('counselor')}
              disabled={isLoading}
            />
          </View>

          {selectedRole && (
            <Animated.View
              style={{
                opacity: formFadeAnim,
                transform: [{translateY: formSlideAnim}],
              }}>
              <View style={styles.formContainer}>
                <Text style={styles.sectionLabel}>Personal Details</Text>

                {/* Date of Birth Trigger */}
                <TouchableOpacity
                  style={styles.inputButton}
                  onPress={toggleDatePicker}>
                  <View>
                    <Text style={styles.inputLabel}>Date of Birth</Text>
                    <Text
                      style={[
                        styles.inputValue,
                        !dob && styles.placeholderText,
                      ]}>
                      {dob ? dob.toLocaleDateString() : 'Select Date'}
                    </Text>
                  </View>
                  {age !== '' && (
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageText}>{age} y/o</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* THE FIXED DATE PICKER */}
                {showDatePicker && (
                  <View
                    style={
                      Platform.OS === 'ios'
                        ? styles.iosDatePickerContainer
                        : null
                    }>
                    <DateTimePicker
                      value={dob || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      themeVariant="light" // <--- Forces Black Text (Fixes visibility)
                      textColor="#000000" // <--- Forces Black Text (iOS specific)
                    />
                  </View>
                )}

                <Text
                  style={[styles.inputLabel, {marginTop: 16, marginBottom: 8}]}>
                  Sex
                </Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      gender === 'male' && styles.genderSelected,
                    ]}
                    onPress={() => setGender('male')}>
                    <Text
                      style={[
                        styles.genderText,
                        gender === 'male' && styles.genderTextSelected,
                      ]}>
                      Male
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      gender === 'female' && styles.genderSelected,
                    ]}
                    onPress={() => setGender('female')}>
                    <Text
                      style={[
                        styles.genderText,
                        gender === 'female' && styles.genderTextSelected,
                      ]}>
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}

          <Animated.View style={[styles.buttonWrapper]}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isFormComplete && styles.buttonDisabled,
              ]}
              onPress={handleConfirmRole}
              disabled={isLoading || !isFormComplete}>
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Get Started</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

// ... (Keep RoleCard component same as before)
interface RoleCardProps {
  title: string;
  desc: string;
  image: any;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
}

const RoleCard = ({
  title,
  desc,
  image,
  isSelected,
  onPress,
  disabled,
}: RoleCardProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    disabled={disabled}
    style={[styles.card, isSelected && styles.cardSelected]}>
    <View style={styles.cardLayout}>
      <View
        style={[
          styles.iconContainer,
          isSelected && styles.iconContainerSelected,
        ]}>
          {typeof image === 'string' ? (
          <Text style={styles.iconText}>{image}</Text>
        ) : (
          <Image
            source={image}
            style={styles.iconImage}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.cardTextContent}>
        <Text style={[styles.roleTitle, isSelected && styles.textSelected]}>
          {title}
        </Text>
        <Text style={styles.roleDescription}>{desc}</Text>
      </View>
      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // ... (Keep existing styles from previous code)
  container: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: 40, paddingTop: 60},
  content: {paddingHorizontal: 24},
  header: {marginBottom: 24},
  greeting: {fontSize: 18, color: '#64748b', fontWeight: '500'},
  title: {fontSize: 32, fontWeight: '800', color: '#1e293b', marginTop: 8},
  subtitle: {fontSize: 16, color: '#64748b', marginTop: 12, lineHeight: 22},
  cardsContainer: {gap: 16},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardSelected: {borderColor: '#3b82f6', backgroundColor: '#f0f7ff'},
  cardLayout: {flexDirection: 'row', alignItems: 'center'},
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {backgroundColor: '#3b82f6'},
  iconText: {fontSize: 28},
  cardTextContent: {flex: 1, marginLeft: 16},
  roleTitle: {fontSize: 18, fontWeight: '700', color: '#1e293b'},
  textSelected: {color: '#1e293b'},
  roleDescription: {fontSize: 13, color: '#64748b', marginTop: 4},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {borderColor: '#3b82f6'},
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },

  formContainer: {
    marginTop: 30,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  inputButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
  },
  inputValue: {fontSize: 16, color: '#1e293b', fontWeight: '600'},
  placeholderText: {color: '#cbd5e1'},
  ageBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ageText: {color: '#0284c7', fontWeight: '700', fontSize: 14},
  genderContainer: {flexDirection: 'row', gap: 12},
  genderOption: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  genderSelected: {borderColor: '#3b82f6', backgroundColor: '#eff6ff'},
  genderText: {fontSize: 16, fontWeight: '600', color: '#64748b'},
  genderTextSelected: {color: '#3b82f6', fontWeight: '700'},
  buttonWrapper: {marginTop: 32},
  confirmButton: {
    backgroundColor: '#1e293b',
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0},
  confirmButtonText: {color: '#FFF', fontSize: 18, fontWeight: '700'},

  // --- NEW STYLE FOR DATE PICKER VISIBILITY ---
  iosDatePickerContainer: {
    backgroundColor: '#FFFFFF', // Solid white background
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconImage: {
  width: 40,
  height: 40,
},

});

export default RoleSelection;
