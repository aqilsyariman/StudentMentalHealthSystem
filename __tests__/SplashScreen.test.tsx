
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SplashScreen from '../src/Screens/SplashScreen';

jest.useFakeTimers();

describe('SplashScreen UI', () => {
  it('renders the logo, welcome text, and progress bar', async () => {
    const { getByText, getByTestId } = render(<SplashScreen />);

    // Check for the logo
    expect(getByTestId('logo')).toBeTruthy();

    // Check for the welcome text
    expect(getByText('Welcome')).toBeTruthy();

    // Check for the progress bar
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('updates the progress from 0% to 100%', async () => {
    const { getByText } = render(<SplashScreen />);

    // Initial state
    expect(getByText('0%')).toBeTruthy();

    // Advance timers to simulate progress
    await waitFor(() => {
        jest.advanceTimersByTime(2000); // 2 seconds
      });

    // Check for updated progress
    expect(getByText('100%')).toBeTruthy();
  });
});
