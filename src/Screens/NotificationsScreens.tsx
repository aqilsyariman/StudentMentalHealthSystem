import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, {Path} from 'react-native-svg';

// --- ICONS ---
const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const BellIcon = ({color = '#6B7280'}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const NotificationsScreen = ({navigation}: {navigation: any}) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    const user = auth().currentUser;
    if (!user) return;

    try {
      const snapshot = await firestore()
        .collection('notifications') // Separate collection for Alerts
        .where('recipientId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAlerts(list);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark alert as read
  const markAsRead = async (item: any) => {
    if (!item.read) {
      await firestore().collection('notifications').doc(item.id).update({
        read: true,
      });
      setAlerts(prev => prev.map(a => a.id === item.id ? {...a, read: true} : a));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString() + ' ' + timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{width: 24}} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BellIcon color="#D1D5DB" />
              <Text style={styles.emptyText}>No new alerts</Text>
            </View>
          }
          renderItem={({item}) => (
            <TouchableOpacity 
              style={[
                styles.card, 
                !item.read && styles.unreadCard,
                {borderLeftColor: item.severity === 'critical' ? '#EF4444' : item.severity === 'warning' ? '#F59E0B' : '#3B82F6'}
              ]} 
              onPress={() => markAsRead(item)}
              activeOpacity={0.9}
            >
              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
                  {!item.read && <View style={styles.redDot} />}
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  backButton: {padding: 4},
  listContent: {padding: 16},
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderLeftWidth: 4,
  },
  unreadCard: {backgroundColor: '#F3F4F6'},
  textContainer: {flex: 1},
  titleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  title: {fontSize: 15, fontWeight: '600', color: '#374151'},
  unreadText: {fontWeight: '800', color: '#111827'},
  redDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444'},
  message: {fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8},
  date: {fontSize: 11, color: '#9CA3AF'},
  emptyState: {marginTop: 50, alignItems: 'center', gap: 10},
  emptyText: {color: '#9CA3AF', fontSize: 16},
});

export default NotificationsScreen;