// firebase-config.js

// Your Firebase config
var firebaseConfig = {
  apiKey: "AIzaSyCGGUyBB4DeiYTO8xTnRxKNxbSQwxAPSIc",
  authDomain: "skillswap-32bfa.firebaseapp.com",
  databaseURL: "https://skillswap-32bfa-default-rtdb.firebaseio.com",
  projectId: "skillswap-32bfa",
  storageBucket: "skillswap-32bfa.appspot.com",
  messagingSenderId: "131600334637",
  appId: "1:131600334637:web:81563b0eeeb7667ec8dda4",
  measurementId: "G-61K52S70PF"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

var firebaseAuth = firebase.auth();
var firebaseFirestore = firebase.firestore();

console.log('Firebase initialized (compat mode)');
