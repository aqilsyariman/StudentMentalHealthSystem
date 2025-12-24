import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import {RootStackParamList} from './types/navigation';

// Import all your screens
import {useAuth} from './Hooks/useAuth';
import LoginPage from './Screens/LoginPage';
import RoleSelection from './Screens/RoleSelection';
import StudentDashboard from './Screens/StudentDashboard';
import CounselorDashboard from './Screens/CounselorDashboard';
import DepressionRisk from './Screens/DepressionRisk';
import AnxietyRisk from './Screens/AnxietyRisk';
import ListStudent from './Screens/ListStudent';
import StudentDetail from './Screens/StudentDetail';
import AddStudentScreen from './Screens/AddStudentScreen';
import HeartRateGraph from './Screens/GraphScreen/HeartRateGraph';
import StepsGraph from './Screens/GraphScreen/StepsGraph';
import ManualSleepTracker from './Screens/ManualSleepTracker';
import Messages from './Screens/Messages';
import CounselorStudentList from './Screens/CounselorStudentList';
import ChatScreen from './Screens/ChatScreen';
import HealthScoreScreen from './Screens/GraphScreen/HealthScoreScreen';
import AvgWellnessCounselor from './Screens/AvgWellnessCounselor';
import CounselorActiveAlerts from './Screens/CounselorActiveAlerts';
import SendAlerts from './Screens/SendAlert';
import NotificationsScreen from './Screens/NotificationsScreens';
import MoodAndEmotionCounselor from './Screens/MoodAndEmotionCounselor';
import ScheduleScreen from './Screens/Schedule';
import ScheduleLogScreen from './Screens/ScheduleLog';
const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const {user, initializing: authInitializing} = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsRoleLoading(true);

      const checkRole = async () => {
        let userRole: string | null = null;
        try {
          // Check students collection
          const studentDoc = await firestore()
            .collection('students')
            .doc(user.uid)
            .get();

          if (studentDoc.exists()) {
            userRole = 'student';
          } else {
            // Check counselors collection
            const counselorDoc = await firestore()
              .collection('counselors')
              .doc(user.uid)
              .get();

            // --- (THIS IS THE FIX) ---
            // Don't just check if the doc exists.
            // Check the 'role' field INSIDE the document.
            if (
              counselorDoc.exists() &&
              counselorDoc.data()?.role === 'counselor'
            ) {
              userRole = 'counselor';
            } else if (counselorDoc.exists()) {
              // User is in the counselor collection but NOT an active counselor
              // (e.g., role: 'pending'), so they have no role for now.
              userRole = null;
            }
            // --- (END OF FIX) ---
          }

          setRole(userRole);
        } catch (error) {
          console.error('App.tsx: Error checking user role: ', error);
          setRole(null);
        } finally {
          setIsRoleLoading(false);
        }
      };
      checkRole();
    } else {
      setRole(null);
      setIsRoleLoading(false);
    }
  }, [user]);

  const isInitializing = authInitializing || isRoleLoading;

  if (isInitializing) {
    return null; // Or your custom Splash Screen component
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!user ? (
          // --- 1. LOGGED OUT ---
          <Stack.Group>
            <Stack.Screen name="LoginPage" component={LoginPage} />
          </Stack.Group>
        ) : !role ? (
          // --- 2. NEW USER (No Role) ---
          <Stack.Group>
            <Stack.Screen name="RoleSelection">
              {props => (
                <RoleSelection
                  {...props}
                  onRoleSelected={newRole => {
                    setRole(newRole);
                    setIsRoleLoading(false);
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Group>
        ) : role === 'student' ? (
          // --- 3. LOGGED IN (Student) ---
          <Stack.Group>
            <Stack.Screen
              name="StudentDashboard"
              component={StudentDashboard}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Depression Risk',
                headerStyle: {
                  backgroundColor: '#E0F7FA', // Your color here
                },
                headerTintColor: '#0f856d', // Text/icon color
              }}
              name="DepressionRisk"
              component={DepressionRisk}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Anxiety Risk',
                headerStyle: {
                  backgroundColor: '#DBEAFE', // Light Cyan Background
                },
                // ✅ ADD THIS: Deep Teal color for Back Arrow and Title
                headerTintColor: '#1E40AF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
              name="AnxietyRisk"
              component={AnxietyRisk}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Heart Rate',
                headerStyle: {
                  backgroundColor: '#fff0f0', // Your color here
                },
                headerTintColor: '#ff6f61', // Text/icon color
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
              name="HeartRateGraph"
              component={HeartRateGraph}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Steps Count Graph',
                headerStyle: {
                  backgroundColor: '#fff5f0', // Your color here
                },
                headerTintColor: '#ff4500',
              }}
              name="StepsGraph"
              component={StepsGraph}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Sleep Tracker',headerStyle: {
                  backgroundColor: '#eef1ff', // Your color here
                },
                headerTintColor: '#6366f1',
              }}
              name="ManualSleepTracker"
              component={ManualSleepTracker}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Messages'}}
              name="Messages"
              component={Messages}
            />
            <Stack.Screen
              options={{headerShown: false, title: 'ChatScreen'}}
              name="ChatScreen"
              component={ChatScreen}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Health Score'}}
              name="HealthScoreScreen"
              component={HealthScoreScreen}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Alert' ,headerBackTitle: 'Back'}}
              name="NotificationsScreen"
              component={NotificationsScreen}
            />
          </Stack.Group>
        ) : (
          // --- 4. LOGGED IN (Counselor) ---
          <Stack.Group>
            <Stack.Screen
              name="CounselorDashboard"
              component={CounselorDashboard}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'My Student'}}
              name="ListStudent"
              component={ListStudent}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Student Details',
                headerStyle: {
                  backgroundColor: '#F0F2F5', // Your color here
                },
              }}
              name="StudentDetail"
              component={StudentDetail}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Add Student'}}
              name="AddStudentScreen"
              component={AddStudentScreen}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Heart Rate',
                headerStyle: {
                  backgroundColor: '#fff0f0',
                },
                headerTintColor: '#393838ff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                // 👇 ADD THIS LINE
                headerBackTitle: 'Back',
              }}
              name="HeartRateGraph"
              component={HeartRateGraph}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Steps Count Graph',
                headerStyle: {
                  backgroundColor: '#fff5f0', // Your color here
                },
              }}
              name="StepsGraph"
              component={StepsGraph}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Messages'}}
              name="Messages"
              component={Messages}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'CounselorStudentList'}}
              name="CounselorStudentList"
              component={CounselorStudentList}
            />
            <Stack.Screen
              options={{headerShown: false, title: 'ChatScreen'}}
              name="ChatScreen"
              component={ChatScreen}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Avg Wellness Score'}}
              name="AvgWellnessScore"
              component={AvgWellnessCounselor}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Counselor Active Alerts'}}
              name="CounselorActiveAlerts"
              component={CounselorActiveAlerts}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Send Alerts'}}
              name="SendAlerts"
              component={SendAlerts}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Health Score'}}
              name="HealthScoreScreen"
              component={HealthScoreScreen}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Mood & Emotion'}}
              name="MoodAndEmotionCounselor"
              component={MoodAndEmotionCounselor}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Depression Risk',
                headerStyle: {
                  backgroundColor: '#E0F7FA', // Your color here
                },
                headerTintColor: '#0f856d', // Text/icon color
              }}
              name="DepressionRisk"
              component={DepressionRisk}
            />
            <Stack.Screen
              options={{
                headerShown: true,
                title: 'Anxiety Risk',
                headerStyle: {
                  backgroundColor: '#DBEAFE', // Light Cyan Background
                },
                // ✅ ADD THIS: Deep Teal color for Back Arrow and Title
                headerTintColor: '#1E40AF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
              name="AnxietyRisk"
              component={AnxietyRisk}
            />
            <Stack.Screen
              options={{
                headerShown: false,
                title: 'Schedule',
                headerStyle: {
                  backgroundColor: '#DBEAFE', // Light Cyan Background
                },
                // ✅ ADD THIS: Deep Teal color for Back Arrow and Title
                headerTintColor: '#1E40AF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
              name="Schedule"
              component={ScheduleScreen}
            />
              <Stack.Screen
              options={{
                headerShown: false,
                title: 'Schedule Log',
                headerStyle: {
                  backgroundColor: '#DBEAFE', // Light Cyan Background
                },
                // ✅ ADD THIS: Deep Teal color for Back Arrow and Title
                headerTintColor: '#1E40AF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
              name="ScheduleLog"
              component={ScheduleLogScreen}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
