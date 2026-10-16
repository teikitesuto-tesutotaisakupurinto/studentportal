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
    String(
      value ?? ""
    ).replace(
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
      "documentDetail"
    );


  if(!id){

    area.innerHTML = `

      <div class="card">

        文書が見つかりません。

      </div>

    `;

    return;

  }


  try{

    const snap =
      await getDoc(
        doc(
          db,
          "documents",
          id
        )
      );


    if(!snap.exists()){

      area.innerHTML = `

        <div class="card">

          文書が存在しません。

        </div>

      `;

      return;

    }


    const data =
      snap.data();


    area.innerHTML = `

      <div class="card">

        <h1>
          ${esc(data.title)}
        </h1>


        <div class="document-body">

          ${esc(
            data.body
          ).replace(
            /\n/g,
            "<br>"
          )}

        </div>


        <p class="document-period">

          公開期間：

          ${esc(
            data.startDate || ""
          )}

          ${
            data.endDate

              ?

              "〜 " +
              esc(data.endDate)

              :

              ""

          }

        </p>


        <!--
          文書本体は別タブで開く
          文書詳細ページ自体は別タブにしない
        -->

        <a
          class="button-link"
          href="${esc(data.url || "#")}"
          target="_blank"
          rel="noopener noreferrer"
        >

          配布文書を開く

        </a>

      </div>

    `;


  }catch(error){

    console.error(error);


    area.innerHTML = `

      <div class="card error">

        文書を読み込めませんでした。

      </div>

    `;

  }

}


load();
