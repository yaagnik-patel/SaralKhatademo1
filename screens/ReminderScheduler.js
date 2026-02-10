import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Initialize notifications
export const initNotification = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('🔴 Notification permissions not granted');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#009145',
      sound: 'default',
    });
  }
};

// Single reminder after 5 seconds
export const scheduleSingleReminder = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📌 Reminder Time!',
        body: 'Pen-paper ko bye bolo. Add today\'s udhaar in SaralKhata ✍️',
        sound: 'default',
      },
      trigger: { seconds: 5 },
    });
  } catch (error) {
    console.error('❌ Failed to schedule 5-sec reminder:', error);
  }
};

// Daily reminders at specific IST times
export const scheduleDailyReminders = async () => {
  try {
    // Clear existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const reminders = [
      { id: 'morning', hour: 9, minute: 0, message: 'Ab phone smart hai, khata bhi smart rakho 💼' },
      { id: 'noon', hour: 12, minute: 0, message: 'Udhar likhna mat bhoolna aaj bhi 😌' },
      { id: 'afternoon', hour: 16, minute: 0, message: 'Ek chhoti yaad: SaralKhata mein entry karo!' },
      { id: 'evening', hour: 20, minute: 0, message: 'Roj ke hisaab important hai 📊' },
      { id: 'night', hour: 23, minute: 0, message: 'Last reminder of the day – update your khata! 🌙' },
    ];

    for (const reminder of reminders) {
      // Skip if the time has already passed today
      if (currentHour > reminder.hour || 
          (currentHour === reminder.hour && currentMinute >= reminder.minute)) {
        console.log(`Skipping ${reminder.id} as time has passed`);
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: '🔔 Daily Reminder',
          body: reminder.message,
          sound: 'default',
        },
        trigger: {
          hour: reminder.hour,
          minute: reminder.minute,
          repeats: true,
          timeZone: 'Asia/Kolkata',
        },
      });
      console.log(`Scheduled ${reminder.id} for ${reminder.hour}:${reminder.minute}`);
    }
  } catch (error) {
    console.error('❌ Failed to schedule daily reminders:', error);
  }
};