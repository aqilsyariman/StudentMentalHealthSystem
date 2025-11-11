import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, {Path, G, Rect} from 'react-native-svg';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { RootStackParamList } from '../types/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// --- Icon Component (Added) ---
// This is the "warning" icon you provided
const WarningIcon = ({color = '#FF6F61'}) => (
  // eslint-disable-next-line react-native/no-inline-styles
  <View style={{width: 24, height: 24}}>
    <Svg viewBox="0 0 24 24" fill="none">
      <G
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round">
        <Path d="M12 10V13" />
        <Path d="M12 16V15.9888" />
        <Path d="M10.2518 5.147L3.6508 17.0287C2.91021 18.3618 3.87415 20 5.39912 20H18.6011C20.126 20 21.09 18.3618 20.3494 17.0287L13.7484 5.147C12.9864 3.77538 11.0138 3.77538 10.2518 5.147Z" />
      </G>
    </Svg>
  </View>
);

// --- Mock Data (Added) ---
const recentAlerts = [
  {
    id: '1',
    title: 'Student [Name] has a critical alert',
    time: '1 hour ago',
    status: 'High',
    color: '#FF6F61', // Red for 'High'
  },
  {
    id: '2',
    title: 'Student [Name] is pending approval',
    time: '2 hour ago',
    status: 'On Hold',
    color: '#FFA500', // Orange for 'On Hold'
  },
];

const todaysSchedule = [
  {
    id: '1',
    time: '10:30 AM - 11:30 AM',
    title: 'Online Meeting with Student A',
    subtitle: 'Virtual Meeting',
    color: '#5A9CFF', // Blue
  },
  {
    id: '2',
    time: '11:30 AM - 12:30 PM',
    title: 'Pending Meeting with Group B',
    subtitle: 'Virtual Meeting',
    color: '#FFA500', // Orange
  },
];


type Props = NativeStackScreenProps<RootStackParamList, 'CounselorDashboard'>;

