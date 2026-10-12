// Firebase App
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";


// Firebase Authentication
import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


// Firestore
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";




// Firebase設定

const firebaseConfig = {

  apiKey:
  "AIzaSyDmXjXpibfIfejGsUCMyHK9UzklG4WhEmw",

  authDomain:
  "aitera-83486.firebaseapp.com",

  projectId:
  "aitera-83486",

  storageBucket:
  "aitera-83486.firebasestorage.app",

  messagingSenderId:
  "79405334766",

  appId:
  "1:79405334766:web:d06e917d5b3deff90c73ff"

};




// Firebase初期化

const app =
initializeApp(firebaseConfig);




// Authentication

const auth =
getAuth(app);




// Googleログイン用

const googleProvider =
new GoogleAuthProvider();




// Firestore

const db =
getFirestore(app);





export {

  app,

  auth,

  db,

  googleProvider

};
