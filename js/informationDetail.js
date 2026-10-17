import {
  db,
  requireLogin
} from "./auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


const area =
  document.getElementById(
    "noticeDetail"
  );


function escapeHTML(
  value
){

  return String(
    value ?? ""
  )
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");
}


function formatDate(
  value
){

  if(!value){
    return "";
  }

  const date =
    typeof value.toDate ===
    "function"
      ? value.toDate()
      : new Date(value);


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return "";
  }


  const pad =
    n =>
      String(n).padStart(
        2,
        "0"
      );


  return (
    date.getFullYear()
    + "/"
    + pad(date.getMonth()+1)
    + "/"
    + pad(date.getDate())
    + " "
    + pad(date.getHours())
    + ":"
    + pad(date.getMinutes())
    + ":"
    + pad(date.getSeconds())
  );
}


const params =
  new URLSearchParams(
    location.search
  );


const id =
  params.get("id");


requireLogin(
  async () => {

    if(!id){

      area.innerHTML = `

        <div class="status-box error">

          お知らせが指定されていません。

        </div>

      `;

      return;
    }


    try{

      const ref =
        doc(
          db,
          "announcements",
          id
        );


      const snap =
        await getDoc(ref);


      if(!snap.exists()){

        area.innerHTML = `

          <div class="status-box error">

            お知らせが見つかりません。

          </div>

        `;

        return;
      }


      const data =
        snap.data();


      const title =
        escapeHTML(
          data.title ??
          data.subject ??
          "無題のお知らせ"
        );


      const body =
        escapeHTML(
          data.body ??
          ""
        );


      const sender =
        escapeHTML(
          data.senderName ??
          data.sender ??
          data.createdByName ??
          "管理者"
        );


      const scope =
        escapeHTML(
          data.scope ??
          data.distributionScope ??
          data.target ??
          "全員"
        );


      const date =
        escapeHTML(
          formatDate(
            data.publishedAt ??
            data.createdAt
          )
        );


      area.innerHTML = `

        <div class="page-header">

          <h1>
            お知らせ
          </h1>

          <a
            href="./admin.html"
            class="btn btn-light"
          >

            <span class="material-symbols-outlined">
              arrow_back
            </span>

            戻る

          </a>

        </div>


        <article class="card">

          <h2>
            ${title}
          </h2>


          <div class="notice-meta">

            ${sender}
            ⇒
            ${scope}

            ${date ? `[${date}]` : ""}

          </div>


          <div class="notice-body">

            ${body}

          </div>

        </article>

      `;


    }catch(error){

      console.error(
        "お知らせ詳細取得エラー:",
        error
      );


      area.innerHTML = `

        <div class="status-box error">

          お知らせを取得できませんでした。

        </div>

      `;

    }

  }
);
