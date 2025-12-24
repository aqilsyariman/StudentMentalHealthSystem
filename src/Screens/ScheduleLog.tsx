import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

// --- Interfaces ---
interface ScheduleItem {
  id: string;
  title: string;
  studentName: string;
  studentId: string;
  place: string;
  reason: string;
  meetingWith: 'Counselor' | 'Doctor' | 'Other';
  status: 'upcoming' | 'completed' | 'cancelled';
  date: any;
  startTime: any;
  endTime: any;
}

// --- Custom Header with Back Button ---
const Header = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      {/* Top Row: Back Button & Icon */}
      <View style={styles.headerTopRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>📋</Text>
        </View>
      </View>

      {/* Title Section */}
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <Text style={styles.headerSubtitle}>Upcoming sessions & history</Text>
      </View>

      {/* Decorative Circle */}
      <View style={styles.decorativeCircle} />
    </View>
  );
};

// --- Empty State ---
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>📭</Text>
    <Text style={styles.emptyTitle}>No Schedules Found</Text>
    <Text style={styles.emptySubtitle}>
      You haven't created any appointments yet.
    </Text>
  </View>
);

export default function ScheduleLogScreen() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Fetch Data ---
  const fetchSchedules = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) return;

    try {
      const snapshot = await firestore()
        .collection('schedules')
        .where('counselorId', '==', user.uid)
        .get();

      const fetchedData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ScheduleItem[];

      // Sort by Date (Newest first)
      fetchedData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setSchedules(fetchedData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      Alert.alert('Error', 'Could not load schedules.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Schedule', 'Remove this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('schedules').doc(id).delete();
            setSchedules(prev => prev.filter(item => item.id !== id));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete schedule');
          }
        },
      },
    ]);
  };

  // --- Helpers ---
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return { day: '', month: '', full: '' };
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      full: date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric' }),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return { bg: '#ECFDF5', text: '#059669' };
      case 'completed': return { bg: '#F1F5F9', text: '#64748B' };
      case 'cancelled': return { bg: '#FEF2F2', text: '#DC2626' };
      default: return { bg: '#EFF6FF', text: '#3B82F6' };
    }
  };

  const getTypeColor = (type: string) => {
    if (type === 'Counselor') return '#8B5CF6';
    if (type === 'Doctor') return '#3B82F6';
    return '#F59E0B';
  };

  // --- Render Item ---
  const renderItem = ({ item }: { item: ScheduleItem }) => {
    const dateObj = formatDate(item.date);
    const statusStyle = getStatusColor(item.status);
    const typeColor = getTypeColor(item.meetingWith);

    return (
      <View style={styles.card}>
        <View style={[styles.colorStrip, { backgroundColor: typeColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateMonth}>{dateObj.month}</Text>
              <Text style={styles.dateDay}>{dateObj.day}</Text>
            </View>

            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mainInfo}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.studentRow}>
              <View style={[styles.avatar, { backgroundColor: typeColor + '20' }]}>
                <Text style={[styles.avatarText, { color: typeColor }]}>
                  {item.studentName ? item.studentName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <Text style={styles.studentName}>{item.studentName}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Text style={styles.footerIcon}>⏰</Text>
              <Text style={styles.footerText}>
                {formatTime(item.startTime)} - {formatTime(item.endTime)}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerIcon}>📍</Text>
              <Text style={styles.footerText}>{item.place}</Text>
            </View>
          </View>

          <View style={styles.typeTag}>
            <Text style={[styles.typeText, { color: typeColor }]}>{item.meetingWith}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <Header />
      
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={schedules}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // --- Header Styles ---
  headerContainer: {
    backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: -2, 
  },
  headerIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTextContainer: {
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  decorativeCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },

  // --- List & Cards ---
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  colorStrip: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 20,
    color: '#94A3B8',
    lineHeight: 20,
  },
  mainInfo: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  typeTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});