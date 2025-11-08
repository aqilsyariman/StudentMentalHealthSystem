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

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  // 1. Get auth state (is auth ready? who is the user?)
  const {user, initializing: authInitializing} = useAuth();

  // 2. Create local state to hold the role
  const [role, setRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // 3. This effect checks the user's role AFTER they log in
  useEffect(() => {
    if (user) {
      // User is logged in, so let's check their role in Firestore
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
            if (counselorDoc.exists()) {
              userRole = 'counselor';
            }
          }
          setRole(userRole);
        } catch (error) {
          console.error('App.tsx: Error checking user role: ', error);
          setRole(null);
        } finally {
          setIsRoleLoading(false); // We're done checking
        }
      };
      checkRole();
    } else {
      // User is logged out, so clear the role and stop loading
      setRole(null);
      setIsRoleLoading(false);
    }
  }, [user]); // This runs every time the 'user' object changes

  // 4. Show a loading screen if EITHER auth OR role is loading
  const isInitializing = authInitializing || isRoleLoading;

  if (isInitializing) {
    return null; // Or your custom Splash Screen component
  }

  // 5. This logic is now perfect. No "flash" will happen.
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
              {(
                props, // 'props' here contains navigation and route
              ) => (
                <RoleSelection
                  {...props} // ✅ <-- ADD THIS LINE
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
            <Stack.Screen options={{headerShown:true}}name="Details" component={DetailsScreen} />
          </Stack.Group>
        ) : (
          // --- 4. LOGGED IN (Counselor) ---
          <Stack.Group>
            <Stack.Screen
              name="CounselorDashboard"
              component={CounselorDashboard}
            />
            <Stack.Screen name="Details" component={DetailsScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
