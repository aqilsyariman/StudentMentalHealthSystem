/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AppleHealthKit, {HealthKitPermissions} from 'react-native-health';
import auth from '@react-native-firebase/auth';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {getHeightWeightAndBMI} from '../Services/HeightAndWeight';
import {getHeartRate} from '../Services/HeartRate';
import {getDailyStepCount} from '../Services/StepDailyCount';
import {getSleepData} from '../Services/SleepPatterns';
import {getBloodPressure} from '../Services/BloodPressure';
import Svg, {Path, Circle, G} from 'react-native-svg';
import { RootStackParamList } from '../types/navigation';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.Height,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.BloodPressureSystolic,
      AppleHealthKit.Constants.Permissions.BloodPressureDiastolic,
    ],
    write: [],
  },
};
type Props = NativeStackScreenProps<RootStackParamList, 'StudentDashboard'>;

// 2. Get 'navigation' from the props here
const DashboardScreen = ({ navigation }: Props) => {
  console.log('User UID:', auth().currentUser?.uid);
  const isIOS = Platform.OS === 'ios';

  const [steps, setSteps] = useState<{
    value: number | null;
    date: string | null;
  } | null>(null);
  const [heartRate, setHeartRateState] = useState<{
    value: number | null;
    date: string | null;
  } | null>(null);
  const [sleep, setSleep] = useState<{
    summary: any;
    date: string | null;
  } | null>(null);
  const [hw, setHW] = useState<{
    height: number | null;
    weight: number | null;
    bmi: number | null;
    date: string | null;
  } | null>(null);
  const [bp, setBP] = useState<{
    sys: number | null;
    dia: number | null;
    date: string | null;
  } | null>(null);
  

  useEffect(() => {
    if (!isIOS) {
      return;
    }

    AppleHealthKit.initHealthKit(permissions, err => {
      if (err) {
        console.error('HealthKit not initialized:', err);
        return;
      }

      getDailyStepCount(setSteps);
      getHeartRate(setHeartRateState);
      getSleepData(setSleep);
      getHeightWeightAndBMI(setHW);
      getBloodPressure(setBP);
    });
  }, [isIOS]);

  return (
    <View style={styles.fullContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View>
          <Text style={styles.welcomeUser}>Hello, Aqil!</Text>
        </View>
        <Text style={styles.appTitle}>Health Dashboard</Text>

        <Card title="Steps">
          <View style={styles.cardContainerColumn}>
            <Svg
              width={60}
              height={60}
              viewBox="0 0 640 640"
              fill="none"
              style={styles.icon}>
              {/* Outer Circle */}
              <Circle cx="320" cy="320" r="320" fill="rgba(236, 236, 236, 1)" />

              {/* Icon inside (scaled down and centered) */}
              <G scale="0.6" x="128" y="160">
                <Path
                  d="M192 160h32V32h-32c-35.35 0-64 28.65-64 64s28.65 64 64 64zM0 416c0 35.35 28.65 64 64 64h32V352H64c-35.35 0-64 28.65-64 64zm337.46-128c-34.91 0-76.16 13.12-104.73 32-24.79 16.38-44.52 32-104.73 32v128l57.53 15.97c26.21 7.28 53.01 13.12 80.31 15.05 32.69 2.31 65.6.67 97.58-6.2C472.9 481.3 512 429.22 512 384c0-64-84.18-96-174.54-96zM491.42 7.19C459.44.32 426.53-1.33 393.84.99c-27.3 1.93-54.1 7.77-80.31 15.04L256 32v128c60.2 0 79.94 15.62 104.73 32 28.57 18.88 69.82 32 104.73 32C555.82 224 640 192 640 128c0-45.22-39.1-97.3-148.58-120.81z"
                  fill="#545454ff"
                />
              </G>
            </Svg>

            <View style={styles.textContainer}>
              <Text style={{ marginBottom:10 }} >You got moving today!</Text>
              <ValueText
                value={
                  steps?.value !== null && steps?.value !== undefined
                    ? `${steps.value}`
                    : 'No Data'
                }
              />
              {steps?.date && (
                <Text style={styles.timestamp}>
                  Recorded on: {new Date(steps.date).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </Card>

         <Card title="Heart Rate">
          <View style={styles.cardContainerColumn}>
            <Svg
              width={60}
              height={60}
              viewBox="0 0 24 24"
              fill="none"
              style={styles.icon}>
              {/* Outer Circle */}
              <Circle cx="12" cy="12" r="12" fill="#f8eaeaff" />

              {/* Your original icon */}
              <G scale="0.7" y={4} x={3.5}>
                <Path
                  d="M18 11.9999H17.1986C16.3689 11.9999 15.9541 11.9999 15.6102 12.1946C15.2664 12.3893 15.0529 12.745 14.6261 13.4564L14.5952 13.5079C14.1976 14.1706 13.9987 14.502 13.7095 14.4965C13.4202 14.4911 13.2339 14.1525 12.8615 13.4753L11.1742 10.4075C10.8269 9.77606 10.6533 9.46034 10.3759 9.44537C10.0986 9.43039 9.892 9.72558 9.47875 10.3159L9.19573 10.7203C8.75681 11.3473 8.53734 11.6608 8.21173 11.8303C7.88612 11.9999 7.50342 11.9999 6.73803 11.9999H6"
                  stroke="#c80f0f"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                <Path
                  d="M8.96173 18.9108L9.42605 18.3219L8.96173 18.9108ZM12 5.5006L11.4596 6.0207C11.601 6.1676 11.7961 6.2506 12 6.2506C12.2039 6.2506 12.399 6.1676 12.5404 6.0207L12 5.5006ZM15.0383 18.9109L15.5026 19.4999L15.0383 18.9109ZM12 20.4859L12 19.7359L12 20.4859ZM2.65666 13.3964C2.87558 13.748 3.33811 13.8556 3.68974 13.6367C4.04137 13.4178 4.14895 12.9552 3.93003 12.6036L2.65666 13.3964ZM6.52969 15.7718C6.23645 15.4793 5.76158 15.4798 5.46903 15.7731C5.17649 16.0663 5.17706 16.5412 5.47031 16.8337L6.52969 15.7718ZM2.75 9.13707C2.75 6.33419 4.00722 4.59507 5.57921 3.99711C7.15546 3.39753 9.35129 3.8302 11.4596 6.0207L12.5404 4.9805C10.1489 2.49583 7.3447 1.72069 5.04591 2.59512C2.74286 3.47116 1.25 5.88785 1.25 9.13707H2.75ZM15.5026 19.4999C16.9949 18.3234 18.7837 16.7461 20.2061 14.9838C21.6126 13.2412 22.75 11.2089 22.75 9.13703H21.25C21.25 10.688 20.3777 12.3829 19.0389 14.0417C17.716 15.6807 16.0239 17.1788 14.574 18.3219L15.5026 19.4999ZM22.75 9.13703C22.75 5.88784 21.2571 3.47115 18.9541 2.59511C16.6553 1.7207 13.8511 2.49583 11.4596 4.9805L12.5404 6.0207C14.6487 3.8302 16.8445 3.39753 18.4208 3.99711C19.9928 4.59506 21.25 6.33418 21.25 9.13703H22.75ZM8.49742 19.4998C9.77172 20.5044 10.6501 21.2359 12 21.2359L12 19.7359C11.2693 19.7359 10.8157 19.4174 9.42605 18.3219L8.49742 19.4998ZM14.574 18.3219C13.1843 19.4174 12.7307 19.7359 12 19.7359L12 21.2359C13.3499 21.2359 14.2283 20.5044 15.5026 19.4999L14.574 18.3219ZM3.93003 12.6036C3.18403 11.4054 2.75 10.2312 2.75 9.13707H1.25C1.25 10.617 1.83054 12.0695 2.65666 13.3964L3.93003 12.6036ZM9.42605 18.3219C8.50908 17.599 7.49093 16.7307 6.52969 15.7718L5.47031 16.8337C6.48347 17.8445 7.54819 18.7515 8.49742 19.4998L9.42605 18.3219Z"
                  fill="#c80f0f"
                />
              </G>
            </Svg>

            <View style={styles.textContainer}>
              <ValueText
                value={
                  heartRate?.value ? `${heartRate.value} BPM` : 'Loading...'
                }
              />
              {heartRate?.date && (
                <Text style={styles.timestamp}>
                  Last updated: {new Date(heartRate.date).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </Card>

        <Card title="Blood Pressure">
          <View style={styles.cardContainerColumn}>
            <Svg
              width={60}
              height={60}
              viewBox="0 0 24 24"
              fill="#c80f0f"
              style={styles.icon}>
              <Circle cx="12" cy="12" r="12" fill="#f8eaeaff" />

              <G scale="0.4" x={2.5} y={4}>
              <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M38.2143 19.5319C38.1237 19.6148 38.0266 19.6868 37.9247 19.7477C37.9301 20.8351 37.9461 21.9457 37.962 23.0465V23.0483C37.9842 24.5936 38.0062 26.1198 37.9983 27.536C37.9831 30.2549 37.8624 32.8418 37.4203 35.0818C36.9793 37.3163 36.1985 39.3134 34.7793 40.7537C33.3307 42.2238 31.331 43 28.7031 43C24.3102 43 21.8272 41.3632 20.4726 39.5782C19.8121 38.7078 19.4478 37.8388 19.2478 37.1859C19.1652 36.916 19.1099 36.6806 19.0731 36.494C17.651 36.7958 15.9634 37 14 37C6.47368 37 3 34 3 34V12C3 12 3.02856 12.0225 3.0854 12.0635C3.02904 11.8789 3 11.6908 3 11.5C3 9.01472 7.92487 7 14 7C20.0751 7 25 9.01472 25 11.5C25 11.6894 24.9714 11.876 24.9159 12.0593C24.9717 12.0209 25 12 25 12V16.0619C28.9463 16.554 32 19.9204 32 24C32 28.0796 28.9463 31.446 25 31.9381V34C25 34 23.7143 35.1104 21.0126 35.9801C21.0152 35.9963 21.0182 36.014 21.0216 36.0333C21.0446 36.1638 21.0866 36.3602 21.1602 36.6003C21.3077 37.0822 21.578 37.7264 22.0658 38.3692C23.0078 39.6105 24.8765 41 28.7031 41C30.9103 41 32.3556 40.3639 33.3547 39.3499C34.3833 38.3061 35.053 36.7473 35.4582 34.6945C35.8622 32.6473 35.9833 30.2155 35.9983 27.5248C36.0065 26.0721 35.9849 24.6185 35.9628 23.1255L35.9627 23.1196C35.9459 21.9854 35.9288 20.8287 35.924 19.6325C35.8795 19.5983 35.8362 19.5618 35.7942 19.5229L35.6953 19.4322C30.9721 15.1255 27.8863 12.3057 28.0032 8.78783C28.0572 7.24649 28.8399 5.76861 30.1084 4.8982C32.4835 3.26619 35.4164 4.02779 36.9998 5.89554C38.5831 4.02779 41.516 3.25712 43.8911 4.8982C45.1596 5.76861 45.9423 7.24649 45.9963 8.78783C46.1218 12.2922 43.0512 15.1038 38.3586 19.4006L38.3043 19.4503L38.2143 19.5319ZM23 16.0619C19.0537 16.554 16 19.9204 16 24C16 28.0796 19.0537 31.446 23 31.9381V32.9432C22.651 33.1473 22.1712 33.3976 21.5565 33.6525C19.9799 34.306 17.4896 35 14 35C13.657 35 13.3237 34.9933 13 34.9806V16.9818C13.3266 16.9938 13.6599 17 14 17C17.7658 17 20.7672 16.1864 22.8458 15.3578C22.8978 15.3371 22.9492 15.3164 23 15.2957V16.0619ZM14 15C18.4183 15 22 13.6569 22 12C22 10.3431 18.4183 9 14 9C9.58172 9 6 10.3431 6 12C6 13.6569 9.58172 15 14 15ZM26 24C26 25.1046 25.1046 26 24 26C22.8954 26 22 25.1046 22 24C22 23.2597 22.4022 22.6134 23 22.2676V19C23 18.4477 23.4477 18 24 18C24.5523 18 25 18.4477 25 19V22.2676C25.5978 22.6134 26 23.2597 26 24Z"
              />
              </G>
            </Svg>

            <View style={styles.textContainer}>
              <ValueText
                value={
                  bp?.sys && bp?.dia
                    ? `${bp.sys} / ${bp.dia} mmHg`
                    : 'Fetching...'
                }
              />
              {bp?.date && (
                <Text style={styles.timestamp}>
                  Recorded on: {new Date(bp.date).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </Card>

        <Card title="Sleep Summary">
          <View style={styles.cardContainer}>
            <Svg
              width={60}
              height={60}
              viewBox="0 0 24 24"
              fill="none"
              style={styles.icon}>
              {/* Outer Circle — same size as others */}
              <Circle cx="12" cy="12" r="12" fill="#f7f6ddff" />

              {/* Icon Path */}
              <G scale="0.7" x={4} y={3}>
                <Path
                  d="M3 5V19M3 16H21M21 19V13.2C21 12.0799 21 11.5198 20.782 11.092C20.5903 10.7157 20.2843 10.4097 19.908 10.218C19.4802 10 18.9201 10 17.8 10H11V15.7273M7 12H7.01M8 12C8 12.5523 7.55228 13 7 13C6.44772 13 6 12.5523 6 12C6 11.4477 6.44772 11 7 11C7.55228 11 8 11.4477 8 12Z"
                  stroke="#ff8c00ff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </G>
            </Svg>

            <View style={styles.textContainer}>
              {sleep?.summary ? (
                <>
                  <ValueText label="In Bed" value={sleep.summary.inBed} />
                  <ValueText label="Asleep" value={sleep.summary.asleep} />
                  <ValueText label="Awake" value={sleep.summary.awake} />
                  <ValueText label="Core" value={sleep.summary.core} />
                  <ValueText label="Deep" value={sleep.summary.deep} />
                  <ValueText label="REM" value={sleep.summary.rem} />
                </>
              ) : (
                <ValueText value="Fetching sleep data..." />
              )}
              {sleep?.date && (
                <Text style={styles.timestamp}>
                  Recorded on: {new Date(sleep.date).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </Card>

        <Card title="Height, Weight & BMI">
          <View style={styles.cardContainerColumn}>
            <Svg
              width={60}
              height={60}
              viewBox="0 0 24 24"
              fill="#c80f0f"
              style={[styles.icon, {marginTop: 20, justifyContent: 'center'}]}>
              <Circle cx="12" cy="12" r="12" fill="#f8eaeaff" />

              <G scale="0.6" x={2.5} y={2.5}>
                <Path d="M25.912,5c-0,-0.796 -0.316,-1.559 -0.879,-2.121c-0.562,-0.563 -1.325,-0.879 -2.121,-0.879c-3.431,-0 -10.4,-0 -13.831,-0c-0.795,-0 -1.558,0.316 -2.121,0.879c-0.563,0.562 -0.879,1.325 -0.879,2.121l0,22c0,0.796 0.316,1.559 0.879,2.121c0.563,0.563 1.326,0.879 2.121,0.879c3.431,0 10.4,0 13.831,0c0.796,0 1.559,-0.316 2.121,-0.879c0.563,-0.562 0.879,-1.325 0.879,-2.121l-0,-22Zm-2,-0l-0,22c-0,0.265 -0.105,0.52 -0.293,0.707c-0.188,0.188 -0.442,0.293 -0.707,0.293l-13.831,-0c-0.265,0 -0.519,-0.105 -0.707,-0.293c-0.187,-0.187 -0.293,-0.442 -0.293,-0.707c0,-0 0,-22 0,-22c0,-0.265 0.106,-0.52 0.293,-0.707c0.188,-0.188 0.442,-0.293 0.707,-0.293l13.831,-0c0.265,-0 0.519,0.105 0.707,0.293c0.188,0.187 0.293,0.442 0.293,0.707Z" />
                <Path d="M14.995,8l-0.998,0c-0.552,0 -1,0.448 -1,1c-0,0.552 0.448,1 1,1l1.002,-0l0.002,1.002c0.001,0.552 0.45,0.999 1.002,0.998c0.552,-0.001 0.999,-0.45 0.998,-1.002l-0.002,-0.998l0.998,0c0.551,0 1,-0.448 1,-1c-0,-0.552 -0.449,-1 -1,-1l-1.002,0l-0.003,-1.002c-0.001,-0.552 -0.45,-0.999 -1.002,-0.998c-0.552,0.001 -0.999,0.45 -0.998,1.002l0.003,0.998Z" />
                <Path d="M14.992,17l6.016,-0c0.552,-0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-6.016,-0c-0.552,-0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Z" />
                <Path d="M14.992,21l6.016,0c0.552,0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-6.016,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Z" />
                <Path d="M14.985,24.994l6.015,-0c0.552,-0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-6.015,-0c-0.552,-0 -1,0.448 -1,1c-0,0.552 0.448,1 1,1Z" />
                <Circle cx="10.998" cy="15.958" r="1" />
                <Circle cx="10.998" cy="19.976" r="1" />
                <Circle cx="10.998" cy="23.994" r="1" />
              </G>
            </Svg>

            <View style={styles.textGroup}>
              <ValueText
                label="Weight"
                value={hw?.weight ? `${hw.weight} kg` : 'N/A'}
              />
              <ValueText
                label="Height"
                value={hw?.height ? `${hw.height} m` : 'N/A'}
              />
              <ValueText
                label="BMI"
                value={hw?.bmi ? hw.bmi.toFixed(2) : 'N/A'}
              />
              <View style={styles.textContainer}>
                {hw?.date && (
                  <Text style={styles.timestamp}>
                    Measured on: {new Date(hw.date).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>


        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => auth().signOut()}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>


        <TouchableOpacity
        // Use onPress to navigate
        onPress={() => navigation.navigate('Details')}
      >
        <Text >Go to Details</Text>
      </TouchableOpacity>

        {!isIOS && (
          <Text style={styles.warning}>
            Note: Full health data is available only on iOS with HealthKit.
          </Text>
        )}
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

export default DashboardScreen;
