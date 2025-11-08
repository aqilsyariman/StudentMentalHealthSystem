import React, {useState} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ✅ 1. Import navigation types
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

// ✅ 2. Define the navigation props for this screen
type NavigationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'RoleSelection'
>;

// ✅ 3. Define your custom props
type CustomProps = {
  onRoleSelected: (role: 'student' | 'counselor') => void;
};

// ✅ 4. Combine them into one type
type RoleSelectionProps = NavigationScreenProps & CustomProps;

// ✅ 5. Use the new type here. We only destructure onRoleSelected
//    because that's all we're using from the props.
const RoleSelection = ({ onRoleSelected }: RoleSelectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const user = auth().currentUser;
  const uid = user?.uid;
  const email = user?.email;
  const fullName = user?.displayName;

  const handleSelectRole = async (role: 'student' | 'counselor') => {
    if (!uid) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    const collection = role === 'student' ? 'students' : 'counselors';

    try {
      await firestore().collection(collection).doc(uid).set({
        email: email,
        fullName: fullName || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        role: role,
      });

      // Tell the parent (App.tsx) what just happened
      onRoleSelected(role);

    } catch (error) {
      console.error('Error saving role: ', error);
      Alert.alert('Error', 'Could not save your role. Please try again.');
      setIsLoading(false);
    }
  };

  // ... (rest of your component and styles) ...
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {fullName || 'User'}!</Text>
      <Text style={styles.subtitle}>Please select your role:</Text>
      <Button
        title={isLoading ? 'Saving...' : 'I am a Student'}
        onPress={() => handleSelectRole('student')}
        disabled={isLoading}
      />
      <View style={styles.spacer} />
      <Button
        title={isLoading ? 'Saving...' : 'I am a Counselor'}
        onPress={() => handleSelectRole('counselor')}
        disabled={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
  },
  spacer: {
    height: 20,
  },
});

export default RoleSelection;
