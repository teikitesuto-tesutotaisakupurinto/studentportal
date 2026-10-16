import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let currentUser = null;
let userData = null;


window.showPage = function(page){

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

    if(today < start){
      return false;
    }

  }

  if(endDate){

    const end=new Date(endDate+"T23:59:59");

    if(today > end){
      return false;
    }

  }

  return true;

}


function canViewTarget(data){

  if(!data.targetType || data.targetType==="all"){
    return true;
  }

  if(data.targetType==="block"){
    return data.block===userData.block;
  }

  if(data.targetType==="block_grade"){

    return (
      data.block===userData.block &&
      data.grade===userData.grade
    );

  }

  if(data.targetType==="individual"){

    return data.uid===currentUser.uid;

  }

  return false;

}


onAuthStateChanged(
  auth,
  async(user)=>{

    if(!user){

      location.href="index.html";
      return;

    }

    const role=await getUserRole(user);

    if(role!=="student"){

      alert("アクセス権限がありません");
      location.href="admin.html";
      return;

    }

    currentUser=user;

    const snap=await getDoc(
      doc(db,"users",user.uid)
    );

    if(!snap.exists()){

      alert("ユーザー情報がありません");
      return;

    }

    userData=snap.data();

    loadUserInfo();
    loadNotices();
    loadDocuments();
    loadDashboardDocuments();
    loadDashboardCalendar();
    loadScoreForms();

  }
);


function loadUserInfo(){

  const area=document.getElementById("userInfo");

  if(!area) return;

  area.innerHTML=`

    <p><strong>名前：</strong>${escapeHtml(userData.name)}</p>
    <p><strong>メール：</strong>${escapeHtml(currentUser.email)}</p>
    <p><strong>ブロック：</strong>${escapeHtml(userData.block)}</p>
    <p><strong>学年：</strong>${escapeHtml(userData.grade)}</p>

  `;

}


async function loadNotices(){

  const area=document.getElementById("noticeList");
  const dashboard=document.getElementById("dashboardNotice");

  if(!area && !dashboard) return;

  try{

    const snap=await getDocs(
      query(
        collection(db,"notices"),
        orderBy("createdAt","desc")
      )
    );

    let html="";
    let visibleCount=0;

    snap.forEach(item=>{

      const data=item.data();

      if(!isDateVisible(data.startDate,data.endDate)){
        return;
      }

      if(!canViewTarget(data)){
        return;
      }

      visibleCount++;

      const important=
        data.importance==="important"
          ? `<span class="important">重要</span>`
          : "";

      html+=`

        <div class="notice-card">

          ${important}

          <a href="notice.html?id=${encodeURIComponent(item.id)}">

            <h3>${escapeHtml(data.title)}</h3>

          </a>

          <p>
            ${escapeHtml(
              String(data.body || "").substring(0,100)
            )}
          </p>

          <small>
            ${escapeHtml(data.startDate || "")}
            ${data.endDate ? " ～ "+escapeHtml(data.endDate) : ""}
          </small>

        </div>

      `;

    });

    if(!html){

      html=`<p>現在表示できるお知らせはありません。</p>`;

    }

    if(area){
      area.innerHTML=html;
    }

    if(dashboard){

      dashboard.innerHTML=html
        .split("</div>")
        .slice(0,4)
        .join("</div>");

    }

  }catch(error){

    console.error(error);

    if(area){
      area.innerHTML="<p>お知らせを読み込めませんでした。</p>";
    }

    if(dashboard){
      dashboard.innerHTML="<p>お知らせを読み込めませんでした。</p>";
    }

  }

}


async function loadDocuments(){

  const area=document.getElementById("documentList");

  if(!area) return;

  try{

    const snap=await getDocs(
      query(
        collection(db,"documents"),
        orderBy("createdAt","desc")
      )
    );

    let html="";

    snap.forEach(item=>{

      const data=item.data();

      if(!isDateVisible(data.startDate,data.endDate)){
        return;
      }

      if(!canViewTarget(data)){
        return;
      }

      html+=`

        <div class="card">

          <h3>${escapeHtml(data.title)}</h3>

          <p>
            ${escapeHtml(data.body || "")}
          </p>

          <p>
            公開期間：
            ${escapeHtml(data.startDate || "指定なし")}
            ～
            ${escapeHtml(data.endDate || "指定なし")}
          </p>

          <a
            href="${escapeHtml(data.url || "#")}"
            target="_blank"
            rel="noopener noreferrer"
            class="document-open-button"
          >
            配布文書を開く
          </a>

          <br><br>

          <a href="document.html?id=${encodeURIComponent(item.id)}">
            文書詳細を見る
          </a>

        </div>

      `;

    });

    area.innerHTML=
      html || "<p>現在表示できる配布文書はありません。</p>";

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>配布文書を読み込めませんでした。</p>";

  }

}


