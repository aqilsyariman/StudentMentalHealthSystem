/* eslint-disable react-native/no-inline-styles */
import React, {useState /*useEffect*/} from 'react';
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
// import {useNavigation, NavigationProp} from '@react-navigation/native';
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

  // const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // ---------------- FIREBASE HANDLERS ----------------
  const handleSignUp = async () => {
    setIsSigningUp(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password,
      );
      await userCredential.user.updateProfile({displayName: fullName});
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
  const {height, width} = Dimensions.get('window');
  const imagePosition = useSharedValue(1);
  const formButtonScale = useSharedValue(1);

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const IS_SMALL_SCREEN = height < 700;
    const interpolation = interpolate(
      imagePosition.value,
      [0, IS_SMALL_SCREEN ? 1.2 : 1],
      // ✅ FIX: Wrap the ternary operator in parentheses ()
      [-height / (IS_SMALL_SCREEN ? 1.8 : 2), 0],
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
                href={require('../Assets/new login logo.png')}
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
              <Pressable
                style={({pressed}) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loginHandler}>
                <Text style={styles.buttonText}>LOG IN</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                style={({pressed}) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
                onPress={registerHandler}>
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

// ---------------- STYLES ----------------
const {height} = Dimensions.get('window');
// ✅ -- FIX 1: Check the screen height --
// The iPhone SE (3rd gen) has a height of 667.
// We'll use 700 as a safe breakpoint.
const IS_SMALL_SCREEN = height < 700;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#e7fdf5ff',
  },

  button: {
    backgroundColor: '#4e53bbff',
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#5C44E7',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  buttonPressed: {
    backgroundColor: '#3d3281ff',
    transform: [{scale: 0.98}],
    shadowOpacity: 0.3,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  bottomContainer: {
    justifyContent: 'center',
    height: height / 3,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#4e53bbff',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 25,
    paddingLeft: 10,
  },
  formButton: {
    backgroundColor: '#4e53bbff',
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#5C44E7',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
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
    top: IS_SMALL_SCREEN ? -25 : -25,
  },
});

export default LoginPage;
