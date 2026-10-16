import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


window.showAdminPage=function(page){

  document
    .querySelectorAll(".content > section")
    .forEach(section=>{
      section.style.display="none";
    });

  const target=document.getElementById(page);

  if(target){
    target.style.display="block";
  }

};


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function isDateVisible(startDate,endDate){

  const today=new Date();

  today.setHours(0,0,0,0);

  if(startDate){

    const start=new Date(startDate+"T00:00:00");

    if(today<start) return false;

  }

  if(endDate){

    const end=new Date(endDate+"T23:59:59");

    if(today>end) return false;

  }

  return true;

}


onAuthStateChanged(
  auth,
  async(user)=>{

    if(!user){

      location.href="index.html";
      return;

    }

    const role=await getUserRole(user);

    if(role!=="admin"){

      alert("アクセス権限がありません");
      location.href="student.html";
      return;

    }

    await loadBlocks();
    await loadStudents();

    loadMessages();
    loadUsers();
    loadCalendarAdmin();
    loadAnalysis();
    loadDashboardCounts();

  }
);


async function getStudentList(){

  const snap=await getDocs(
    collection(db,"users")
  );

  return snap.docs
    .map(item=>({
      id:item.id,
      ...item.data()
    }))
    .filter(user=>user.role==="student");

}


async function loadBlocks(){

  const students=await getStudentList();

  const blocks=[
    ...new Set(
      students
        .map(user=>user.block)
        .filter(Boolean)
    )
  ];


  [
    "block",
    "documentBlock",
    "formBlock"
  ].forEach(id=>{

    const select=document.getElementById(id);

    if(!select) return;

    select.innerHTML="";

    blocks.forEach(block=>{

      const option=document.createElement("option");

      option.value=block;
      option.textContent=block;

      select.appendChild(option);

    });

  });

}


async function loadStudents(){

  const students=await getStudentList();

  [
    "targetUser",
    "documentTargetUser"
  ].forEach(id=>{

    const select=document.getElementById(id);

    if(!select) return;

    select.innerHTML="";

    students.forEach(student=>{

      const option=document.createElement("option");

      option.value=student.id;

      option.textContent=
        student.name || student.email || student.id;

      select.appendChild(option);

    });

  });

}


window.changeTarget=function(){

  const type=
    document.getElementById("targetType").value;

  document.getElementById("blockArea").style.display=
    type==="block" || type==="block_grade"
      ? "block"
      : "none";

  document.getElementById("gradeArea").style.display=
    type==="block_grade"
      ? "block"
      : "none";

  document.getElementById("userArea").style.display=
    type==="individual"
      ? "block"
      : "none";

};


window.changeDocumentTarget=function(){

  const type=
    document.getElementById("documentTargetType").value;

  document.getElementById("documentBlockArea").style.display=
    type==="block" || type==="block_grade"
      ? "block"
      : "none";

  document.getElementById("documentGradeArea").style.display=
    type==="block_grade"
      ? "block"
      : "none";

  document.getElementById("documentUserArea").style.display=
    type==="individual"
      ? "block"
      : "none";

};


window.createNotice=async function(){

  const title=
    document.getElementById("noticeTitle").value.trim();

  const body=
    document.getElementById("noticeBody").value.trim();

  const targetType=
    document.getElementById("targetType").value;

  if(!title){

    alert("タイトルを入力してください");
    return;

  }


  const data={

    title,
    body,

    importance:
      document.getElementById("importance").value,

    startDate:
      document.getElementById("startDate").value,

    endDate:
      document.getElementById("endDate").value,

    targetType,

    createdAt:serverTimestamp()

  };


  if(
    data.startDate &&
    data.endDate &&
    data.startDate>data.endDate
  ){

    alert("公開開始日は終了日以前にしてください");
    return;

  }


  if(
    targetType==="block" ||
    targetType==="block_grade"
  ){

    data.block=
      document.getElementById("block").value;

  }


  if(targetType==="block_grade"){

    data.grade=
      document.getElementById("grade").value;

  }


  if(targetType==="individual"){

    data.uid=
      document.getElementById("targetUser").value;

  }


  await addDoc(
    collection(db,"notices"),
    data
  );


  document.getElementById("noticeTitle").value="";
  document.getElementById("noticeBody").value="";


  alert("お知らせを公開しました");

  loadDashboardCounts();

};


