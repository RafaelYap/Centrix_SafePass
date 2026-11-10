// contexts/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brandColors, sapphireGradient } from '../styles/brandColors';

const ThemeContext = createContext();

export const themes = {
  light: {
    background: brandColors.background,
    surface: brandColors.surface,
    card: brandColors.surface,
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    primary: brandColors.blue,
    primaryLight: brandColors.sky,
    primaryDark: brandColors.navy,
    secondary: brandColors.gold,
    success: brandColors.success,
    warning: brandColors.warning,
    danger: brandColors.danger,
    info: '#06B6D4',
    header: {
      gradient: sapphireGradient,
    },
    nfcCard: {
      gradient: [brandColors.navy, '#0F172A'],
      text: brandColors.surface,
    },
    statCard: {
      gradient: ['#F3F4F6', '#FFFFFF'],
    },
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    card: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#374151',
    borderLight: '#1F2937',
    primary: '#8EC5FF',
    primaryLight: brandColors.sky,
    primaryDark: brandColors.blue,
    secondary: brandColors.gold,
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#22D3EE',
    header: {
      gradient: ['#1F2937', '#374151', '#4B5563'],
    },
    nfcCard: {
      gradient: ['#0F172A', '#0A0F1A'],
      text: '#F9FAFB',
    },
    statCard: {
      gradient: ['#1F2937', '#111827'],
    },
  },
};

export const ThemeProvider = ({ children }) => {
  const [hydrated, setHydrated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState(themes.light);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    setTheme(isDarkMode ? themes.dark : themes.light);
    if (hydrated) saveTheme();
  }, [isDarkMode, hydrated]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkModeEnabled');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }
    } catch (error) {
      console.error('Load theme error:', error);
    } finally {
      setHydrated(true);
    }
  };

  const saveTheme = async () => {
    try {
      await AsyncStorage.setItem('darkModeEnabled', isDarkMode.toString());
    } catch (error) {
      console.error('Save theme error:', error);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(current => !current);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleDarkMode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
