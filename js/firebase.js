import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";


import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";



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



const app =
initializeApp(firebaseConfig);



const auth =
getAuth(app);



const googleProvider =
new GoogleAuthProvider();



const db =
getFirestore(app);



export {

  app,

  auth,

  googleProvider,

  db

};
