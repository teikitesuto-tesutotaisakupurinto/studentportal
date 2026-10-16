import {
  db
} from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


const params=new URLSearchParams(location.search);

const noticeId=params.get("id");


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


async function loadNotice(){

  const area=document.getElementById("noticeDetail");

  if(!noticeId){

    area.innerHTML="<p>お知らせが見つかりません。</p>";
    return;

  }

  try{

    const snap=await getDoc(
      doc(db,"notices",noticeId)
    );

    if(!snap.exists()){

      area.innerHTML="<p>お知らせが存在しません。</p>";
      return;

    }

    const data=snap.data();

    const today=new Date();

    today.setHours(0,0,0,0);

    if(data.startDate){

      const start=new Date(data.startDate+"T00:00:00");

      if(today<start){

        area.innerHTML="<p>公開前のお知らせです。</p>";
        return;

      }

    }

    if(data.endDate){

      const end=new Date(data.endDate+"T23:59:59");

      if(today>end){

        area.innerHTML="<p>公開終了したお知らせです。</p>";
        return;

      }

    }

    const tag=
      data.importance==="important"
        ? `<span class="important">重要</span>`
        : "";

    area.innerHTML=`

      <div class="detail-box">

        ${tag}

        <h1>
          ${escapeHtml(data.title)}
        </h1>

        <div class="notice-detail-body">
          ${escapeHtml(data.body || "").replaceAll("\n","<br>")}
        </div>

        <hr>

        <p>
          公開期間：
          ${escapeHtml(data.startDate || "指定なし")}
          ～
          ${escapeHtml(data.endDate || "指定なし")}
        </p>

      </div>

    `;

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>お知らせを読み込めませんでした。</p>";

  }

}


loadNotice();
