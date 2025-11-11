import React, {useState} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

type NavigationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'RoleSelection'
>;

type CustomProps = {
  onRoleSelected: (role: 'student' | 'counselor') => void;
};

type RoleSelectionProps = NavigationScreenProps & CustomProps;

const RoleSelection = ({ onRoleSelected }: RoleSelectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  // --- FIX: We don't need these variables here anymore ---
  // const user = auth().currentUser; // <-- DELETE
  // const uid = user?.uid; // <-- DELETE
  // const email = user?.email; // <-- DELETE
  // const fullName = user?.displayName; // <-- DELETE

  const handleSelectRole = async (role: 'student' | 'counselor') => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    // --- We get the user data *only* when the button is pressed ---
    const user = auth().currentUser;

    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      setIsLoading(false);
      return;
    }

    // These variables now only exist inside this function
    const uid = user.uid;
    const email = user.email;
    const fullName = user.displayName;

    const collection = role === 'student' ? 'students' : 'counselors';

    try {
      await firestore().collection(collection).doc(uid).set({
        email: email,
        fullName: fullName || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        role: role,
      });

      onRoleSelected(role);

    } catch (error) {
      console.error('Error saving role: ', error);
      Alert.alert('Error', 'Could not save your role. Please try again.');
      setIsLoading(false);
    }
  };
  // --- We also need to get the name for the welcome message ---
  // --- We can get it from the user object directly ---
  const welcomeName = auth().currentUser?.displayName;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {welcomeName || 'User'}!</Text>
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
