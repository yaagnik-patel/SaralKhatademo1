// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD9Wbl8TAGJInAEYn42nhxsfKkwEEie25c",
  authDomain: "saral-khata-a4796.firebaseapp.com",
  projectId: "saral-khata-a4796",
  storageBucket: "saral-khata-a4796.firebasestorage.app",
  messagingSenderId: "690569797333",
  appId: "1:690569797333:web:c477e9bf3ec4c86611cc5c",
  measurementId: "G-MZQ4DESZBM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);