import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';

const { width } = Dimensions.get('window');

export default function WelcomeCarouselScreen({ navigation }) {
  const { theme } = useTheme();
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);

  // simple slide data (icon + text)
  const slides = [
    {
      icon: '💰',
      title: 'Welcome to ExpenseWise',
      desc: 'Track your income and expenses effortlessly.',
      tint: '#4CAF50',
    },
    {
      icon: '📊',
      title: 'Budget Smart',
      desc: 'Use the 50/30/20 rule to stay on target.',
      tint: '#2196F3',
    },
    {
      icon: '📈',
      title: 'Get Insights',
      desc: 'See where your money goes with clear reports.',
      tint: '#9C27B0',
    },
    {
      icon: '🎯',
      title: 'Set Goals',
      desc: 'Create realistic budgets and savings goals.',
      tint: '#FF9800',
    },
  ];

  const onScroll = useCallback((e) => {
    const w = e.nativeEvent.layoutMeasurement.width;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / w);
    if (i !== current) setCurrent(i);
  }, [current]);

  const goTo = (index) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const onNext = () => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      // On the last slide ("Set Goals"), navigate to GoalSettingScreen
      navigation.navigate('GoalSetting');
    }
  };

  const onSkip = () => {
    // Skip directly to GoalSettingScreen
    navigation.navigate('GoalSetting');
  };

  const renderDot = (i) => (
    <View
      key={i}
      style={[
        styles.dot,
        {
          backgroundColor:
            i === current ? theme.colors.primary : theme.colors.primary + '30',
          width: i === current ? 24 : 8,
        },
      ]}
    />
  );

  const Slide = ({ s }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconWrap, { backgroundColor: s.tint + '20' }]}>
        <Text style={styles.icon}>{s.icon}</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{s.title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {s.desc}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* top-right Skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onSkip}>
          <Text style={[styles.skip, { color: theme.colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroller}
      >
        {slides.map((s, i) => <Slide key={i} s={s} />)}
      </ScrollView>

  
      <View style={styles.footer}>
        <View style={styles.dots}>{slides.map((_, i) => renderDot(i))}</View>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]}
          onPress={onNext}
        >
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20,
     paddingTop: 10,
      alignItems: 'flex-end' },
  skip: { fontSize: 16,
     fontWeight: '600' },

  scroller: { flex: 1 },
  slide: { justifyContent: 'center',
     alignItems: 'center',
      paddingHorizontal: 28 },

  iconWrap: {
    width: 120, height: 120,
     borderRadius: 60,
    alignItems: 'center',
     justifyContent: 'center',
      marginBottom: 28,
  },
  icon: { fontSize: 58 },

  title: { fontSize: 26,
     fontWeight: '800',
      textAlign: 'center',
       marginBottom: 10,
        lineHeight: 32 },
  
  subtitle: { fontSize: 16,
     textAlign: 'center',
      lineHeight: 22,
       opacity: 0.9 },

  footer: { paddingHorizontal: 24,
    paddingVertical: 20 },
  dots: { flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24 },
  
   dot: { height: 8,
     borderRadius: 4,
      marginHorizontal: 4 },

  nextBtn: {
    borderRadius: 12, 
    paddingVertical: 16,
     alignItems: 'center',
    shadowColor: '#000', 
    
    shadowOffset: {
      width: 0,
      height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4, 
      elevation: 3,
  },
  nextText: { color: '#fff',
    fontSize: 16,
    fontWeight: '700' },
});