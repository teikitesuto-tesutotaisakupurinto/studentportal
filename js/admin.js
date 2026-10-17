import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let students = [];


const esc = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[c])
  );


/* =====================================================
   認証
===================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "../index.html";

      return;

    }


    try{

      const role =
        await getUserRole(user);


      if(role !== "admin"){

        alert(
          "アクセス権限がありません"
        );

        location.href =
          "../student.html";

        return;

      }

    }catch(error){

      console.error(error);

    }

  }
);


/* =====================================================
   ダッシュボード
===================================================== */

async function loadDashboard(){

  const count =
    document.getElementById(
      "scoreCount"
    );


  if(!count){
    return;
  }


  try{

    const snap =
      await getDocs(
        collection(
          db,
          "scores"
        )
      );


    count.textContent =
      `${snap.size}件`;


  }catch(error){

    console.error(
      "成績件数取得エラー:",
      error
    );

    count.textContent =
      "-";

  }

}


/* =====================================================
   生徒数
===================================================== */

async function loadStudents(){

  try{

    const snap =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    students = [];


    snap.forEach(
      item => {

        const data =
          item.data();


        if(
          data.role === "student"
        ){

          students.push({

            id:item.id,

            ...data

          });

        }

      }
    );


    const count =
      document.getElementById(
        "studentCount"
      );


    if(count){

      count.textContent =
        `${students.length}人`;

    }


  }catch(error){

    console.error(
      "生徒情報取得エラー:",
      error
    );

  }

}


/* =====================================================
   初期処理
===================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if(!user){
      return;
    }


    const role =
      await getUserRole(user);


    if(
      role !== "admin"
    ){

      return;

    }


    await loadStudents();

    await loadDashboard();

  }
);
