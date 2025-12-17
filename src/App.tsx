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
import DetailsScreen from './Screens/Details';
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
              options={{headerShown: true}}
              name="Details"
              component={DetailsScreen}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Heart Rate Graph'}}
              name="HeartRateGraph"
              component={HeartRateGraph}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Steps Count Graph'}}
              name="StepsGraph"
              component={StepsGraph}
            />
            <Stack.Screen
            options={{headerShown: true, title: 'Sleep Tracker'}}
              name="ManualSleepTracker"
              component={ManualSleepTracker}
           
            />
             <Stack.Screen
              options={{headerShown: false, title: 'Messages'}}
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
          </Stack.Group>
        ) : (
          // --- 4. LOGGED IN (Counselor) ---
          <Stack.Group>
            <Stack.Screen
              name="CounselorDashboard"
              component={CounselorDashboard}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'List Student'}}
              name="ListStudent"
              component={ListStudent}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Student Details'}}
              name="StudentDetail"
              component={StudentDetail}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Add Student'}}
              name="AddStudentScreen"
              component={AddStudentScreen}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Heart Rate Graph'}}
              name="HeartRateGraph"
              component={HeartRateGraph}
            />
            <Stack.Screen
              options={{headerShown: true, title: 'Steps Count Graph'}}
              name="StepsGraph"
              component={StepsGraph}
            />
            <Stack.Screen
              options={{headerShown: false, title: 'Messages'}}
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
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