window.addDocument=async function(){

  const title=
    document.getElementById("documentTitle").value.trim();

  const body=
    document.getElementById("documentBody").value.trim();

  const url=
    document.getElementById("documentUrl").value.trim();

  const startDate=
    document.getElementById("documentStartDate").value;

  const endDate=
    document.getElementById("documentEndDate").value;

  const targetType=
    document.getElementById("documentTargetType").value;


  if(!title || !url){

    alert("タイトルとURLを入力してください");
    return;

  }


  if(startDate && endDate && startDate>endDate){

    alert("公開開始日は終了日以前にしてください");
    return;

  }


  const data={

    title,
    body,
    url,

    startDate,
    endDate,

    targetType,

    createdAt:serverTimestamp()

  };


  if(
    targetType==="block" ||
    targetType==="block_grade"
  ){

    data.block=
      document.getElementById("documentBlock").value;

  }


  if(targetType==="block_grade"){

    data.grade=
      document.getElementById("documentGrade").value;

  }


  if(targetType==="individual"){

    data.uid=
      document.getElementById("documentTargetUser").value;

  }


  await addDoc(
    collection(db,"documents"),
    data
  );


  document.getElementById("documentTitle").value="";
  document.getElementById("documentBody").value="";
  document.getElementById("documentUrl").value="";
  document.getElementById("documentStartDate").value="";
  document.getElementById("documentEndDate").value="";


  alert("配布文書を登録しました");

  loadDashboardCounts();

};


window.addCalendar=async function(){

  const title=
    document.getElementById("calendarTitle").value.trim();

  const startDate=
    document.getElementById("calendarStartDate").value;

  const endDate=
    document.getElementById("calendarEndDate").value;

  const description=
    document.getElementById("calendarDescription").value.trim();


  if(!title || !startDate){

    alert("予定名と開始日を入力してください");
    return;

  }


  const actualEnd=endDate || startDate;


  if(startDate>actualEnd){

    alert("開始日は終了日以前にしてください");
    return;

  }


  await addDoc(
    collection(db,"calendar"),
    {

      title,
      startDate,
      endDate:actualEnd,

      // 旧コードとの互換用
      date:startDate,

      description,

      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()

    }
  );


  document.getElementById("calendarTitle").value="";
  document.getElementById("calendarStartDate").value="";
  document.getElementById("calendarEndDate").value="";
  document.getElementById("calendarDescription").value="";


  alert("予定を登録しました");

  loadCalendarAdmin();

};


async function loadCalendarAdmin(){

  const area=document.getElementById("adminCalendar");

  if(!area) return;


  const snap=await getDocs(
    query(
      collection(db,"calendar"),
      orderBy("startDate","asc")
    )
  );


  area.innerHTML="";


  snap.forEach(item=>{

    const data=item.data();

    const start=data.startDate || data.date || "";
    const end=data.endDate || start;


    area.innerHTML+=`

      <div class="card">

        <strong>

          ${escapeHtml(start)}

          ${
            end!==start
              ? " ～ "+escapeHtml(end)
              : ""
          }

        </strong>

        <h3>
          ${escapeHtml(data.title)}
        </h3>

        <p>
          ${escapeHtml(data.description || "")}
        </p>

        <button
          onclick="deleteCalendar('${item.id}')"
        >
          削除
        </button>

      </div>

    `;

  });

}


window.deleteCalendar=async function(id){

  if(!confirm("この予定を削除しますか？")) return;

  await deleteDoc(
    doc(db,"calendar",id)
  );

  alert("削除しました");

  loadCalendarAdmin();

};


window.openMessage=async function(id){

  await updateDoc(
    doc(db,"messages",id),
    {

      status:"opened",
      openedAt:serverTimestamp()

    }
  );

  loadMessages();

};


