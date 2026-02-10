// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref as dbRef, get, onValue } from 'firebase/database';
import { db } from './../../firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  const isFirebaseConnected = async () => {
    return new Promise((resolve) => {
      const connectedRef = dbRef(db, '.info/connected');
      const timeout = setTimeout(() => resolve(false), 3000); // Timeout fallback

      onValue(
        connectedRef,
        (snap) => {
          clearTimeout(timeout);
          resolve(snap.val() === true);
        },
        { onlyOnce: true }
      );
    });
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('currentUserId');
        if (!userId) return;

        const isConnected = await isFirebaseConnected();

        if (isConnected) {
          try {
            const userRef = dbRef(db, `credentials/${userId}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
              const userData = snapshot.val();
              const fullUser = { ...userData, userId };
              setCurrentUser(fullUser);
              await AsyncStorage.setItem('currentUserData', JSON.stringify(fullUser));
              return;
            }
          } catch (err) {
            console.log("Error fetching from Firebase:", err);
          }
        }

        // Offline fallback
        const offlineUser = await AsyncStorage.getItem('currentUserData');
        if (offlineUser) {
          setCurrentUser(JSON.parse(offlineUser));
        } else {
          await logout();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await logout();
      }
    };

    checkLoginStatus();
  }, []);

  const login = async (userId) => {
    try {
      const isConnected = await isFirebaseConnected();

      if (!isConnected) {
        throw new Error('Firebase is not connected. Try again later.');
      }

      const userRef = dbRef(db, `credentials/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const fullUser = { ...userData, userId };
        await AsyncStorage.setItem('currentUserId', userId);
        await AsyncStorage.setItem('currentUserData', JSON.stringify(fullUser));
        setCurrentUser(fullUser);
      } else {
        console.warn('Login failed: Invalid user ID.');
      }
    } catch (err) {
      console.error('Login error:', err.message);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('currentUserId');
    await AsyncStorage.removeItem('currentUserData');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
