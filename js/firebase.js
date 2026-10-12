// Firebase SDK

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





// Firebase設定

const firebaseConfig = {

  apiKey: "AIzaSyDmXjXpibfIfejGsXj0xQ0x9UzklG4WhEmw",

  authDomain:
  "aitera-83486.firebaseapp.com",

  projectId:
  "aitera-83486",

  messagingSenderId:
  "79405334766",

  appId:
  "1:79405334766:web:d06e917d5b3deff90c73ff"

};





// 初期化

const app =
initializeApp(firebaseConfig);





// Authentication

const auth =
getAuth(app);





// Googleログイン

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
