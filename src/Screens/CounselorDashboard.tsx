import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import Svg, {Path, Circle, G} from 'react-native-svg';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const CounselorDashboard = () => {
  const [activeStudents, setActiveStudents] = useState<number | null>(null);

 // --- ADD THIS BLOCK ---
useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        // 1. Get the 'students' collection using the new getDocs() method
        const snapshot = await firestore().collection('students').get(); // <-- THE FIX

        // 2. The count is just the 'size' of the result
        setActiveStudents(snapshot.size); // Or setStudentCount(snapshot.size)

      } catch (error) {
        console.error('Error fetching student count: ', error);
        setActiveStudents(0); // Or setStudentCount(0)
      }
    };

    fetchStudentCount();
  }, []); // Runs once on load
  // ---

  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View>
          <Text style={styles.welcomeUser}>Hello, Doctor!</Text>
        </View>
        <Text style={styles.appTitle}>Student Support Hub</Text>
        <View>
          <Card title="Active Student">
            <View style={styles.cardContainerColumn}>
              <Svg width={80} height={80} viewBox="0 0 200 200">
                {/* Circle background */}
                <Circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="#fffefeff" // background color
                  stroke="#000"
                  strokeWidth="6"
                />

                {/* Original trophy path */}
                <G fill="#000000" scale="0.4" x={20} y={17}>
                  <Path
                    d="M363.663,294.916c0-18.823-13.48-34.545-31.289-38.05v-25.655c0-2.333-1.086-4.534-2.938-5.953
          c-1.853-1.42-4.26-1.895-6.514-1.289l-8.355,2.25c-22.41-37.422-57.92-48.108-75.395-51.131v-19.483
          c5.289-4.545,10.184-10.16,14.557-16.779c1.775-2.688,3.422-5.512,4.965-8.434c0.021,0.008,0.039,0.017,0.061,0.023
          c1.959,0.635,3.953,0.936,5.932,0.936c9.098,0,18.565-6.189,21.023-16.258c5.732-23.485-13.5-28.398-13.83-28.458
          c0.689-5.758,1.059-11.639,1.059-17.602C272.938,7.156,233.647,0,204.093,0c-29.551,0-68.838,7.156-68.838,69.035
          c0,5.963,0.37,11.844,1.059,17.602c-0.329,0.06-19.763,5.184-13.831,28.461c2.559,10.043,11.927,16.255,21.025,16.255
          c1.977,0,3.972-0.302,5.931-0.936c0.021-0.007,0.04-0.016,0.061-0.023c1.543,2.922,3.189,5.746,4.965,8.434
          c4.373,6.619,9.267,12.234,14.555,16.779v19.483c-17.476,3.023-52.983,13.713-75.394,51.131l-8.354-2.25
          c-2.254-0.604-4.661-0.13-6.513,1.289c-1.853,1.419-2.938,3.62-2.938,5.953v25.654c-17.812,3.504-31.291,19.227-31.291,38.051
          c0,18.822,13.479,34.549,31.291,38.053v32.199c0,3.326,2.191,6.256,5.383,7.195l120.7,35.523c0.695,0.204,1.408,0.305,2.117,0.305
          c0.025,0,0.052,0,0.077,0c0.718,0.002,1.472-0.093,2.192-0.305l120.701-35.508c3.191-0.94,5.383-3.868,5.383-7.195v-32.215
          C350.184,329.465,363.663,313.738,363.663,294.916z M269.264,101.639c2.336,1.52,3.334,5.254,2.176,8.834
          c-1.103,3.402-3.871,5.766-6.535,5.869C266.626,111.619,268.085,106.707,269.264,101.639z M136.752,110.474
          c-1.158-3.579-0.16-7.313,2.177-8.834c1.18,5.067,2.638,9.979,4.358,14.702C140.625,116.236,137.855,113.875,136.752,110.474z
          M204.093,15c31.995,0,53.399,9.029,53.825,52.721c-26.49,5.475-50.976,0.613-72.852-14.498
          c-12.249-8.462-20.517-18.125-24.52-23.389C169.911,18.174,185.141,15,204.093,15z M166.98,130.559
          c-10.785-16.326-16.725-38.175-16.725-61.523c0-9.746,1.02-17.805,2.942-24.455c5.171,5.98,12.778,13.604,22.817,20.618
          c13.961,9.756,34.738,19.657,61.55,19.657c6.219,0,12.766-0.541,19.625-1.732c-1.896,17.955-7.396,34.447-15.977,47.436
          c-10.152,15.367-23.336,23.83-37.12,23.83C190.312,154.389,177.131,145.926,166.98,130.559z M177.259,189.085
          c3.837-0.381,6.76-3.608,6.76-7.464v-16.475c6.406,2.791,13.149,4.242,20.074,4.242c6.927,0,13.671-1.451,20.079-4.243v16.476
          c0,3.855,2.924,7.083,6.76,7.464c3.428,0.34,9.418,1.203,16.707,3.348c-3.697,11.395-22.129,20.362-43.542,20.362
          c-21.414,0-39.847-8.968-43.544-20.362C167.842,190.288,173.831,189.425,177.259,189.085z M59.529,294.916
          c0-10.499,6.836-19.432,16.291-22.58v45.156C66.365,314.345,59.529,305.414,59.529,294.916z M196.52,390.666l-105.7-31.108
          v-118.56l105.7,28.468V390.666z M204.096,255.973L108.778,230.3c10.99-16.63,25.02-26.6,37.757-32.561
          c6.21,17.444,29.267,30.056,57.563,30.056s51.345-12.613,57.552-30.06c12.738,5.96,26.773,15.931,37.764,32.565L204.096,255.973z
          M317.374,359.572l-105.701,31.095V269.466l105.701-28.468V359.572z M332.374,317.492v-45.156
          c9.453,3.149,16.289,12.081,16.289,22.58C348.663,305.413,341.827,314.344,332.374,317.492z"
                  />
                </G>
              </Svg>
              <View style={styles.textContainer}>
                <ValueText
                value={
                    activeStudents !== null ? activeStudents : 'Loading...'
                  }
                />
              </View>
            </View>
          </Card>
        </View>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => auth().signOut()}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const Card = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const ValueText = ({
  label,
  value,
}: {
  label?: string;
  value: string | number;
}) => (
  <Text style={styles.valueText}>
    {label ? `${label}: ` : ''}
    <Text style={styles.valueHighlight}>{value}</Text>
  </Text>
);

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

export default CounselorDashboard;