async function loadMessages(){

  const area=document.getElementById("messageList");

  if(!area) return;


  const snap=await getDocs(
    query(
      collection(db,"messages"),
      orderBy("createdAt","desc")
    )
  );


  area.innerHTML="";


  snap.forEach(item=>{

    const data=item.data();

    area.innerHTML+=`

      <div class="card">

        <p>
          <strong>送信者：</strong>
          ${escapeHtml(data.senderName)}
        </p>

        <p>
          <strong>メール：</strong>
          ${escapeHtml(data.senderEmail)}
        </p>

        <p>
          ${escapeHtml(data.body)}
        </p>

        <p>
          状態：
          ${escapeHtml(data.status || "unread")}
        </p>

        ${
          data.status!=="opened"
            ? `
              <button
                onclick="openMessage('${item.id}')"
              >
                開封する
              </button>
            `
            : "確認済み"
        }

      </div>

    `;

  });

}


async function loadUsers(){

  const area=document.getElementById("userList");

  if(!area) return;


  const students=await getStudentList();

  area.innerHTML="";


  students.forEach(student=>{

    area.innerHTML+=`

      <div class="card">

        <p>
          名前：
          ${escapeHtml(student.name)}
        </p>

        <p>
          ブロック：
          ${escapeHtml(student.block)}
        </p>

        <p>
          学年：
          ${escapeHtml(student.grade)}
        </p>

        <p>
          UID：
          ${escapeHtml(student.id)}
        </p>

      </div>

    `;

  });


  const countArea=
    document.getElementById("studentCount");

  if(countArea){

    countArea.textContent=
      `${students.length}人`;

  }

}


async function loadDashboardCounts(){

  const students=await getStudentList();

  const scoreSnap=await getDocs(
    collection(db,"scores")
  );

  const noticeSnap=await getDocs(
    collection(db,"notices")
  );

  const documentSnap=await getDocs(
    collection(db,"documents")
  );


  const scoreCount=
    document.getElementById("scoreCount");

  const noticeCount=
    document.getElementById("noticeCount");

  const documentCount=
    document.getElementById("documentCount");


  if(scoreCount){

    scoreCount.textContent=
      `${scoreSnap.size}件`;

  }


  if(noticeCount){

    let count=0;

    noticeSnap.forEach(item=>{

      const data=item.data();

      if(isDateVisible(
        data.startDate,
        data.endDate
      )){

        count++;

      }

    });

    noticeCount.textContent=
      `${count}件`;

  }


  if(documentCount){

    let count=0;

    documentSnap.forEach(item=>{

      const data=item.data();

      if(isDateVisible(
        data.startDate,
        data.endDate
      )){

        count++;

      }

    });

    documentCount.textContent=
      `${count}件`;

  }


  const studentCount=
    document.getElementById("studentCount");

  if(studentCount){

    studentCount.textContent=
      `${students.length}人`;

  }

}


window.createScoreForm=async function(){

  const subjects=[];

  document
    .querySelectorAll(
      "#subjectList input[type='checkbox']:checked"
    )
    .forEach(item=>{

      subjects.push(item.value);

    });


  if(!subjects.length){

    alert("科目を1つ以上選択してください");
    return;

  }


  const targetType=
    document.getElementById("formTargetType").value;


  const data={

    title:
      document.getElementById("formTitle").value.trim(),

    testType:
      document.getElementById("testType").value,

    subjects,

    startDate:
      document.getElementById("formStartDate").value,

    endDate:
      document.getElementById("formEndDate").value,

    targetType,

    published:true,

    createdBy:auth.currentUser.uid,

    createdAt:serverTimestamp()

  };


  if(!data.title){

    alert("フォーム名を入力してください");
    return;

  }


  if(
    data.startDate &&
    data.endDate &&
    data.startDate>data.endDate
  ){

    alert("公開開始日は終了日以前にしてください");
    return;

  }


  if(
    targetType==="block" ||
    targetType==="block_grade"
  ){

    data.block=
      document.getElementById("formBlock").value;

  }


  if(targetType==="block_grade"){

    data.grade=
      document.getElementById("formGrade").value;

  }


  await addDoc(
    collection(db,"scoreForms"),
    data
  );


  document.getElementById("formTitle").value="";


  alert("成績フォームを作成しました");

};


async function loadAnalysis(){

  const area=document.getElementById("analysisArea");

  if(!area) return;

  // scoreAnalysis.js が詳細分析を担当
  // この関数はページ読み込み時の存在確認用

  area.innerHTML=
    "成績分析を読み込んでいます...";

}


loadAnalysis();
