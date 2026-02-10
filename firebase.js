// firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD9Wbl8TAGJInAEYn42nhxsfKkwEEie25c",
  authDomain: "saral-khata-a4796.firebaseapp.com",
  databaseURL: "https://saral-khata-a4796-default-rtdb.firebaseio.com",
  projectId: "saral-khata-a4796",
  storageBucket: "saral-khata-a4796.firebasestorage.app",
  messagingSenderId: "690569797333",
  appId: "1:690569797333:web:c477e9bf3ec4c86611cc5c",
  measurementId: "G-MZQ4DESZBM"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getDatabase(app);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

export { db };