import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import App from '../src/App';
import { useAuth } from '../src/Hooks/useAuth';
import firestore from '@react-native-firebase/firestore';
import SplashScreen from '../src/Screens/SplashScreen';

// Mock the necessary modules
jest.mock('../src/Hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockDoc = (exists) => ({
    exists,
    data: () => ({ role: 'counselor' }),
  });

  const mockCollection = (docId) => ({
    doc: jest.fn((id) => ({
      get: jest.fn(() => {
        if (id === docId) {
          return Promise.resolve(mockDoc(true));
        }
        return Promise.resolve(mockDoc(false));
      }),
    })),
  });

  return () => ({
    collection: jest.fn((collectionName) => {
      if (collectionName === 'students') {
        return mockCollection('student123');
      }
      if (collectionName === 'counselors') {
        return mockCollection('counselor123');
      }
      return mockCollection(null);
    }),
  });
});

jest.mock('../src/Screens/SplashScreen', () => {
    return () => <></>; // Render nothing for SplashScreen
  });

describe('App Startup', () => {
  it('displays a splash screen while initializing', async () => {
    // Arrange: Simulate the initializing state
    (useAuth as jest.Mock).mockReturnValue({ user: null, initializing: true });

    // Act
    const { getByTestId, queryByTestId } = render(<App />);

    // Assert: Check if the splash screen is visible
    expect(getByTestId('splash-screen')).toBeTruthy();

  });

  it('navigates to LoginPage when not authenticated', async () => {
    // Arrange: Simulate a non-authenticated user
    (useAuth as jest.Mock).mockReturnValue({ user: null, initializing: false });

    // Act
    const { getByTestId } = render(<App />);

    // Assert: Check if the login page is visible
    await waitFor(() => {
      expect(getByTestId('login-page')).toBeTruthy();
    });
  });

  it('navigates to StudentDashboard for a student user', async () => {
    // Arrange: Simulate a student user
    const user = { uid: 'student123' };
    (useAuth as jest.Mock).mockReturnValue({ user, initializing: false });

    // Act
    let component;
    await act(async () => {
      component = render(<App />);
    });

    // Assert: Check if the student dashboard is visible
    await waitFor(() => {
      expect(component.getByTestId('student-dashboard')).toBeTruthy();
    });
  });

  it('navigates to CounselorDashboard for a counselor user', async () => {
    // Arrange: Simulate a counselor user
    const user = { uid: 'counselor123' };
    (useAuth as jest.Mock).mockReturnValue({ user, initializing: false });

    // Act
    let component;
    await act(async () => {
      component = render(<App />);
    });

    // Assert: Check if the counselor dashboard is visible
    await waitFor(() => {
      expect(component.getByTestId('counselor-dashboard')).toBeTruthy();
    });
  });

  it('handles errors during role checking gracefully', async () => {
    // Arrange: Simulate an error during Firestore query
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'erroruser' }, initializing: false });
    const firestoreError = new Error('Firestore unavailable');
    (firestore().collection('students').doc('erroruser').get as jest.Mock).mockRejectedValue(firestoreError);

    // Act
    const { getByTestId } = render(<App />);

    // Assert: Navigates to a safe state (e.g., login page)
    await waitFor(() => {
      expect(getByTestId('login-page')).toBeTruthy();
    });
  });
});