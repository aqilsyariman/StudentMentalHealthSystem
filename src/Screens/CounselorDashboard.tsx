/* eslint-disable react-native/no-inline-styles */
import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import Svg, {Path, G, Rect} from 'react-native-svg';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

// --- MOCK DATA ---
const recentAlerts = [
  {
    id: '1',
    title: 'Student A has a critical alert',
    time: '1 hour ago',
    status: 'High',
    color: '#EF4444',
  },
  {
    id: '2',
    title: 'Student B is pending approval',
    time: '2 hours ago',
    status: 'On Hold',
    color: '#F59E0B',
  },
];

const todaysSchedule = [
  {
    id: '1',
    time: '10:30 AM',
    endTime: '11:30 AM',
    title: 'Meeting with Student A',
    subtitle: 'Virtual • Anxiety Check-in',
    color: '#3B82F6',
  },
  {
    id: '2',
    time: '02:00 PM',
    endTime: '03:00 PM',
    title: 'Group Therapy B',
    subtitle: 'Room 304 • Stress Management',
    color: '#8B5CF6',
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'CounselorDashboard'>;

const CounselorDashboard = ({navigation}: Props) => {
  const [activeStudents, setActiveStudents] = useState<number | null>(null);
  const [counselorName, setCounselorName] = useState<string>('Loading...');

  // --- LOGIC ---
  const fetchStudentCount = async (currentCounselorId: string) => {
    try {
      const snapshot = await firestore()
        .collection('students')
        .where('counselorId', '==', currentCounselorId)
        .get();
      setActiveStudents(snapshot.size);
    } catch (error) {
      console.error('Error fetching student count: ', error);
      setActiveStudents(0);
    }
  };

  const fetchCounselorName = async (currentCounselorId: string) => {
    if (!currentCounselorId) {
      setCounselorName('Guest');
      return;
    }
    try {
      const counselorDocument = await firestore()
        .collection('counselors')
        .doc(currentCounselorId)
        .get();

      if (!counselorDocument.exists) {
        setCounselorName('Unknown Counselor');
        return;
      }
      const data = counselorDocument.data();
      if (data && data.fullName) {
        setCounselorName(data.fullName);
      } else {
        setCounselorName('Name Missing');
      }
    } catch (error) {
      console.error('Error fetching counselor name: ', error);
      setCounselorName('Error Loading Name');
    }
  };

  useFocusEffect(
    useCallback(() => {
      const currentUserId = auth().currentUser?.uid;
      if (currentUserId) {
        fetchStudentCount(currentUserId);
        fetchCounselorName(currentUserId);
      } else {
        setActiveStudents(0);
        setCounselorName('Guest');
      }
    }, []),
  );

  const handleSignOut = () => {
    auth().signOut();
  };

  // --- RENDER ---
  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f8fc" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Image
            style={styles.profileCircle}
            source={{
              uri: `https://ui-avatars.com/api/?name=${counselorName}&background=8B5CF6&color=fff&size=150`,
            }}
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Hello, {counselorName.split(' ')[0]}!
            </Text>
            <Text style={styles.subtitle}>Counselor Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => navigation.navigate('Messages')}
            activeOpacity={0.7}>
            <Image
              source={require('../Assets/message.png')}
              style={{width: 35, height: 35}}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* 1. OVERVIEW SECTION */}
        <SectionHeader title="Overview" />
        <View style={styles.statsGrid}>
          <StatCard
            label="Active Students"
            value={activeStudents !== null ? activeStudents : '-'}
            subLabel="+2 this month"
            icon={require('../Assets/students.png')}
            color="#3B82F6"
            onPress={() => navigation.navigate('ListStudent')}
          />
          <StatCard
            label="Active Alerts"
            value="3"
            subLabel="Needs attention"
            icon={require('../Assets/warning.png')}
            color="#EF4444"
            isWarning
          />
          <StatCard
            label="Avg Wellness"
            value="78%"
            subLabel="Stable"
            icon={require('../Assets/services.png')}
            color="#10B981"
          />
          <StatCard
            label="Sessions"
            value="5"
            subLabel="Today"
            icon={require('../Assets/schedule.png')}
            color="#F59E0B"
          />
        </View>

        {/* 2. QUICK ACTIONS (Restored Original) */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.cardContainer}>
           <View style={styles.gridContainer}>
              {/* Box 1: Add Student */}
              <TouchableOpacity
                style={styles.boxWrapper}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AddStudentScreen')}>
                <View style={[styles.box, styles.box1]}>
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G scale="5" x="40" y="40" stroke="#489448ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M6 12H18M12 6V18" />
                    </G>
                  </Svg>
                  <Text style={styles.boxText1}>Add Student</Text>
                </View>
              </TouchableOpacity>

              {/* Box 2: New Report */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box2]}>
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G scale="5" x="40" y="40" fill="none" stroke="#755ca9ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H15.8C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C19 19.4802 19 18.9201 19 17.8V9M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M8.12695 21C8.571 19.2748 10.1371 18 12.0009 18C13.8648 18 15.4309 19.2748 15.8749 21M13 14C13 14.5523 12.5523 15 12 15C11.4477 15 11 14.5523 11 14C11 13.4477 11.4477 13 12 13C12.5523 13 13 13.4477 13 14Z" />
                    </G>
                  </Svg>
                  <Text style={styles.boxText2}>New Report</Text>
                </View>
              </TouchableOpacity>

              {/* Box 3: Send Alert */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box3]}>
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G scale="5" x="40" y="40" fill="none" stroke="#f15252ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M12 10V13" />
                      <Path d="M12 16V15.9888" />
                      <Path d="M10.2518 5.147L3.6508 17.0287C2.91021 18.3618 3.87415 20 5.39912 20H18.6011C20.126 20 21.09 18.3618 20.3494 17.0287L13.7484 5.147C12.9864 3.77538 11.0138 3.77538 10.2518 5.147Z" />
                    </G>
                  </Svg>
                  <Text style={styles.boxText3}>Send Alert</Text>
                </View>
              </TouchableOpacity>

              {/* Box 4: Schedule */}
              <TouchableOpacity style={styles.boxWrapper} activeOpacity={0.7}>
                <View style={[styles.box, styles.box4]}>
                  <Svg width={35} height={35} viewBox="0 0 200 200">
                    <G scale="0.234" x="40" y="40" fill="#727930ff">
                      <Rect x="119.256" y="222.607" width="50.881" height="50.885" />
                      <Rect x="341.863" y="222.607" width="50.881" height="50.885" />
                      <Rect x="267.662" y="222.607" width="50.881" height="50.885" />
                      <Rect x="119.256" y="302.11" width="50.881" height="50.885" />
                      <Rect x="267.662" y="302.11" width="50.881" height="50.885" />
                      <Rect x="193.46" y="302.11" width="50.881" height="50.885" />
                      <Rect x="341.863" y="381.612" width="50.881" height="50.885" />
                      <Rect x="267.662" y="381.612" width="50.881" height="50.885" />
                      <Rect x="193.46" y="381.612" width="50.881" height="50.885" />
                      <Path d="M439.277,55.046h-41.376v39.67c0,14.802-12.195,26.84-27.183,26.84h-54.025 c-14.988,0-27.182-12.038-27.182-26.84v-39.67h-67.094v39.297c0,15.008-12.329,27.213-27.484,27.213h-53.424 c-15.155,0-27.484-12.205-27.484-27.213V55.046H72.649c-26.906,0-48.796,21.692-48.796,48.354v360.246 c0,26.661,21.89,48.354,48.796,48.354h366.628c26.947,0,48.87-21.692,48.87-48.354V103.4 C488.147,76.739,466.224,55.046,439.277,55.046z M453.167,462.707c0,8.56-5.751,14.309-14.311,14.309H73.144 c-8.56,0-14.311-5.749-14.311-14.309V178.089h394.334V462.707z" />
                      <Path d="M141.525,102.507h53.392c4.521,0,8.199-3.653,8.199-8.144v-73.87c0-11.3-9.27-20.493-20.666-20.493h-28.459 c-11.395,0-20.668,9.192-20.668,20.493v73.87C133.324,98.854,137.002,102.507,141.525,102.507z" />
                      <Path d="M316.693,102.507h54.025c4.348,0,7.884-3.513,7.884-7.826V20.178C378.602,9.053,369.474,0,358.251,0H329.16 c-11.221,0-20.349,9.053-20.349,20.178v74.503C308.81,98.994,312.347,102.507,316.693,102.507z" />
                    </G>
                  </Svg>
                  <Text style={styles.boxText4}>Schedule</Text>
                </View>
              </TouchableOpacity>
            </View>
        </View>

        {/* 3. RECENT ALERTS */}
        <SectionHeader title="Recent Alerts" />
        <View style={styles.cardContainer}>
           <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Attention Needed</Text>
              <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
           </View>
           
           {recentAlerts.map((alert, index) => (
             <View key={alert.id}>
               <View style={styles.alertRow}>
                 <View style={[styles.iconBadge, {backgroundColor: alert.color + '15'}]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={alert.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><Path d="M12 9v4" /><Path d="M12 17h.01" /></Svg>
                 </View>
                 <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertTime}>{alert.time}</Text>
                 </View>
                 <View style={[styles.statusPill, {backgroundColor: alert.color}]}>
                    <Text style={styles.statusText}>{alert.status}</Text>
                 </View>
               </View>
               {index < recentAlerts.length - 1 && <View style={styles.divider} />}
             </View>
           ))}
        </View>

        {/* 4. TODAY'S SCHEDULE */}
        <SectionHeader title="Today's Agenda" />
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Upcoming Sessions</Text>
              <TouchableOpacity><Text style={styles.viewAllText}>Calendar</Text></TouchableOpacity>
           </View>
          
          {todaysSchedule.map((item) => (
            <View key={item.id} style={styles.scheduleItem}>
              <View style={styles.timeColumn}>
                <Text style={styles.startTime}>{item.time}</Text>
                <Text style={styles.endTime}>{item.endTime}</Text>
              </View>
              <View style={[styles.scheduleCard, {borderLeftColor: item.color}]}>
                <Text style={styles.scheduleTitle}>{item.title}</Text>
                <Text style={styles.scheduleSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

// --- HELPER COMPONENTS ---

const SectionHeader = ({title}: {title: string}) => (
  <View style={styles.sectionHeaderContainer}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

const StatCard = ({label, value, subLabel, icon, color, isWarning, onPress}: any) => (
  <TouchableOpacity 
    style={styles.statCard} 
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={[styles.statHeader]}>
      <View style={[styles.iconBadge, {backgroundColor: color + '15'}]}>
        <Image 
          source={icon} 
          style={{width: 22, height: 22}} // <--- tintColor removed
          resizeMode="contain" 
        />
      </View>
      {isWarning && <View style={styles.redDot} />}
    </View>
    <Text style={[styles.statValue, {color: isWarning ? color : '#1F2937'}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSubLabel}>{subLabel}</Text>
  </TouchableOpacity>
);

// --- STYLES ---
const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#f9f8fc',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  profileCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  messageButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  // Section Headers
  sectionHeaderContainer: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  statSubLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  // Generic Card Style (Used for Quick Actions, Alerts, Schedule)
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // --- Original Quick Actions Styles ---
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
    height: 90, // Slightly taller for better touch area
    borderRadius: 16, // Softer corners
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  box1: {
    backgroundColor: '#dff6dfff',
  },
  boxText1: {
    color: '#489448ff',
    fontSize: 12,
    fontWeight: '600',
  },
  box2: {
    backgroundColor: '#efe2fbff',
  },
  boxText2: {
    color: '#755ca9ff',
    fontSize: 12,
    fontWeight: '600',
  },
  box3: {
    backgroundColor: '#f8e3e3ff',
  },
  boxText3: {
    color: '#f15252ff',
    fontSize: 12,
    fontWeight: '600',
  },
  box4: {
    backgroundColor: '#f2f5d7ff',
  },
  boxText4: {
    color: '#727930ff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Alerts Styles
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
    marginLeft: 52,
  },
  // Schedule Styles
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeColumn: {
    width: 60,
    marginRight: 10,
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  startTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  endTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  scheduleSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Sign Out
  signOutButton: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  signOutButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default CounselorDashboard;