import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBowWGzzFjro4m7_ZlZHvPyb3GZVIoPeYE",
  authDomain: "qcc-app-fc9e2.firebaseapp.com",
  projectId: "qcc-app-fc9e2",
  storageBucket: "qcc-app-fc9e2.firebasestorage.app",
  messagingSenderId: "629778740215",
  appId: "1:629778740215:web:83aeee19c342a8bffb34f2",
  measurementId: "G-7N4YMV9R91"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);