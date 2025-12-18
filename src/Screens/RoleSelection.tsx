import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

type Role = 'student' | 'counselor';

type RoleSelectionProps = NativeStackScreenProps<RootStackParamList, 'RoleSelection'> & {
  onRoleSelected: (role: Role) => void;
};

const RoleSelection = ({onRoleSelected}: RoleSelectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
      Animated.spring(slideAnim, {toValue: 0, tension: 40, friction: 8, useNativeDriver: true}),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (selectedRole) {
      Animated.spring(buttonScale, {toValue: 1, useNativeDriver: true, tension: 100}).start();
    }
  }, [selectedRole, buttonScale]);

  const handleConfirmRole = async () => {
    if (!selectedRole || isLoading) {
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
      await firestore().collection(collection).doc(user.uid).set({
        email: user.email,
        fullName: user.displayName || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        role: selectedRole,
      });

      onRoleSelected(selectedRole);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not save your choice. Please check your connection.');
      setIsLoading(false);
    }
  };

  const welcomeName = auth().currentUser?.displayName?.split(' ')[0] || 'there';

  return (
    <LinearGradient colors={['#F8FAFC', '#D1E3FF', '#94b9ff']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <Animated.View style={[styles.content, {opacity: fadeAnim, transform: [{translateY: slideAnim}]}]}>
          <View style={styles.header}>
            <Text style={styles.greeting}>Hi {welcomeName.charAt(0).toUpperCase() + welcomeName.slice(1)},</Text>
            <Text style={styles.title}>How will you use the app?</Text>
            <Text style={styles.subtitle}>Choose your profile type to customize your experience.</Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard
              title="Student"
              desc="Access counseling and resources"
              icon="🎓"
              isSelected={selectedRole === 'student'}
              onPress={() => setSelectedRole('student')}
              disabled={isLoading}
            />
            <RoleCard
              title="Counselor"
              desc="Manage students and sessions"
              icon="🤝"
              isSelected={selectedRole === 'counselor'}
              onPress={() => setSelectedRole('counselor')}
              disabled={isLoading}
            />
          </View>

          <Animated.View style={[styles.buttonWrapper, {transform: [{scale: buttonScale}]}]}>
            <TouchableOpacity
              style={[styles.confirmButton, !selectedRole && styles.buttonDisabled]}
              onPress={handleConfirmRole}
              disabled={isLoading || !selectedRole}
            >
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

interface RoleCardProps {
  title: string;
  desc: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
}

const RoleCard = ({title, desc, icon, isSelected, onPress, disabled}: RoleCardProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    disabled={disabled}
    style={[styles.card, isSelected && styles.cardSelected]}
  >
    <View style={styles.cardLayout}>
      <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.cardTextContent}>
        <Text style={[styles.roleTitle, isSelected && styles.textSelected]}>{title}</Text>
        <Text style={styles.roleDescription}>{desc}</Text>
      </View>
      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
  },
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
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f7ff',
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#3b82f6',
  },
  iconText: {
    fontSize: 28,
  },
  cardTextContent: {
    flex: 1,
    marginLeft: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  textSelected: {
    color: '#1e293b',
  },
  roleDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#3b82f6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  buttonWrapper: {
    marginTop: 40,
  },
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
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default RoleSelection;