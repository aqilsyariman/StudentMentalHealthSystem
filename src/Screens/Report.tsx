import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  FlatList,
  StatusBar,
  SafeAreaView // Added for the PDF Preview modal mainly
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

// --- CONSTANTS & LOGIC (UNTOUCHED) ---
const ANSWER_KEYS = [
  'Not at all',
  'Several days',
  'More than half the days',
  'Nearly every day',
];

const GAD7_QUESTIONS = [
  '1. Feeling nervous, anxious or on edge',
  '2. Not being able to stop or control worrying',
  '3. Worrying too much about different things',
  '4. Trouble relaxing',
  '5. Being so restless that it is hard to sit still',
  '6. Becoming easily annoyed or irritable',
  '7. Feeling afraid as if something awful might happen',
];

const PHQ9_QUESTIONS = [
  '1. Little interest or pleasure in doing things',
  '2. Feeling down, depressed or hopeless',
  '3. Trouble falling or staying asleep, or sleeping too much',
  '4. Feeling tired or having little energy',
  '5. Poor appetite or overeating',
  '6. Feeling bad about yourself',
  '7. Trouble concentrating on things',
  '8. Moving or speaking so slowly',
  '9. Thoughts that you would be better off dead',
];

// --- INTERFACES ---
interface StudentSummary {
  id: string;
  name: string;
  email: string;
}
interface Question {
  q: string;
  a: string;
}
interface AssessmentData {
  date: string;
  score: number;
  result: string;
  questions: Question[];
}
interface SensorDisplayData {
  value?: number | string;
  sys?: number | string;
  dia?: number | string;
  timestamp: string;
  duration?: number | string;
  bed?: string;
  wake?: string;
}

interface ReportData {
  student: {
    name: string;
    dob: string;
    age: string | number;
    gender: string;
    generatedDate: string;
  };
  gad7: AssessmentData;
  phq9: AssessmentData;
  wellness: {
    date: string;
    finalScore: number;
    breakdown: { bp: number; hr: number; sleep: number; steps: number };
  };
  sensors: {
    bp: SensorDisplayData;
    hr: SensorDisplayData;
    steps: SensorDisplayData;
    sleep: SensorDisplayData;
  };
}

// --- HELPER FUNCTIONS ---
const getFirestoreDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (fsTimestamp: any) => {
  if (!fsTimestamp) return '-';
  const date = fsTimestamp.toDate
    ? fsTimestamp.toDate()
    : new Date(fsTimestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getSeverityColor = (result: string) => {
  const lower = result.toLowerCase();
  if (lower.includes('severe')) return '#EF4444'; // Red
  if (lower.includes('moderate')) return '#F59E0B'; // Orange
  if (lower.includes('mild')) return '#10B981'; // Green
  return '#6B7280'; // Gray (Minimal/None)
};

// --- UI COMPONENTS (COPIED FROM SCHEDULE) ---

const ModernHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>📑</Text>
        </View>
      </View>

      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.decorativeCircle} />
    </View>
  );
};

// --- MAIN COMPONENT ---

