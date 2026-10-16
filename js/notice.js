import {
  db
} from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const id =
  new URLSearchParams(
    location.search
  ).get("id");

const esc =
  value =>
    String(value ?? "").replace(
      /[&<>\"]/g,
      c => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;"
      }[c])
    );

async function load(){

  const area =
    document.getElementById(
      "noticeDetail"
    );

  if(!id){

    area.innerHTML =
      `<div class="card">お知らせが見つかりません。</div>`;

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
        `<div class="card">お知らせが存在しません。</div>`;

      return;
    }

    const data =
      snap.data();

    area.innerHTML = `

      <div class="card">

        ${
          data.importance === "important"
            ? `<span class="important">重要</span>`
            : `<span class="normal-tag">通常</span>`
        }

        <h1>
          ${esc(data.title)}
        </h1>

        <div class="document-body">
          ${esc(data.body)}
        </div>

        <p>
          公開期間：
          ${esc(data.startDate || "")}
          ${
            data.endDate
              ? " 〜 " +
                esc(data.endDate)
              : ""
          }
        </p>

      </div>

    `;

  }catch(error){

    console.error(error);

    area.innerHTML =
      `
        <div class="card error">
          お知らせを読み込めませんでした。
        </div>
      `;

  }

}

load();
