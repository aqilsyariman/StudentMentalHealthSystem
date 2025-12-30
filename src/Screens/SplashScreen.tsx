import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Image, StyleSheet, Animated} from 'react-native';

const SplashScreen = () => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20); // Update every 20ms to simulate loading

    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
        <Image
          testID="logo"
          source={require('../Assets/new login logo.png')}
          style={styles.logo}
        />
        <Text style={styles.welcomeText}>Welcome</Text>
        <View style={styles.progressBarContainer}>
          <View
            testID="progress-bar"
            style={[styles.progressBar, {width: `${loadingProgress}%`}]}
          />
        </View>
        <Text style={styles.progressText}>{loadingProgress}%</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 30,
  },
  progressBarContainer: {
    width: '80%',
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2', // A nice blue color
    borderRadius: 5,
  },
  progressText: {
    fontSize: 16,
    color: '#333333',
  },
});

export default SplashScreen;