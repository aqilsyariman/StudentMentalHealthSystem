/* eslint-disable react-native/no-inline-styles */
import React, {useState /*useEffect*/ } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';

import auth from '@react-native-firebase/auth';
// ✅ IMPORT UNCOMMENTED
// import {useNavigation, NavigationProp} from '@react-navigation/native';
// // ✅ Make sure this import points to your types file
// import {RootStackParamList} from '../types/navigation';
import Svg, {Image as SvgImage, Ellipse, ClipPath} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

const LoginPage = () => {
  // ---------------- STATE ----------------
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // ✅ NAVIGATION HOOK UNCOMMENTED
  // const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // ... (Your useEffect listeners are still commented out, that's fine for now) ...

  // ---------------- FIREBASE HANDLERS ----------------

  // ✅ THIS FUNCTION IS MODIFIED
  const handleSignUp = async () => {
    setIsSigningUp(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password,
      );

      // 1. Save the fullName to the user's profile
      await userCredential.user.updateProfile({ displayName: fullName });

      // 2. ✅ REMOVE THE NAVIGATION LINE
      // navigation.navigate('RoleSelection'); 
      
      // That's it!
      // Your App.tsx logic will now take over. It will see the new
      // user, check for a role (find 'null'), and automatically
      // show the RoleSelection screen.

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('That email address is already in use!');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('That email address is invalid!');
      } else {
        Alert.alert(error.message);
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      // 🚀 No navigation here → listener handles it (This is correct)
    } catch (error: any) {
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        Alert.alert('Invalid email or password.');
      } else {
        Alert.alert(error.message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // ---------------- ANIMATIONS ----------------
  // (All your animation code is untouched)
  const {height, width} = Dimensions.get('window');
  const imagePosition = useSharedValue(1);
  const formButtonScale = useSharedValue(1);

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const interpolation = interpolate(
      imagePosition.value,
      [0, 1],
      [-height / 2, 0],
    );
    return {
      transform: [{translateY: withTiming(interpolation, {duration: 1500})}],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const interpolation = interpolate(imagePosition.value, [0, 1], [250, 0]);
    return {
      opacity: withTiming(imagePosition.value, {duration: 500}),
      transform: [{translateY: withTiming(interpolation, {duration: 1000})}],
    };
  });

  const closeButtonContainerStyle = useAnimatedStyle(() => {
    const interpolation = interpolate(imagePosition.value, [0, 1], [180, 360]);
    return {
      opacity: withTiming(imagePosition.value === 1 ? 0 : 1, {duration: 800}),
      transform: [
        {rotate: withTiming(interpolation + 'deg', {duration: 1000})},
      ],
    };
  });

  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity:
        imagePosition.value === 0
          ? withDelay(400, withTiming(1, {duration: 800}))
          : withTiming(0, {duration: 300}),
    };
  });

  const formButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{scale: formButtonScale.value}],
    };
  });

  // ---------------- UI ACTIONS ----------------
  // (All your UI action code is untouched)
  const loginHandler = () => {
    imagePosition.value = 0;
    if (isRegistering) {
      setIsRegistering(false);
    }
  };

  const registerHandler = () => {
    imagePosition.value = 0;
    if (!isRegistering) {
      setIsRegistering(true);
    }
  };

  const closeHandler = () => {
    imagePosition.value = 1;
    setEmail('');
    setPassword('');
    setFullName('');
  };

  // ---------------- RENDER ----------------
  // (Your entire render method is untouched)
  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{flexGrow: 1}}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={styles.container}>
          <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle]}>
            <Svg height={height + 100} width={width}>
              <ClipPath id="clipPathId">
                <Ellipse cx={width / 2} rx={height} ry={height + 100} />
              </ClipPath>
              <SvgImage
                href={require('../Assets/MH logo.jpg')}
                width={width}
                height={height + 270}
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#clipPathId)"
              />
            </Svg>
            <Animated.View
              style={[styles.closeButtonContainer, closeButtonContainerStyle]}>
              <Text onPress={closeHandler}>X</Text>
            </Animated.View>
          </Animated.View>

          <View style={styles.bottomContainer}>
            {/* Buttons */}
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable style={styles.button} onPress={loginHandler}>
                <Text style={styles.buttonText}>LOG IN</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={buttonAnimatedStyle}>
              <Pressable style={styles.button} onPress={registerHandler}>
                <Text style={styles.buttonText}>REGISTER</Text>
              </Pressable>
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={[styles.formInputContainer, formAnimatedStyle]}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="black"
                style={styles.textInput}
                value={email}
                autoCapitalize="none"
                onChangeText={setEmail}
              />
              {isRegistering && (
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="black"
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="none"
                />
              )}
              <TextInput
                placeholder="Password"
                placeholderTextColor="black"
                style={styles.textInput}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <Animated.View
                style={[styles.formButton, formButtonAnimatedStyle]}>
                <Pressable
                  onPress={() => {
                    formButtonScale.value = withSequence(
                      withSpring(1.02),
                      withSpring(1),
                    );
                    if (isRegistering) {
                      handleSignUp();
                    } else {
                      handleLogin();
                    }
                  }}>
                  <Text style={styles.buttonText}>
                    {isRegistering
                      ? isSigningUp
                        ? 'REGISTERING...'
                        : 'REGISTER'
                      : isSigningIn
                      ? 'LOGGING IN...'
                      : 'LOG IN'}
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// (All your style code is untouched)
const {height} = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'flex-end'},
  button: {
    backgroundColor: 'rgba(123,104,238,0.8)',
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
  bottomContainer: {
    justifyContent: 'center',
    height: height / 3,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 25,
    paddingLeft: 10,
  },
  formButton: {
    backgroundColor: 'rgba(123,104,238,0.8)',
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formInputContainer: {
    marginBottom: 70,
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    justifyContent: 'center',
  },
  closeButtonContainer: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    borderRadius: 20,
    top: -20,
  },
});

export default LoginPage;
