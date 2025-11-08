// import React, {useState, useEffect} from 'react';
// import {
//   StyleSheet,
//   Text,
//   View,
//   TextInput,
//   TouchableOpacity,
//   Modal,
// } from 'react-native';
// import auth from '@react-native-firebase/auth';
// import {useNavigation, NavigationProp} from '@react-navigation/native';
// import {RootStackParamList} from '../types/navigation';

// const LoginScreen = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [modalVisible, setModalVisible] = useState(false);
//   const [modalMessage, setModalMessage] = useState('');
//   const [isSigningIn, setIsSigningIn] = useState(false);

//   const navigation = useNavigation<NavigationProp<RootStackParamList>>();

//   // ✅ Listen to Firebase auth state
//   useEffect(() => {
//     const unsubscribe = auth().onAuthStateChanged(user => {
//       if (user) {
//         console.log('uid : ',user.uid);
//         // Reset navigation so back button won’t go back to Login
//         navigation.reset({
//           index: 0,
//           routes: [{name: 'Dashboard'}],
//         });
//       }
//     });

//     return unsubscribe;
//   }, [navigation]);

//   const showAlert = (message: string) => {
//     setModalMessage(message);
//     setModalVisible(true);
//   };

//   const handleLogin = async () => {
//     setIsSigningIn(true);
//     try {
//       await auth().signInWithEmailAndPassword(email, password);
//       // 🚀 No need to navigate here, listener will catch it
//     } catch (error: any) {
//       if (
//         error.code === 'auth/user-not-found' ||
//         error.code === 'auth/wrong-password'
//       ) {
//         showAlert('Invalid email or password.');
//       } else {
//         showAlert(error.message);
//       }
//     } finally {
//       setIsSigningIn(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Welcome</Text>
//       <Text style={styles.subtitle}>Sign in or create an account</Text>

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
//         style={[styles.button, isSigningIn && styles.buttonDisabled]}
//         onPress={handleLogin}
//         disabled={isSigningIn}>
//         <Text style={styles.buttonText}>
//           {isSigningIn ? 'Signing In...' : 'Sign In'}
//         </Text>
//       </TouchableOpacity>

//       {/* ✅ Navigate to SignUpScreen */}
//       <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
//         <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
//       </TouchableOpacity>
//       <TouchableOpacity onPress={() => navigation.navigate('LoginPage')}>
//         <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
//       </TouchableOpacity>

//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalView}>
//             <Text style={styles.modalText}>{modalMessage}</Text>
//             <TouchableOpacity
//               style={[styles.button, styles.buttonClose]}
//               onPress={() => setModalVisible(false)}>
//               <Text style={styles.buttonText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 24,
//     backgroundColor: '#2A2A2E',
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#FFF',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#A1A1A1',
//     textAlign: 'center',
//     marginBottom: 40,
//   },
//   input: {
//     backgroundColor: '#444449',
//     borderRadius: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     fontSize: 16,
//     color: '#FFF',
//     marginBottom: 16,
//   },
//   button: {
//     backgroundColor: '#EF5350',
//     borderRadius: 8,
//     paddingVertical: 14,
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   buttonDisabled: {backgroundColor: '#FF6F61'},
//   buttonText: {color: '#FFF', fontSize: 18, fontWeight: 'bold'},
//   linkText: {
//     color: '#A1A1A1',
//     textAlign: 'center',
//     marginTop: 10,
//     fontSize: 16,
//   },
//   modalOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.7)',
//   },
//   modalView: {
//     backgroundColor: '#393940',
//     borderRadius: 12,
//     padding: 24,
//     alignItems: 'center',
//     width: '80%',
//   },
//   modalText: {
//     marginBottom: 16,
//     textAlign: 'center',
//     color: '#FFF',
//     fontSize: 16,
//   },
//   buttonClose: {marginTop: 10, width: '100%'},
// });

// export default LoginScreen;
