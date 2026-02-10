import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import SplashScreen from './screens/SplashScreen';
import { AuthProvider } from './screens/Auth/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import {
  initNotification,
  scheduleSingleReminder,
  scheduleDailyReminders,
} from './screens/ReminderScheduler';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('✅ Notification received in foreground:', notification);
    });

    const setupNotifications = async () => {
      await initNotification();
      
      // Schedule the single 5-second reminder
      await scheduleSingleReminder();
      
      // Schedule daily reminders in IST
      await scheduleDailyReminders();
    };

    // Show splash screen for 3 sec, then init notifications
    const splashTimeout = setTimeout(() => {
      setIsLoading(false);
      setupNotifications();
    }, 3000);

    return () => {
      clearTimeout(splashTimeout);
      notificationListener.remove();
    };
  }, []);

  return (
    <AuthProvider>
      {isLoading ? <SplashScreen /> : <AppNavigator />}
    </AuthProvider>
  );
}