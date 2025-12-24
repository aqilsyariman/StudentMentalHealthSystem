export type RootStackParamList = {
  LoginPage: undefined;
  RoleSelection: undefined;
  StudentDashboard: undefined; // This is your Student Dashboard
  DepressionRisk: undefined;
  AnxietyRisk: undefined;
  CounselorDashboard: undefined;
  ListStudent: undefined;
  StudentDetail: {studentId: string};
  AddStudentScreen: undefined;
  HeartRateGraph: {studentId: string};
  StepsGraph: {studentId: string};
  ManualSleepTracker: undefined;
  Messages: undefined;
  ChatScreen: {
    conversationId: string;
    otherPersonName: string;
    otherPersonId: string;
  };
  NewConversation: undefined; // Only for counselors
    CounselorStudentList: undefined;
  HealthScoreScreen: undefined;
  AvgWellnessScore: undefined;
  CounselorActiveAlerts: undefined;
  SendAlerts: undefined;
  NotificationsScreen: undefined;
  MoodAndEmotionCounselor: undefined;

};
