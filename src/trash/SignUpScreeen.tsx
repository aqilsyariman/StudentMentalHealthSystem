// import React, { useState } from 'react';
// import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal } from 'react-native';
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';
// import { useNavigation } from '@react-navigation/native';

// const SignUpScreen = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [modalVisible, setModalVisible] = useState(false);
//   const [modalMessage, setModalMessage] = useState('');
//   const [isSigningUp, setIsSigningUp] = useState(false);

//   const navigation = useNavigation();

//   const showAlert = (message: string) => {
//     setModalMessage(message);
//     setModalVisible(true);
//   };

//   const handleSignUp = async () => {
//     setIsSigningUp(true);
//     try {
//       const userCredential = await auth().createUserWithEmailAndPassword(email, password);

//       // Store user info in Firestore
//       await firestore().collection('users').doc(userCredential.user.uid).set({
//         email: userCredential.user.email,
//         createdAt: firestore.FieldValue.serverTimestamp(),
//       });

//       showAlert('Account created successfully! You are now logged in.');
//     } catch (error: any) {
//       if (error.code === 'auth/email-already-in-use') {
//         showAlert('That email address is already in use!');
//       } else if (error.code === 'auth/invalid-email') {
//         showAlert('That email address is invalid!');
//       } else {
//         showAlert(error.message);
//       }
//     } finally {
//       setIsSigningUp(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Sign Up</Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Email"
//         placeholderTextColor="#A1A1A1"
//         keyboardType="email-address"
//         autoCapitalize="none"
//         value={email}
//         onChangeText={setEmail}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         placeholderTextColor="#A1A1A1"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//       />

//       <TouchableOpacity
//         style={[styles.button, isSigningUp && styles.buttonDisabled]}
//         onPress={handleSignUp}
//         disabled={isSigningUp}
//       >
//         <Text style={styles.buttonText}>{isSigningUp ? 'Signing Up...' : 'Sign Up'}</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigation.goBack()}>
//         <Text style={styles.linkText}>Already have an account? Sign In</Text>
//       </TouchableOpacity>

//       {/* Modal for alerts */}
//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalText}>{modalMessage}</Text>
//             <TouchableOpacity
//               style={[styles.button, styles.buttonClose]}
//               onPress={() => setModalVisible(false)}
//             >
//               <Text style={styles.buttonText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#2A2A2E' },
//   title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 40 },
//   input: {
//     backgroundColor: '#444449',
//     borderRadius: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     fontSize: 16,
//     color: '#FFF',
//     marginBottom: 16,
//   },
//   button: { backgroundColor: '#EF5350', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
//   buttonDisabled: { backgroundColor: '#FF6F61' },
//   buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
//   linkText: { color: '#A1A1A1', textAlign: 'center', marginTop: 10 },
//   modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
//   modalView: { backgroundColor: '#393940', borderRadius: 12, padding: 24, alignItems: 'center', width: '80%' },
//   modalText: { marginBottom: 16, textAlign: 'center', color: '#FFF', fontSize: 16 },
//   buttonClose: { marginTop: 10, width: '100%' },
// });

// export default SignUpScreen;
