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

const documentId =
  params.get("id");


async function loadDocument(){

  const area =
    document.getElementById(
      "documentDetail"
    );

  if(!documentId){

    area.innerHTML =
      "文書が見つかりません。";

    return;

  }


  try{

    const snap =
      await getDoc(
        doc(
          db,
          "documents",
          documentId
        )
      );


    if(!snap.exists()){

      area.innerHTML =
        "文書が存在しません。";

      return;

    }


    const data =
      snap.data();


    area.innerHTML = `

      <div class="detail-box">

        <div class="document-tag">
          配布文書
        </div>

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

        ${
          data.url
            ? `

              <a
                href="${escapeAttribute(data.url)}"
                target="_blank"
                rel="noopener noreferrer">

                <button>
                  文書を開く
                </button>

              </a>

            `
            : ""
        }

      </div>

    `;

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="error-message">
        文書を読み込めませんでした。
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


function escapeAttribute(value){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}


loadDocument();