const CounselorDashboard = ({ navigation }: Props) => {
  const [activeStudents, setActiveStudents] = useState<number | null>(null);

  useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        const snapshot = await firestore().collection('students').get();
        setActiveStudents(snapshot.size);
      } catch (error) {
        console.error('Error fetching student count: ', error);
        setActiveStudents(0);
      }
    };

    fetchStudentCount();
  }, []);

  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View>
          <Text style={styles.welcomeUser}>Hello, Doctor!</Text>
        </View>
        <Text style={styles.appTitle}>Student Support Hub</Text>
        <View>
          {/* --- Active Student Card (Existing) --- */}
          <Card>
            <TouchableOpacity onPress={() => navigation.navigate('ListStudent')} style={styles.cardContainerColumn}>
              <Svg width={80} height={80} viewBox="0 0 200 200">
                {/* Circle background (Keep this, it's fine) */}

                <G fill="#4b84abff" scale="0.4" x={20} y={30}>
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
                <Text style={styles.titleText}>Active Student</Text>
                <ValueText
                  value={
                    activeStudents !== null ? activeStudents : 'Loading...'
                  }
                />
                <Text style={styles.titleText}>+2 This month</Text>
              </View>
            </TouchableOpacity>
          </Card>
          <Card>
            <View style={styles.cardContainerColumn}>
              <Svg width={80} height={80} viewBox="30 30 200 200">
                <G
                  scale="7"
                  x="40"
                  y="50"
                  fill="none"
                  stroke="#fc9c42ff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <Path d="M12 10V13" />
                  <Path d="M12 16V15.9888" />
                  <Path d="M10.2518 5.147L3.6508 17.0287C2.91021 18.3618 3.87415 20 5.39912 20H18.6011C20.126 20 21.09 18.3618 20.3494 17.0287L13.7484 5.147C12.9864 3.77538 11.0138 3.77538 10.2518 5.147Z" />
                </G>
              </Svg>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Active Alerts</Text>
                <ValueText
                  value={
                    activeStudents !== null ? activeStudents : 'Loading...'
                  }
                />
                <Text style={styles.titleText}>+2 This month</Text>
              </View>
            </View>
          </Card>
          <Card>
            <View style={styles.cardContainerColumn}>
              <Svg width={80} height={80} viewBox="30 30 200 200">
                {/* This G component scales the 24x24 icon and centers it within the 200x200 view. */}
                <G
                  scale="7"
                  x="40"
                  y="55"
                  fill="none" // The icon is outline-based
                  stroke="#8dd087ff" // Dark Gray/Black from original
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  {/* Path 1: The shield outline */}
                  <Path d="M5.60608 5.74025L12 3L18.3939 5.74025C18.7616 5.89783 19 6.25937 19 6.6594V13.5181C19 15.6712 17.8463 17.6593 15.9768 18.7275L12 21L8.02317 18.7275C6.15372 17.6593 5 15.6712 5 13.5181V6.6594C5 6.25937 5.2384 5.89783 5.60608 5.74025Z" />

                  {/* Path 2: The checkmark */}
                  <Path d="M15 10L11 14L9 12" />
                </G>
              </Svg>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Avg. Wellness Score</Text>
                <ValueText
                  value={
                    activeStudents !== null ? activeStudents : 'Loading...'
                  }
                />
                <Text style={styles.titleText}>+2 This month</Text>
              </View>
            </View>
          </Card>
          <Card>
            <View style={styles.cardContainerColumn}>
              <Svg width={80} height={80} viewBox="30 30 200 200">
                <G scale="0.234" x="64" y="70" fill="#727930ff">
                  <Rect
                    x="119.256"
                    y="222.607"
                    width="50.881"
                    height="50.885"
                  />
                  {/* ... (rest of calendar paths) ... */}
                  <Rect
                    x="341.863"
                    y="222.607"
                    width="50.881"
                    height="50.885"
                  />
                  <Rect
                    x="267.662"
                    y="222.607"
                    width="50.881"
                    height="50.885"
                  />
                  <Rect x="119.256" y="302.11" width="50.881" height="50.885" />
                  <Rect x="267.662" y="302.11" width="50.881" height="50.885" />
                  <Rect x="193.46" y="302.11" width="50.881" height="50.885" />
                  <Rect
                    x="341.863"
                    y="381.612"
                    width="50.881"
                    height="50.885"
                  />
                  <Rect
                    x="267.662"
                    y="381.612"
                    width="50.881"
                    height="50.885"
                  />
                  <Rect x="193.46" y="381.612" width="50.881" height="50.885" />
                  <Path d="M439.277,55.046h-41.376v39.67c0,14.802-12.195,26.84-27.183,26.84h-54.025 c-14.988,0-27.182-12.038-27.182-26.84v-39.67h-67.094v39.297c0,15.008-12.329,27.213-27.484,27.213h-53.424 c-15.155,0-27.484-12.205-27.484-27.213V55.046H72.649c-26.906,0-48.796,21.692-48.796,48.354v360.246 c0,26.661,21.89,48.354,48.796,48.354h366.628c26.947,0,48.87-21.692,48.87-48.354V103.4 C488.147,76.739,466.224,55.046,439.277,55.046z M453.167,462.707c0,8.56-5.751,14.309-14.311,14.309H73.144 c-8.56,0-14.311-5.749-14.311-14.309V178.089h394.334V462.707z" />
                  <Path d="M141.525,102.507h53.392c4.521,0,8.199-3.653,8.199-8.144v-73.87c0-11.3-9.27-20.493-20.666-20.493h-28.459 c-11.395,0-20.668,9.192-20.668,20.493v73.87C133.324,98.854,137.002,102.507,141.525,102.507z" />
                  <Path d="M316.693,102.507h54.025c4.348,0,7.884-3.513,7.884-7.826V20.178C378.602,9.053,369.474,0,358.251,0H329.16 c-11.221,0-20.349,9.053-20.349,20.178v74.503C308.81,98.994,312.347,102.507,316.693,102.507z" />
                </G>
              </Svg>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Scheduled Sessions</Text>
                <ValueText
                  value={
                    activeStudents !== null ? activeStudents : 'Loading...'
                  }
                />
                <Text style={styles.titleText}>+2 This month</Text>
              </View>
            </View>
          </Card>

          {/* --- Quick Actions Card (Existing) --- */}
          <Card title="Quick Actions">
            <View style={styles.gridContainer}>
              {/* Box 1 */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box1]}>
                  {/* ... (plus icon) ... */}
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G
                      scale="5"
                      x="40"
                      y="40"
                      stroke="#489448ff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <Path d="M6 12H18M12 6V18" />
                    </G>
                  </Svg>
                  <Text style={styles.box1}>New Session</Text>
                </View>
              </TouchableOpacity>

              {/* Box 2 */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box2]}>
                  {/* ... (document icon) ... */}
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G
                      scale="5"
                      x="40"
                      y="40"
                      fill="none"
                      stroke="#755ca9ff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <Path d="M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H15.8C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C19 19.4802 19 18.9201 19 17.8V9M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M8.12695 21C8.571 19.2748 10.1371 18 12.0009 18C13.8648 18 15.4309 19.2748 15.8749 21M13 14C13 14.5523 12.5523 15 12 15C11.4477 15 11 14.5523 11 14C11 13.4477 11.4477 13 12 13C12.5523 13 13 13.4477 13 14Z" />
                    </G>
                  </Svg>
                  <Text style={styles.box2}>New Report</Text>
                </View>
              </TouchableOpacity>

              {/* Box 3 */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box3]}>
                  {/* ... (warning icon) ... */}
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G
                      scale="5"
                      x="40"
                      y="40"
                      fill="none"
                      stroke="#f15252ff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <Path d="M12 10V13" />
                      <Path d="M12 16V15.9888" />
                      <Path d="M10.2518 5.147L3.6508 17.0287C2.91021 18.3618 3.87415 20 5.39912 20H18.6011C20.126 20 21.09 18.3618 20.3494 17.0287L13.7484 5.147C12.9864 3.77538 11.0138 3.77538 10.2518 5.147Z" />
                    </G>
                  </Svg>
                  <Text style={styles.box3}>Send Alert</Text>
                </View>
              </TouchableOpacity>

              {/* Box 4 */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box4]}>
                  {/* ... (calendar icon) ... */}
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G scale="0.234" x="40" y="40" fill="#727930ff">
                      <Rect
                        x="119.256"
                        y="222.607"
                        width="50.881"
                        height="50.885"
                      />
                      {/* ... (rest of calendar paths) ... */}
                      <Rect
                        x="341.863"
                        y="222.607"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="267.662"
                        y="222.607"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="119.256"
                        y="302.11"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="267.662"
                        y="302.11"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="193.46"
                        y="302.11"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="341.863"
                        y="381.612"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="267.662"
                        y="381.612"
                        width="50.881"
                        height="50.885"
                      />
                      <Rect
                        x="193.46"
                        y="381.612"
                        width="50.881"
                        height="50.885"
                      />
                      <Path d="M439.277,55.046h-41.376v39.67c0,14.802-12.195,26.84-27.183,26.84h-54.025 c-14.988,0-27.182-12.038-27.182-26.84v-39.67h-67.094v39.297c0,15.008-12.329,27.213-27.484,27.213h-53.424 c-15.155,0-27.484-12.205-27.484-27.213V55.046H72.649c-26.906,0-48.796,21.692-48.796,48.354v360.246 c0,26.661,21.89,48.354,48.796,48.354h366.628c26.947,0,48.87-21.692,48.87-48.354V103.4 C488.147,76.739,466.224,55.046,439.277,55.046z M453.167,462.707c0,8.56-5.751,14.309-14.311,14.309H73.144 c-8.56,0-14.311-5.749-14.311-14.309V178.089h394.334V462.707z" />
                      <Path d="M141.525,102.507h53.392c4.521,0,8.199-3.653,8.199-8.144v-73.87c0-11.3-9.27-20.493-20.666-20.493h-28.459 c-11.395,0-20.668,9.192-20.668,20.493v73.87C133.324,98.854,137.002,102.507,141.525,102.507z" />
                      <Path d="M316.693,102.507h54.025c4.348,0,7.884-3.513,7.884-7.826V20.178C378.602,9.053,369.474,0,358.251,0H329.16 c-11.221,0-20.349,9.053-20.349,20.178v74.503C308.81,98.994,312.347,102.507,316.693,102.507z" />
                    </G>
                  </Svg>
                  <Text style={styles.box4}>Schedule</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card>

          {/* --- RECENT ALERTS CARD (Added) --- */}
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Recent Alerts</Text>
              <TouchableOpacity>
                <Text style={styles.showAllText}>Show All</Text>
              </TouchableOpacity>
            </View>
            {recentAlerts.map((item, index) => (
              <View key={item.id}>
                <View style={styles.alertItem}>
                  <WarningIcon color={item.color} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.time}</Text>
                  </View>
                  <View
                    style={[styles.statusTag, {backgroundColor: item.color}]}>
                    <Text style={styles.statusTagText}>{item.status}</Text>
                  </View>
                </View>
                {index < recentAlerts.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Card>

          {/* --- TODAYS SCHEDULE CARD (Added) --- */}
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Todays Schedule</Text>
              <TouchableOpacity>
                <Text style={styles.showAllText}>Show All</Text>
              </TouchableOpacity>
            </View>
            {todaysSchedule.map(item => (
              <View key={item.id} style={styles.scheduleItem}>
                <View
                  style={[styles.scheduleBar, {backgroundColor: item.color}]}
                />
                <View style={styles.itemContent}>
                  <Text style={styles.scheduleTime}>{item.time}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
            ))}
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

// --- THIS IS THE UPDATED CARD COMPONENT ---
// --- THIS IS THE UPDATED CARD COMPONENT ---
const Card = ({
  title,
  children,
  onPress, // <-- 1. Make sure you receive the onPress prop
}: {
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}) => (
  // 2. Change <View> to <TouchableOpacity>
  <TouchableOpacity
    style={styles.card}
    onPress={onPress} // 3. Pass the onPress prop here
    disabled={!onPress} // 4. (Good practice) Disable touch if no onPress is provided
    activeOpacity={onPress ? 0 : 1.0} // (Good practice) Only show feedback if pressable
  >
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </TouchableOpacity>
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
  fullContainer: {flex: 1, backgroundColor: '#d3dbf5ff'},
  scrollContainer: {padding: 20, paddingBottom: 80},
  appTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000ff',
    textAlign: 'left',
    marginTop: 40,
    marginBottom: 25,
    letterSpacing: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -5,
  },

  boxWrapper: {
    width: '50%',
    padding: 5,
  },

  box: {
    height: 75,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box1: {
    backgroundColor: '#dff6dfff',
    color: '#489448ff',
    fontSize: 12,
    fontWeight: '600',
  },
  box2: {
    backgroundColor: '#efe2fbff',
    color: '#755ca9ff',
    fontSize: 12,
    fontWeight: '600',
  },
  box3: {
    backgroundColor: '#f8e3e3ff',
    color: '#f15252ff',
    fontSize: 12,
    fontWeight: '600',
  },
  box4: {
    backgroundColor: '#f2f5d7ff',
    color: '#727930ff',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeUser: {
    fontFamily: 'System',
    fontSize: 35,
    color: '#3b5fc0ff',
    fontWeight: '700',
    marginTop: 50,
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
    shadowColor: '#7B68EE',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
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
    fontSize: 30,
    color: '#4A4A4A',
    marginTop: 6,
    marginBottom: 6,
    marginLeft: 15,
    fontWeight: '900',
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
  titleText: {fontSize: 13, fontWeight: '400', color: '#575557ff'},
  valueHighlight: {fontWeight: '700', color: '#352f36'},
  timestamp: {fontSize: 12, color: '#6f5be1ff', marginTop: 4},
  warning: {
    textAlign: 'center',
    color: '#FF6F61',
    fontSize: 15,
    marginTop: 30,
    fontWeight: '600',
  },

  // --- NEW STYLES ADDED BELOW ---

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    // Space between header and first item
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold', // Using 'bold' to match screenshot
    color: '#333',
  },
  showAllText: {
    fontSize: 14,
    color: '#7B68EE',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  itemContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusTag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTagText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    paddingVertical: 12, // Added padding to the item
    paddingHorizontal: 10, // Added padding to the item
  },
  scheduleBar: {
    width: 6,
    borderRadius: 3, // Rounded bar
    marginRight: 10, // Space between bar and text
  },
  scheduleTime: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    marginBottom: 4,
  },
});

export default CounselorDashboard;
