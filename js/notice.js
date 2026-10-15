import {
  db
} from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


const params =
  new URLSearchParams(
    location.search
  );

const noticeId =
  params.get("id");


async function loadNotice(){

  const area =
    document.getElementById(
      "noticeDetail"
    );

  if(!noticeId){

    area.innerHTML =
      "お知らせが見つかりません。";

    return;

  }


  try{

    const snap =
      await getDoc(
        doc(
          db,
          "notices",
          noticeId
        )
      );


    if(!snap.exists()){

      area.innerHTML =
        "お知らせが存在しません。";

      return;

    }


    const data =
      snap.data();


    const tag =
      data.importance === "important"
        ? `<span class="important">重要</span>`
        : "";


    area.innerHTML = `

      <div class="detail-box">

        ${tag}

        <h1>
          ${escapeHtml(data.title || "")}
        </h1>

        <div class="document-body">
          ${escapeHtml(data.body || "")}
        </div>

        <p class="muted">

          公開期間：

          ${formatDate(data.startDate)}

          ${
            data.endDate
              ? " ～ " +
                formatDate(data.endDate)
              : ""
          }

        </p>

      </div>

    `;

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="error-message">
        お知らせを読み込めませんでした。
      </div>
    `;

  }

}


function formatDate(value){

  if(!value){
    return "";
  }

  return value.replaceAll("-", "/");

}


function escapeHtml(value){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


loadNotice();