const ReportScreen = () => {
  // UI State
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Data State
  const [myStudents, setMyStudents] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // 1. FETCH COUNSELOR'S STUDENTS
  useEffect(() => {
    const fetchMyStudents = async () => {
      const counselorId = auth().currentUser?.uid;
      if (!counselorId) return;
      try {
        const snap = await firestore()
          .collection('students')
          .where('counselorId', '==', counselorId)
          .get();
        const list = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().fullName || 'Unnamed',
          email: doc.data().email || '',
        }));
        setMyStudents(list);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMyStudents();
  }, []);

  // 2. FETCH REPORT DATA (LOGIC UNTOUCHED)
  const fetchReportData = useCallback(async () => {
    if (!selectedStudent) return;

    setFetchingData(true);
    const uid = selectedStudent.id;
    const currentPickedKey = getFirestoreDateKey(selectedDate);

    try {
      // --- AUTO DATE SNAP LOGIC ---
      const wellnessDoc = await firestore()
        .collection('students')
        .doc(uid)
        .collection('wellnessScore')
        .doc('scores')
        .get();

      const wellnessMap = wellnessDoc.data()?.data || {};
      const availableDates = Object.keys(wellnessMap).sort((a, b) =>
        b.localeCompare(a),
      );

      const effectiveDateKey = availableDates.find(d => d <= currentPickedKey);

      if (effectiveDateKey && effectiveDateKey !== currentPickedKey) {
        console.log(
          `Auto-snapping date from ${currentPickedKey} to ${effectiveDateKey}`,
        );
        const [y, m, d] = effectiveDateKey.split('-').map(Number);
        const newDate = new Date(y, m - 1, d);
        setSelectedDate(newDate);
        setFetchingData(false);
        return;
      }

      // --- FETCH DATA ---
      const userDoc = await firestore().collection('students').doc(uid).get();
      const userData = userDoc.data() || {};

      let formattedDOB = '-';
      if (userData.dateOfBirth) {
        const rawDate = userData.dateOfBirth.toDate
          ? userData.dateOfBirth.toDate()
          : new Date(userData.dateOfBirth);
        formattedDOB = formatDateDisplay(rawDate);
      }

      const wellnessDayData = wellnessMap[currentPickedKey] || null;

      const sensorRefs = firestore()
        .collection('students')
        .doc(uid)
        .collection('sensorData');
      const [hrDoc, bpDoc, stepsDoc, sleepDoc] = await Promise.all([
        sensorRefs.doc('heartRate').get(),
        sensorRefs.doc('bloodPressure').get(),
        sensorRefs.doc('stepCount').get(),
        sensorRefs.doc('sleep').get(),
      ]);

      const getLatest = (doc: FirebaseFirestoreTypes.DocumentSnapshot) => {
        const dayArray = doc.data()?.data?.[currentPickedKey];
        return dayArray && dayArray.length > 0
          ? dayArray[dayArray.length - 1]
          : null;
      };

      const hrData = getLatest(hrDoc);
      const bpData = getLatest(bpDoc);
      const stepsData = getLatest(stepsDoc);

      const sleepRaw = sleepDoc.data();
      let sleepData = null;
      if (sleepRaw?.data?.[currentPickedKey]) {
        sleepData =
          sleepRaw.data[currentPickedKey][
            sleepRaw.data[currentPickedKey].length - 1
          ];
      } else if (sleepRaw?.latestSleep) {
        sleepData = sleepRaw.latestSleep;
      }

      const fetchAssessment = async (
        type: 'anxietyRisk' | 'depressionRisk',
      ) => {
        try {
          const doc = await firestore()
            .collection('students')
            .doc(uid)
            .collection('questionnaire')
            .doc(type)
            .get();

          const docData = doc.data();
          if (!docData) return null;

          const assessmentMap = docData.data || docData;

          const availableAssessmentDates = Object.keys(assessmentMap).filter(
            k => k.match(/^\d{4}-\d{2}-\d{2}$/),
          );
          availableAssessmentDates.sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime(),
          );
          const closestKey = availableAssessmentDates.find(
            d => d <= currentPickedKey,
          );

          if (!closestKey) return null;

          const dayArray = assessmentMap[closestKey];

          if (dayArray && Array.isArray(dayArray) && dayArray.length > 0) {
            const record = dayArray[dayArray.length - 1];
            const questionSet =
              type === 'anxietyRisk' ? GAD7_QUESTIONS : PHQ9_QUESTIONS;

            const mappedQuestions = questionSet.map((qText, index) => {
              const answerIndex = record.answers
                ? record.answers[String(index)]
                : 0;
              return {
                q: qText,
                a: ANSWER_KEYS[Number(answerIndex)] || 'Not at all',
              };
            });

            return {
              date: closestKey,
              score: record.score,
              result: record.level || 'Unknown',
              questions: mappedQuestions,
            };
          }
        } catch (error) {
          console.error(error);
        }
        return null;
      };

      const gad7Data = await fetchAssessment('anxietyRisk');
      const phq9Data = await fetchAssessment('depressionRisk');

      setReportData({
        student: {
          name: userData.fullName || selectedStudent.name,
          dob: formattedDOB,
          age: userData.age || '-',
          gender: userData.gender || '-', 
          generatedDate: formatDateDisplay(new Date()),
        },
        gad7: {
          date: gad7Data?.date || 'No Data',
          score: gad7Data?.score ?? 0,
          result: gad7Data?.result || 'No Data',
          questions: gad7Data?.questions || [],
        },
        phq9: {
          date: phq9Data?.date || 'No Data',
          score: phq9Data?.score ?? 0,
          result: phq9Data?.result || 'No Data',
          questions: phq9Data?.questions || [],
        },
        wellness: {
          date: formatDateDisplay(selectedDate),
          finalScore: wellnessDayData?.finalScore ?? 0,
          breakdown: {
            bp: wellnessDayData?.bloodPressureScore ?? 0,
            hr: wellnessDayData?.heartRateScore ?? 0,
            sleep: wellnessDayData?.sleepScore ?? 0,
            steps: wellnessDayData?.stepsScore ?? 0,
          },
        },
        sensors: {
          bp: {
            sys: bpData?.sys ?? '-',
            dia: bpData?.dia ?? '-',
            timestamp: formatTime(bpData?.timestamp),
          },
          hr: {
            value: hrData?.value ?? '-',
            timestamp: formatTime(hrData?.timestamp),
          },
          steps: {
            value: stepsData?.value ?? 0,
            timestamp: formatTime(stepsData?.timestamp),
          },
          sleep: {
            duration: sleepData?.duration ?? 0,
            bed: formatTime(sleepData?.bedTime),
            wake: formatTime(sleepData?.wakeTime),
            timestamp: formatTime(sleepData?.bedTime),
          },
        },
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch data');
      console.error(e);
    } finally {
      setFetchingData(false);
    }
  }, [selectedStudent, selectedDate]);

  useEffect(() => {
    if (selectedStudent) fetchReportData();
  }, [selectedStudent, selectedDate, fetchReportData]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setSelectedDate(date);
  };

  // --- PDF GENERATION LOGIC (UNTOUCHED) ---
  const generateHTML = () => {
    if (!reportData)
      return '<html><body><h1>Loading Data...</h1></body></html>';
    const {student, gad7, phq9, wellness, sensors} = reportData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=850, initial-scale=0.8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body { margin: 0; padding: 0; background: #525659; font-family: 'Roboto', Helvetica, Arial, sans-serif; }
          .sheet { background: white; width: 210mm; height: 296mm; margin: 30px auto; padding: 15mm 15mm; position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.3); overflow: hidden; }
          @media print { body { background: white; margin: 0; } .sheet { width: 100%; height: 100%; margin: 0; box-shadow: none; page-break-after: always; padding: 15mm 15mm; } }
          
          /* PAGE 1 STYLES */
          .p1-header { margin-bottom: 20px; }
          .p1-title { font-size: 26px; font-weight: 900; color: #000; letter-spacing: -0.5px; margin-bottom: 5px; }
          .p1-name { font-size: 13px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
          .p1-meta { font-size: 11px; color: #444; display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 12px; }
          .disclaimer-box { background-color: #F7F7F7; padding: 12px; margin-bottom: 15px; border-radius: 4px; }
          .box-label { font-size: 9px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #000; letter-spacing: 0.5px; }
          .box-text { font-size: 9px; color: #333; line-height: 1.3; }
          .columns-container { display: flex; gap: 30px; }
          .col-half { flex: 1; }
          .section-head { font-size: 11px; font-weight: 800; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
          .score-card { border: 1px solid #000; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .score-circle { width: 32px; height: 32px; background: #000; color: #fff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 800; font-size: 14px; margin-bottom: 2px; }
          .score-result { font-size: 11px; font-weight: 700; text-align: center; }
          .q-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #eee; }
          .q-text { font-size: 9px; color: #333; width: 75%; padding-right: 10px; line-height: 1.3; }
          .a-text { font-size: 9px; font-weight: 800; color: #000; width: 25%; text-align: right; }
          .footer { position: absolute; bottom: 15mm; left: 15mm; right: 15mm; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #888; }
          
          /* PAGE 2 STYLES */
          .p2-hero { background: #111; color: white; padding: 25px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; margin-top: 20px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .card { border: 1px solid #ddd; padding: 15px; border-radius: 6px; }
          .card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; margin-bottom: 5px; }
          .card-val { font-size: 24px; font-weight: 800; color: #000; margin-bottom: 5px; }
          .card-ts { font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 5px; margin-top: 5px; }
          .pill { font-size: 9px; padding: 2px 6px; border-radius: 4px; background: #eee; font-weight: 700; }
        </style>
      </head>
      <body>

        <div class="sheet">
          <div class="p1-header">
            <div class="p1-title">MyHealth Clinical Report</div>
            <div class="p1-name">${student.name}</div>
            <div class="p1-meta">
              <span>DOB: ${student.dob} (Age: ${student.age}) | Sex: ${
      student.gender
    }</span>
              <span>Generated: ${student.generatedDate}</span>
            </div>
          </div>

          <div class="disclaimer-box">
            <div class="box-label">Clinical Assessment Disclaimer</div>
            <div class="box-text">This document contains clinical standard PHQ-9 and GAD-7 screening results.</div>
          </div>

          <div class="columns-container">
            <div class="col-half">
              <div class="section-head">Anxiety Risk (GAD-7)</div>
              <div class="score-card">
                <div style="font-size: 9px; font-weight: 700; color: #666; text-transform: uppercase;">Taken: ${
                  gad7.date
                }</div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                  <div class="score-circle">${gad7.score}</div>
                  <div class="score-result">${gad7.result}</div>
                </div>
              </div>
              ${
                gad7.questions.length > 0
                  ? gad7.questions
                      .map(
                        q => `
                <div class="q-row"><span class="q-text">${q.q}</span><span class="a-text">${q.a}</span></div>
              `,
                      )
                      .join('')
                  : '<div style="font-size:10px;">No details found for this date.</div>'
              }
            </div>

            <div class="col-half">
              <div class="section-head">Depression Risk (PHQ-9)</div>
              <div class="score-card">
                <div style="font-size: 9px; font-weight: 700; color: #666; text-transform: uppercase;">Taken: ${
                  phq9.date
                }</div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                  <div class="score-circle">${phq9.score}</div>
                  <div class="score-result">${phq9.result}</div>
                </div>
              </div>
              ${
                phq9.questions.length > 0
                  ? phq9.questions
                      .map(
                        q => `
                <div class="q-row"><span class="q-text">${q.q}</span><span class="a-text">${q.a}</span></div>
              `,
                      )
                      .join('')
                  : '<div style="font-size:10px;">No details found for this date.</div>'
              }
            </div>
          </div>
          <div class="footer"><div>Confidential Medical Record</div><div>Page 1 of 2</div></div>
        </div>

        <div class="sheet">
          <div class="p1-header">
            <div class="p1-title" style="font-size: 20px;">Physiological Data</div>
            <div class="p1-name">${student.name}</div>
            <div class="p1-meta">
               <span>DOB: ${student.dob} | Sex: ${student.gender}</span>
               <span>Date: ${wellness.date}</span>
            </div>
          </div>
          <div class="p2-hero">
            <div><div style="font-size: 12px; font-weight: 500; opacity: 0.8;">OVERALL WELLNESS</div></div>
            <div style="font-size: 48px; font-weight: 900;">${
              wellness.finalScore
            }<span style="font-size: 20px;">/100</span></div>
          </div>
          <div class="section-head">Detailed Sensor Readings</div>
          <div class="grid-2">
            <div class="card">
              <div class="card-title">Blood Pressure <span class="pill">Score: ${
                wellness.breakdown.bp
              }</span></div>
              <div class="card-val">${sensors.bp.sys}/${
      sensors.bp.dia
    } <span style="font-size:12px;">mmHg</span></div>
              <div class="card-ts">Recorded at ${sensors.bp.timestamp}</div>
            </div>
            <div class="card">
              <div class="card-title">Heart Rate <span class="pill">Score: ${
                wellness.breakdown.hr
              }</span></div>
              <div class="card-val">${
                sensors.hr.value
              } <span style="font-size:12px;">bpm</span></div>
              <div class="card-ts">Recorded at ${sensors.hr.timestamp}</div>
            </div>
            <div class="card">
              <div class="card-title">Sleep <span class="pill">Score: ${
                wellness.breakdown.sleep
              }</span></div>
              <div class="card-val">${
                sensors.sleep.duration
              } <span style="font-size:12px;">hr</span></div>
              <div class="card-ts">Bed: ${sensors.sleep.bed} | Wake: ${
      sensors.sleep.wake
    }</div>
            </div>
            <div class="card">
              <div class="card-title">Steps <span class="pill">Score: ${
                wellness.breakdown.steps
              }</span></div>
              <div class="card-val">${
                sensors.steps.value
              } <span style="font-size:12px;">steps</span></div>
              <div class="card-ts">Recorded at ${sensors.steps.timestamp}</div>
            </div>
          </div>
          <div class="footer"><div>Confidential Medical Record</div><div>Page 2 of 2</div></div>
        </div>

      </body>
      </html>
    `;
  };

  const handleExport = async () => {
    if (!reportData) return;
    setLoading(true);
    try {
      const {uri} = await Print.printToFileAsync({html: generateHTML()});
      await Sharing.shareAsync(uri, {UTI: '.pdf', mimeType: 'application/pdf'});
    } catch (e) {
      Alert.alert('Error', 'Failed export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      <ModernHeader title="Wellness Report" subtitle="Generate Clinical Summaries" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* 1. SELECTION AREA */}
        
        {/* Student Selector Card */}
        <TouchableOpacity style={styles.studentSelectorCard} onPress={() => setStudentModalVisible(true)} activeOpacity={0.9}>
          <View>
            <Text style={styles.cardLabel}>Student</Text>
            <Text style={[styles.studentSelectorText, !selectedStudent && styles.placeholderText]}>
              {selectedStudent ? selectedStudent.name : 'Select Student...'}
            </Text>
          </View>
          <View style={styles.arrowContainer}>
             <Text style={styles.arrowText}>↓</Text>
          </View>
        </TouchableOpacity>

        {/* Date Selector Card */}
        <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Report Period</Text>
            <TouchableOpacity style={styles.dateTimeBox} onPress={() => setShowDatePicker(true)}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontSize: 24, marginRight: 12}}>📅</Text>
                    <View>
                        <Text style={styles.dateTimeLabel}>Selected Date</Text>
                        <Text style={styles.dateTimeValue}>{formatDateDisplay(selectedDate)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        {/* 2. SUMMARY CONTENT */}
        {fetchingData ? (
          <ActivityIndicator
            size="large"
            color="#4F46E5"
            style={{marginTop: 40}}
          />
        ) : selectedStudent && reportData ? (
          <>
            {/* WELLNESS SCORE CARD */}
            <View style={[styles.formCard, { marginTop: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionLabel}>Physiological Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: reportData.sensors.hr.value !== '-' ? '#DCFCE7' : '#FEE2E2' }]}>
                   <Text style={[styles.statusBadgeText, { color: reportData.sensors.hr.value !== '-' ? '#166534' : '#991B1B' }]}>
                     {reportData.sensors.hr.value !== '-' ? 'Active Data' : 'No Sensors'}
                   </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                  <Text style={{ fontSize: 48, fontWeight: '800', color: '#1E293B' }}>{reportData.wellness.finalScore}</Text>
                  <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Wellness Score</Text>
              </View>

              <View style={styles.infoRow}>
                 <Text style={styles.infoText}>{reportData.student.name} ({reportData.student.age} y/o)</Text>
                 <Text style={styles.infoText}>Sex: {reportData.student.gender}</Text>
              </View>
            </View>

            {/* CLINICAL ASSESSMENTS CARD */}
            <View style={[styles.formCard, { marginTop: 20 }]}>
              <Text style={styles.sectionLabel}>Clinical Assessments</Text>
              
              {/* Anxiety Block */}
              <View style={styles.assessmentBlock}>
                 <View style={{flex: 1}}>
                    <Text style={styles.assessmentTitle}>Anxiety (GAD-7)</Text>
                    <Text style={styles.assessmentDate}>Last: {reportData.gad7.date}</Text>
                 </View>
                 <View style={{alignItems: 'flex-end'}}>
                    <View style={[styles.chip, { backgroundColor: getSeverityColor(reportData.gad7.result) + '20', borderColor: 'transparent', paddingVertical: 4 }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: getSeverityColor(reportData.gad7.result), textTransform: 'uppercase' }}>
                            {reportData.gad7.result}
                        </Text>
                    </View>
                    <Text style={styles.scoreSmall}>Score: {reportData.gad7.score}/21</Text>
                 </View>
              </View>

              <View style={styles.divider} />

              {/* Depression Block */}
              <View style={styles.assessmentBlock}>
                 <View style={{flex: 1}}>
                    <Text style={styles.assessmentTitle}>Depression (PHQ-9)</Text>
                    <Text style={styles.assessmentDate}>Last: {reportData.phq9.date}</Text>
                 </View>
                 <View style={{alignItems: 'flex-end'}}>
                    <View style={[styles.chip, { backgroundColor: getSeverityColor(reportData.phq9.result) + '20', borderColor: 'transparent', paddingVertical: 4 }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: getSeverityColor(reportData.phq9.result), textTransform: 'uppercase' }}>
                            {reportData.phq9.result}
                        </Text>
                    </View>
                    <Text style={styles.scoreSmall}>Score: {reportData.phq9.score}/27</Text>
                 </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
             <Text style={styles.emptyStateText}>Ready to Generate</Text>
             <Text style={styles.emptyStateSubtext}>Select a student and date to view clinical data.</Text>
          </View>
        )}

        {/* 3. ACTIONS */}
        <View style={{marginTop: 30, paddingBottom: 40}}>
          <TouchableOpacity
            style={[styles.outlineButton, (!selectedStudent || fetchingData) && styles.disabledButton]}
            onPress={() => setPreviewVisible(true)}
            disabled={!selectedStudent || fetchingData}
          >
            <Text style={[styles.outlineButtonText, (!selectedStudent || fetchingData) && {color: '#fff'}]}>Preview Document</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, (!selectedStudent || fetchingData) && styles.disabledButton]}
            onPress={handleExport}
            disabled={!selectedStudent || fetchingData}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Download PDF Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* STUDENT MODAL */}
      <Modal visible={studentModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Student</Text>
            <TouchableOpacity onPress={() => setStudentModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
            <FlatList
              data={myStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.studentItem}
                  onPress={() => {
                    setSelectedStudent(item);
                    setStudentModalVisible(false);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                  </View>
                  <Text style={styles.selectAction}>Select</Text>
                </TouchableOpacity>
              )}
            />
        </View>
      </Modal>

      {/* PDF PREVIEW MODAL */}
      <Modal visible={previewVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{flex: 1, backgroundColor: '#F8FAFC'}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Preview</Text>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{html: generateHTML()}}
            style={{flex: 1}}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// --- MODERN STYLES (Adapted from Schedule Screen) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  
  // Header Styles
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
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF',
    marginTop: 4,
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

  // Cards
  studentSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  studentSelectorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  placeholderText: {
    color: '#64748B',
    fontStyle: 'italic',
  },
  arrowContainer: {
    backgroundColor: '#F1F5F9',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: '#4F46E5',
    fontWeight: 'bold',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  dateTimeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Assessment & Details
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  assessmentBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  assessmentDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreSmall: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // Buttons
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  selectAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
});

export default ReportScreen;