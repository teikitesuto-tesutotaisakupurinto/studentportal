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
  "1:79405334766:web:694c02a7abb407b50c73ff"

};




// Firebase初期化

const app =
initializeApp(firebaseConfig);




// Auth

const auth =
getAuth(app);




// Google認証

const googleProvider =
new GoogleAuthProvider();




// Firestore

const db =
getFirestore(app);





export {

  app,

  auth,

  googleProvider,

  db

};
