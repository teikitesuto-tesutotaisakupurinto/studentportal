import {
  db
} from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


const params=new URLSearchParams(location.search);

const documentId=params.get("id");


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


async function loadDocument(){

  const area=document.getElementById("documentDetail");

  if(!documentId){

    area.innerHTML="<p>文書が見つかりません。</p>";
    return;

  }

  try{

    const snap=await getDoc(
      doc(db,"documents",documentId)
    );

    if(!snap.exists()){

      area.innerHTML="<p>文書が存在しません。</p>";
      return;

    }

    const data=snap.data();

    area.innerHTML=`

      <div class="detail-box">

        <h1>
          ${escapeHtml(data.title)}
        </h1>

        <div class="document-detail-body">

          ${escapeHtml(data.body || "")
            .replaceAll("\n","<br>")}

        </div>

        <hr>

        <p>
          公開期間：
          ${escapeHtml(data.startDate || "指定なし")}
          ～
          ${escapeHtml(data.endDate || "指定なし")}
        </p>

        <p>

          <a
            href="${escapeHtml(data.url || "#")}"
            target="_blank"
            rel="noopener noreferrer"
            class="document-open-button"
          >
            配布文書を開く
          </a>

        </p>

      </div>

    `;

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>文書を読み込めませんでした。</p>";

  }

}


loadDocument();
