import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';


const DetailsScreen = () => {



  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.welcomeUser}>Hello!</Text>
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  fullContainer: {flex: 1, backgroundColor: '#ece9faff'},
  scrollContainer: {padding: 20, paddingBottom: 80},
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6f5be1ff',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 25,
    letterSpacing: 1,
  },
  welcomeUser: {
    fontSize: 35,
    color: '#482ce7ff',
    fontWeight: '800',
    marginTop: 100,
    textAlign: 'left',
  },
  signOutButton: {
    backgroundColor: '#7B68EE',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 20,
  },
  signOutButtonText: {color: '#FFF', fontWeight: '600'},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#7B68EE', // subtle purple shadow instead of black
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8, // keeps Android shadow soft but present
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12, // gives space between icon and text (React Native 0.71+)
    paddingVertical: 8,
  },
  cardContainerColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  textGroup: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 18,
    color: '#4A4A4A',
    marginBottom: 6, // adds vertical spacing like before
  },

  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#6f5be1ff',
  },
  // valueText: {fontSize: 18, color: '#4A4A4A', marginBottom: 8},
  valueHighlight: {fontWeight: '700', color: '#352f36'},
  timestamp: {fontSize: 12, color: '#6f5be1ff', marginTop: 4},
  warning: {
    textAlign: 'center',
    color: '#FF6F61',
    fontSize: 15,
    marginTop: 30,
    fontWeight: '600',
  },
});

export default DetailsScreen;