async function loadDashboardDocuments(){

  const area=document.getElementById("dashboardDocuments");

  if(!area) return;

  try{

    const snap=await getDocs(
      query(
        collection(db,"documents"),
        orderBy("createdAt","desc")
      )
    );

    let count=0;
    let html="";

    snap.forEach(item=>{

      if(count>=3) return;

      const data=item.data();

      if(!isDateVisible(data.startDate,data.endDate)){
        return;
      }

      if(!canViewTarget(data)){
        return;
      }

      html+=`

        <div class="notice-card">

          <h3>${escapeHtml(data.title)}</h3>

          <a
            href="${escapeHtml(data.url || "#")}"
            target="_blank"
            rel="noopener noreferrer"
          >
            配布文書を開く
          </a>

        </div>

      `;

      count++;

    });

    area.innerHTML=
      html || "<p>現在公開中の配布文書はありません。</p>";

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>配布文書を読み込めませんでした。</p>";

  }

}


async function loadDashboardCalendar(){

  const area=document.getElementById("dashboardCalendar");

  if(!area) return;

  try{

    const snap=await getDocs(
      collection(db,"calendar")
    );

    const events=[];

    snap.forEach(item=>{

      const data=item.data();

      const start=data.startDate || data.date;

      const end=data.endDate || start;

      if(!start) return;

      events.push({
        ...data,
        startDate:start,
        endDate:end
      });

    });

    events.sort(
      (a,b)=>a.startDate.localeCompare(b.startDate)
    );

    const today=new Date();

    today.setHours(0,0,0,0);

    let html="";
    let count=0;

    for(const event of events){

      if(count>=5) break;

      const end=new Date(event.endDate+"T23:59:59");

      if(end < today) continue;

      html+=`

        <div class="notice-card">

          <strong>
            ${escapeHtml(event.startDate)}
            ${event.endDate!==event.startDate
              ? " ～ "+escapeHtml(event.endDate)
              : ""}
          </strong>

          <p>${escapeHtml(event.title)}</p>

        </div>

      `;

      count++;

    }

    area.innerHTML=
      html || "<p>直近の予定はありません。</p>";

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>予定を読み込めませんでした。</p>";

  }

}


async function loadScoreForms(){

  const area=document.getElementById("scoreFormList");

  if(!area) return;

  try{

    const snap=await getDocs(
      query(
        collection(db,"scoreForms"),
        orderBy("createdAt","desc")
      )
    );

    let html="";

    for(const item of snap.docs){

      const data=item.data();

      if(data.published===false) continue;

      if(!isDateVisible(data.startDate,data.endDate)){
        continue;
      }

      if(!canViewTarget(data)){
        continue;
      }

      html+=`

        <div class="card">

          <h3>${escapeHtml(data.title)}</h3>

          <p>
            ${escapeHtml(data.testType || "")}
          </p>

          <p>
            ${escapeHtml(data.startDate || "")}
            ～
            ${escapeHtml(data.endDate || "")}
          </p>

          <a href="scoreForm.html?id=${encodeURIComponent(item.id)}">

            <button>
              成績を確認・提出
            </button>

          </a>

        </div>

      `;

    }

    area.innerHTML=
      html || "<p>現在提出できる成績フォームはありません。</p>";

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>成績フォームを読み込めませんでした。</p>";

  }

}


window.sendMessage=async function(){

  const input=document.getElementById("messageText");

  const text=input.value.trim();

  if(!text){

    alert("内容を入力してください");
    return;

  }

  try{

    await addDoc(
      collection(db,"messages"),
      {
        senderUid:currentUser.uid,
        senderName:userData.name || "",
        senderEmail:currentUser.email || "",
        body:text,
        status:"unread",
        createdAt:serverTimestamp()
      }
    );

    input.value="";

    alert("送信しました");

  }catch(error){

    console.error(error);

    alert("送信できませんでした");

  }

};
