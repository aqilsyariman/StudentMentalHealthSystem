/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import {LinearGradient} from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {LineChart} from 'react-native-chart-kit';

const SAVE_TO_FIRESTORE = true;
const screenWidth = Dimensions.get('window').width;

export default function DepressionQuestionnaire() {
  const [view, setView] = useState<'history' | 'questionnaire' | 'result'>(
    'history',
  );

  // Questionnaire State
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // History & Graph State
  const [pastResults, setPastResults] = useState<any[]>([]);
  const [loadingPastResults, setLoadingPastResults] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [completionDate] = useState(
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  );

  // PHQ-9 Questions
  const questions = [
    {
      id: 1,
      text: 'Over the past 2 weeks, how often have you felt little interest or pleasure in doing things?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 2,
      text: 'Over the past 2 weeks, how often have you felt down, depressed, or hopeless?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 3,
      text: 'Over the past 2 weeks, how often have you had trouble falling or staying asleep, or sleeping too much?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 4,
      text: 'Over the past 2 weeks, how often have you felt tired or had little energy?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 5,
      text: 'Over the past 2 weeks, how often have you had poor appetite or been overeating?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 6,
      text: 'Over the past 2 weeks, how often have you felt bad about yourself or that you are a failure?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 7,
      text: 'Over the past 2 weeks, how often have you had trouble concentrating on things?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 8,
      text: 'Over the past 2 weeks, how often have you moved or spoken so slowly that others noticed, or been fidgety or restless?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
    {
      id: 9,
      text: 'Over the past 2 weeks, how often have you had thoughts that you would be better off dead or of hurting yourself?',
      options: [
        {value: 0, label: 'Not at all'},
        {value: 1, label: 'Several days'},
        {value: 2, label: 'More than half the days'},
        {value: 3, label: 'Nearly every day'},
      ],
    },
  ];

  // --- HELPERS ---

  const getDepressionScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#9CA3AF';
    if (score <= 4) return '#10B981'; // Green
    if (score <= 9) return '#F59E0B'; // Yellow
    if (score <= 14) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getResultInfo = (score: number) => {
    if (score <= 4)
      return {
        level: 'Minimal',
        colors: ['#34D399', '#14B8A6'],
        message: 'Minimal depression symptoms.',
        recommendation: 'Keep practicing self-care.',
      };
    if (score <= 9)
      return {
        level: 'Mild',
        colors: ['#FBBF24', '#F59E0B'],
        message: 'Mild depression symptoms.',
        recommendation: 'Consider talking to a friend or support.',
      };
    if (score <= 14)
      return {
        level: 'Moderate',
        colors: ['#FB923C', '#EF4444'],
        message: 'Moderate depression symptoms.',
        recommendation: 'Professional support recommended.',
      };
    if (score <= 19)
      return {
        level: 'Moderately Severe',
        colors: ['#EF4444', '#F43F5E'],
        message: 'Moderately severe symptoms.',
        recommendation: 'Consult a professional soon.',
      };
    return {
      level: 'Severe',
      colors: ['#DC2626', '#E11D48'],
      message: 'Severe depression symptoms.',
      recommendation: 'Immediate professional help recommended.',
    };
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  };

  // --- GRAPH DATA PREPARATION ---

  const filteredResults = useMemo(() => {
    if (!selectedDate || pastResults.length === 0) return [];

    return pastResults
      .filter(result => {
        const rDate = result.timestamp?.toDate
          ? result.timestamp.toDate()
          : new Date(result.timestamp || result.completionDate);
        // ✅ Fix: Use local time grouping
        const year = rDate.getFullYear();
        const month = String(rDate.getMonth() + 1).padStart(2, '0');
        const day = String(rDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        return dateKey === selectedDate;
      })
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate
          ? a.timestamp.toDate()
          : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate
          ? b.timestamp.toDate()
          : new Date(b.timestamp);
        return timeA - timeB; // Sort ascending (Oldest -> Newest) for the List & Graph logic
      });
  }, [selectedDate, pastResults]);

  const getChartData = () => {
    if (filteredResults.length === 0) {
      return {labels: ['No Data'], datasets: [{data: [0]}]};
    }

    const labels = filteredResults.map((reading, index) => {
      if (index % 2 === 0 || filteredResults.length <= 6) {
        const date = reading.timestamp?.toDate
          ? reading.timestamp.toDate()
          : new Date(reading.timestamp);
        return `${date.getHours()}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      }
      return '';
    });

    const data = filteredResults.map(reading => reading.score);

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(20, 170, 140, ${opacity})`, // Teal Line
          strokeWidth: 3,
        },
      ],
    };
  };

  // --- ACTIONS ---

  const startAssessment = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setView('questionnaire');
  };

  const handleAnswer = (value: number) => {
    const newAnswers = {...answers, [currentQuestion]: value};
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setTimeout(() => {
        saveToFirestore(newAnswers);
        setView('result');
      }, 300);
    }
  };

  const calculateScore = () =>
    Object.values(answers).reduce((sum, val) => sum + val, 0);

  const saveToFirestore = async (finalAnswers: Record<number, number>) => {
    const currentUser = auth().currentUser;
    if (!SAVE_TO_FIRESTORE || !currentUser) return;

    try {
      const score = Object.values(finalAnswers).reduce(
        (sum, val) => sum + val,
        0,
      );
      const result = getResultInfo(score);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const questionnaireData = {
        timestamp: firestore.Timestamp.now(),
        completionDate: completionDate,
        dateKey: dateKey,
        score: score,
        maxScore: 27,
        level: result.level,
        answers: finalAnswers,
        questionsCount: questions.length,
      };

      await firestore()
        .collection('students')
        .doc(currentUser.uid)
        .collection('questionnaire')
        .doc('depressionRisk')
        .set(
          {
            data: {
              [dateKey]: firestore.FieldValue.arrayUnion(questionnaireData),
            },
          },
          {merge: true},
        );

      fetchPastResults();
    } catch (saveErr) {
      console.error('Firestore save failed:', saveErr);
    }
  };

  const fetchPastResults = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setLoadingPastResults(true);
    try {
      const doc = await firestore()
        .collection('students')
        .doc(currentUser.uid)
        .collection('questionnaire')
        .doc('depressionRisk')
        .get();

      if (doc.exists()) {
        const data = doc.data();
        if (data && data.data) {
          const allResults: any[] = [];
          const dates = new Set<string>();

          Object.keys(data.data).forEach(dateKey => {
            const entries = data.data[dateKey];
            if (Array.isArray(entries)) {
              allResults.push(...entries);
              dates.add(dateKey);
            }
          });

          allResults.sort(
            (a, b) =>
              (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0),
          );
          setPastResults(allResults);

          const sortedDates = Array.from(dates).sort().reverse();
          setAvailableDates(sortedDates);
          if (sortedDates.length > 0) setSelectedDate(sortedDates[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch past results:', error);
    } finally {
      setLoadingPastResults(false);
    }
  };

  useEffect(() => {
    fetchPastResults();
  }, []);

  const returnToHistory = () => setView('history');

  // --- RENDER VIEWS ---

  const renderHistoryView = () => {
    const latestResult = pastResults.length > 0 ? pastResults[0] : null;
    const latestColor = latestResult
      ? getDepressionScoreColor(latestResult.score)
      : '#9CA3AF';

    // Sort filtered results descending (Newest -> Oldest) for the LIST view, while Chart used Ascending
    const listResults = [...filteredResults].reverse();

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Start Assessment Button */}
        <TouchableOpacity
          style={styles.startAssessmentButton}
          onPress={startAssessment}
          activeOpacity={0.8}>
          <LinearGradient
            colors={['#14aa8c', '#0f856d']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.startButtonGradient}>
            <Text style={styles.startButtonText}>+ Take New Assessment</Text>
            <Text style={styles.startButtonSubtext}>
              2-minute check-in (PHQ-9)
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Latest Score Card */}
        {latestResult && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current Level</Text>
              <View
                style={[styles.badge, {backgroundColor: latestColor + '20'}]}>
                <Text style={[styles.badgeText, {color: latestColor}]}>
                  {latestResult.level}
                </Text>
              </View>
            </View>
            <View style={styles.sensorCardContainer}>
              <View
                style={[styles.iconContainer, {backgroundColor: '#E0F7FA'}]}>
                <Text style={{fontSize: 32}}>
                  <Image
                    source={require('../Assets/think.png')}
                    style={{width: 50, height: 50, marginBottom: -5}}
                    resizeMode="contain"
                  />
                </Text>
              </View>
              <View style={styles.sensorTextContainer}>
                <Text style={styles.sensorValue}>
                  {latestResult.score}{' '}
                  <Text style={styles.sensorUnit}>/ 27</Text>
                </Text>
                <Text style={styles.sensorTimestamp}>
                  Last check:{' '}
                  {new Date(
                    latestResult.timestamp?.toDate(),
                  ).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Date Selector */}
        {availableDates.length > 0 && (
          <View style={styles.dateSelectorContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContainer}>
              {availableDates.map(date => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.datePill,
                    selectedDate === date && styles.datePillSelected,
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.datePillText,
                      selectedDate === date && styles.datePillTextSelected,
                    ]}>
                    {formatDateLabel(date)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chart Section */}
        {filteredResults.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Depression Trend</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={getChartData()}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(20, 170, 140, ${opacity})`, // Teal color
                  labelColor: (opacity = 1) =>
                    `rgba(100, 100, 100, ${opacity})`,
                  style: {borderRadius: 16},
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#14aa8c',
                    fill: '#ffffff',
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withVerticalLines={false}
                yAxisInterval={1}
                fromZero
              />
            </View>
            <View style={styles.chartFooter}>
              <Text style={styles.chartNote}>
                Graph shows readings over time for{' '}
                {selectedDate ? formatDateLabel(selectedDate) : ''}
              </Text>
            </View>
          </View>
        )}

        {/* 🌟 NEW: Daily Logs List Section */}
        {listResults.length > 0 && (
          <View style={styles.pastResultsSection}>
            <Text style={styles.sectionTitle}>
              Logs for {selectedDate ? formatDateLabel(selectedDate) : ''}
            </Text>
            <View style={styles.pastResultsList}>
              {listResults.map((result, index) => {
                const rDate = result.timestamp?.toDate
                  ? result.timestamp.toDate()
                  : new Date(result.timestamp);
                const timeStr = rDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const itemColor = getDepressionScoreColor(result.score);

                return (
                  <View key={index} style={styles.pastResultItem}>
                    <View style={styles.pastResultLeft}>
                      <Text style={styles.pastResultDate}>{timeStr}</Text>
                      <Text style={styles.pastResultTime}>{result.level}</Text>
                    </View>
                    <View style={styles.pastResultRight}>
                      <View
                        style={[
                          styles.miniBadge,
                          {backgroundColor: itemColor + '20'},
                        ]}>
                        <Text
                          style={[styles.miniBadgeText, {color: itemColor}]}>
                          Score: {result.score}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {loadingPastResults && (
          <ActivityIndicator
            size="large"
            color="#14aa8c"
            style={{marginTop: 20}}
          />
        )}

        {pastResults.length === 0 && !loadingPastResults && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No history found</Text>
            <Text style={styles.emptyStateSubText}>
              Complete a check-in to see analytics.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderQuestionnaireView = () => {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {currentQuestion + 1} of {questions.length}
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={['#14aa8c', '#4FD1C5']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[styles.progressBarFill, {width: `${progress}%`}]}
              />
            </View>
          </View>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {questions[currentQuestion].text}
          </Text>
          <View style={styles.optionsContainer}>
            {questions[currentQuestion].options.map((option, idx) => {
              const isSelected = answers[currentQuestion] === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleAnswer(option.value)}
                  style={styles.optionButton}>
                  {isSelected ? (
                    <LinearGradient
                      colors={['#14aa8c', '#0f856d']}
                      style={styles.optionButtonSelected}>
                      <View style={styles.optionNumberSelected}>
                        <Text style={styles.optionNumberTextSelected}>
                          {idx + 1}
                        </Text>
                      </View>
                      <Text style={styles.optionLabelSelected}>
                        {option.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.optionButtonDefault}>
                      <View style={styles.optionNumberDefault}>
                        <Text style={styles.optionNumberTextDefault}>
                          {idx + 1}
                        </Text>
                      </View>
                      <Text style={styles.optionLabelDefault}>
                        {option.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TouchableOpacity onPress={returnToHistory} style={styles.backButton}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderResultView = () => {
    const score = calculateScore();
    const result = getResultInfo(score);
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <LinearGradient colors={result.colors} style={styles.iconContainer}>
              <Text style={styles.iconText}>✓</Text>
            </LinearGradient>
            <Text style={styles.resultTitle}>Assessment Complete</Text>
            <Text style={styles.subtitle}>PHQ-9 Screening Tool</Text>
          </View>
          <LinearGradient
            colors={[`${result.colors[0]}20`, `${result.colors[1]}20`]}
            style={styles.resultBox}>
            <View style={styles.resultBoxContent}>
              <View style={styles.resultTextContainer}>
                <Text style={styles.resultLevel}>{result.level} Risk</Text>
                <Text style={styles.resultMessage}>{result.message}</Text>
                <Text style={styles.resultRecommendation}>
                  {result.recommendation}
                </Text>
              </View>
            </View>
          </LinearGradient>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Score</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreTotal}>/27</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={returnToHistory}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <LinearGradient
      colors={['#E0F7FA', '#F0FDFA', '#E6FFFA']}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {view === 'history' && renderHistoryView()}
        {view === 'questionnaire' && renderQuestionnaireView()}
        {view === 'result' && renderResultView()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  safeArea: {flex: 1},
  scrollContent: {padding: 20, paddingBottom: 50},

  // Header
  historyHeader: {marginBottom: 20},
  historyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  historySubtitle: {fontSize: 16, color: '#6B7280'},

  // Start Button
  startAssessmentButton: {
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: '#14aa8c',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  startButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Latest Score Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#14aa8c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {fontSize: 18, fontWeight: '700', color: '#14aa8c'},
  badge: {paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12},
  badgeText: {fontSize: 12, fontWeight: '700'},
  sensorCardContainer: {flexDirection: 'row', alignItems: 'center', gap: 20},
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  iconText: {fontSize: 32, fontWeight: 'bold', color: '#FFF'},
  sensorTextContainer: {flex: 1},
  sensorValue: {fontSize: 36, fontWeight: '900', color: '#333'},
  sensorUnit: {fontSize: 18, fontWeight: '600', color: '#9CA3AF'},
  sensorTimestamp: {fontSize: 13, color: '#9CA3AF', marginTop: 4},

  // Date Pills
  dateSelectorContainer: {marginBottom: 20},
  dateScrollContainer: {paddingVertical: 4, paddingHorizontal: 2},
  datePill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  datePillSelected: {backgroundColor: '#14aa8c', borderColor: '#14aa8c'},
  datePillText: {fontSize: 14, fontWeight: '600', color: '#6B7280'},
  datePillTextSelected: {color: '#FFFFFF'},

  // Chart
  chartContainer: {alignItems: 'center', marginVertical: 8},
  chart: {marginVertical: 8, borderRadius: 16},
  chartFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chartNote: {fontSize: 13, color: '#6B7280', textAlign: 'center'},

  // Logs List
  pastResultsSection: {marginTop: 8},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  pastResultsList: {gap: 12},
  pastResultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pastResultLeft: {flex: 1},
  pastResultDate: {fontSize: 16, fontWeight: '700', color: '#111827'},
  pastResultTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  pastResultRight: {alignItems: 'flex-end'},
  miniBadge: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10},
  miniBadgeText: {fontSize: 13, fontWeight: '700'},

  // Questionnaire & Result
  progressSection: {marginBottom: 24},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {fontSize: 14, fontWeight: '600', color: '#6B7280'},
  progressPercent: {fontSize: 14, fontWeight: '600', color: '#14aa8c'},
  progressBarContainer: {width: '100%'},
  progressBarBackground: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBarFill: {height: '100%', borderRadius: 12},

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {gap: 12},
  optionButton: {borderRadius: 16, overflow: 'hidden'},
  optionButtonSelected: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButtonDefault: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
  },
  optionNumberSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionNumberTextSelected: {fontSize: 14, fontWeight: '700', color: '#FFF'},
  optionNumberDefault: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionNumberTextDefault: {fontSize: 14, fontWeight: '700', color: '#14aa8c'},
  optionLabelSelected: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  optionLabelDefault: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },

  backButton: {marginBottom: 24, alignSelf: 'center', marginTop: 20},
  backButtonText: {fontSize: 15, fontWeight: '600', color: '#14aa8c'},

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  resultHeader: {alignItems: 'center', marginBottom: 24},
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {fontSize: 13, color: '#9CA3AF'},
  resultBox: {borderRadius: 20, padding: 20, marginBottom: 20},
  resultBoxContent: {flexDirection: 'row'},
  resultTextContainer: {flex: 1},
  resultLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  resultRecommendation: {fontSize: 13, color: '#6B7280', lineHeight: 18},
  scoreCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {fontSize: 16, fontWeight: '600', color: '#6B7280'},
  scoreContainer: {flexDirection: 'row', alignItems: 'baseline'},
  scoreNumber: {fontSize: 40, fontWeight: 'bold', color: '#14aa8c'},
  scoreTotal: {fontSize: 24, fontWeight: '600', color: '#9CA3AF'},

  doneButton: {
    backgroundColor: '#14aa8c',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {color: 'white', fontSize: 16, fontWeight: '700'},

  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubText: {fontSize: 13, color: '#6B7280', textAlign: 'center'},
});
