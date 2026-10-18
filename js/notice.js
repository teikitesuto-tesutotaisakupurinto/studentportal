import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserData
} from "./auth.js";

const id =
  new URLSearchParams(
    location.search
  ).get("id");

function esc(value){

  return String(value ?? "")
    .replace(/[&<>"']/g,char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[char]));

}

function formatDateTime(value){

  if(!value){
    return "";
  }

  const d =
    value?.toDate
      ? value.toDate()
      : new Date(value);

  if(Number.isNaN(d.getTime())){
    return "";
  }

  const p =
    n => String(n).padStart(2,"0");

  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

}

function targetText(type){

  switch(type){

    case "individual":
      return "個別送信";

    case "block":
      return "ブロック一斉送信";

    case "block_grade":
      return "ブロック＋学年";

    case "grade":
      return "学年一斉送信";

    default:
      return "全員";

  }

}

async function load(){

  const area =
    document.getElementById(
      "noticeDetail"
    );

  if(!id){

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
          id
        )
      );

    if(!snap.exists()){

      area.innerHTML =
        "お知らせが存在しません。";

      return;

    }

    const data =
      snap.data();

    area.innerHTML = `

      ${
        data.importance === "important"
          ? `<span class="important">重要</span>`
          : `<span class="normal-tag">通常</span>`
      }

      <h1 class="page-title">
        ${esc(data.title)}
      </h1>

      <div class="notice-body">

        ${esc(data.body || "")}

      </div>

      <p class="notice-meta">

        ${
          esc(
            data.senderName ||
            "管理者"
          )
        }

        ⇒

        ${
          esc(
            targetText(
              data.targetType
            )
          )
        }

        ${
          formatDateTime(
            data.createdAt
          )
            ? ` [${formatDateTime(data.createdAt)}]`
            : ""
        }

      </p>

    `;

  }catch(error){

    console.error(error);

    area.innerHTML =
      `<p class="error">
        お知らせを読み込めませんでした。
      </p>`;

  }

}

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "/studentportal/index.html";

      return;

    }

    await getUserData(user);

    load();

  }
);
