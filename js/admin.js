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
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


import {
  getUserRole
} from "./auth.js";


import "./scoreAnalysis.js";


let students = [];


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


/* =========================
   ページ切り替え
========================= */

window.showAdminPage =
function(page){

  document
    .querySelectorAll(
      ".content > section"
    )
    .forEach(
      section =>
        section.style.display =
          "none"
    );


  const target =
    document.getElementById(
      page
    );


  if(target){

    target.style.display =
      "block";

  }


  if(
    page === "scores"
  ){

    if(
      window.loadScoreAnalysis
    ){

      window.loadScoreAnalysis();

    }


    loadScoreSubmissionList();

  }

};


/* =========================
   認証
========================= */

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "index.html";

      return;

    }


    try{

      const role =
        await getUserRole(user);


      if(role !== "admin"){

        alert(
          "アクセス権限がありません"
        );

        location.href =
          "student.html";

        return;

      }


      await loadStudents();

      await loadBlocks();

      await loadMessages();

      await loadUsers();

      await loadCalendarAdmin();

      await loadDashboard();

      await loadScoreSubmissionList();


    }catch(error){

      console.error(
        "管理画面初期化:",
        error
      );


      alert(
        "管理画面の読み込みに失敗しました。\n" +
        error.message
      );

    }

  }
);


/* =========================
   生徒
========================= */

async function loadStudents(){

  const snap =
    await getDocs(
      collection(
        db,
        "users"
      )
    );


  students = [];


  snap.forEach(
    item => {

      const data =
        item.data();


      if(
        data.role ===
        "student"
      ){

        students.push({

          id:item.id,

          ...data

        });

      }

    }
  );


  populateUserSelect(
    "targetUser"
  );


  populateUserSelect(
    "documentUser"
  );


  populateUserSelect(
    "formUser"
  );

}


function populateUserSelect(
  id
){

  const select =
    document.getElementById(
      id
    );


  if(!select) return;


  select.innerHTML = "";


  [...students]

    .sort(
      (a,b) =>
        String(a.name)
        .localeCompare(
          String(b.name),
          "ja"
        )
    )

    .forEach(
      student => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          student.id;


        option.textContent =

          `${student.name || ""}`

          +

          `（${student.grade || ""}`

          +

          `・${student.block || ""}）`;


        select.appendChild(
          option
        );

      }
    );

}


/* =========================
   ブロック
========================= */

async function loadBlocks(){

  const blocks =

    [

      ...new Set(

        students

          .map(
            student =>
              student.block
          )

          .filter(Boolean)

      )

    ];


  [
    "block",
    "documentBlock",
    "formBlock"
  ]

  .forEach(
    id => {

      const select =
        document.getElementById(
          id
        );


      if(!select) return;


      select.innerHTML = "";


      blocks.forEach(
        block => {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            block;


          option.textContent =
            block;


          select.appendChild(
            option
          );

        }
      );

    }
  );

}


/* =========================
   配信範囲
========================= */

window.changeTarget =
function(){

  toggleTarget(
    "targetType",
    "blockArea",
    "gradeArea",
    "userArea",
    "block_grade",
    "individual"
  );

};


window.changeDocumentTarget =
function(){

  toggleTarget(
    "documentTargetType",
    "documentBlockArea",
    "documentGradeArea",
    "documentUserArea",
    "block_grade",
    "individual"
  );

};


window.changeFormTarget =
function(){

  toggleTarget(
    "formTargetType",
    "formBlockArea",
    "formGradeArea",
    "formUserArea",
    "block_grade",
    "individual"
  );

};


function toggleTarget(
  selectId,
  blockId,
  gradeId,
  userId,
  blockGradeValue,
  individualValue
){

  const type =
    document.getElementById(
      selectId
    ).value;


  [
    blockId,
    gradeId,
    userId
  ]

  .forEach(
    id => {

      const element =
        document.getElementById(
          id
        );


      if(element){

        element.style.display =
          "none";

      }

    }
  );


  if(type === "block"){

    document.getElementById(
      blockId
    ).style.display =
      "block";

  }


  if(
    type ===
    blockGradeValue
  ){

    document.getElementById(
      blockId
    ).style.display =
      "block";


    document.getElementById(
      gradeId
    ).style.display =
      "block";

  }


  if(
    type ===
    individualValue
  ){

    document.getElementById(
      userId
    ).style.display =
      "block";

  }

}


/* =========================
   配信データ
========================= */

function targetData(
  type,
  blockId,
  gradeId,
  userId
){

  const data = {

    targetType:type

  };


  if(
    type === "block"
    ||
    type === "block_grade"
  ){

    data.block =
      document.getElementById(
        blockId
      ).value;

  }


  if(
    type === "block_grade"
  ){

    data.grade =
      document.getElementById(
        gradeId
      ).value;

  }


  if(
    type === "individual"
  ){

    data.uid =
      document.getElementById(
        userId
      ).value;

  }


  return data;

}


/* =========================
   お知らせ作成
========================= */

window.createNotice =
async function(){

  const title =
    document.getElementById(
      "noticeTitle"
    ).value.trim();


  const body =
    document.getElementById(
      "noticeBody"
    ).value.trim();


  if(!title || !body){

    alert(
      "タイトルと本文を入力してください"
    );

    return;

  }


  try{

    const data = {

      title,

      body,

      importance:
        document.getElementById(
          "importance"
        ).value,

      startDate:
        document.getElementById(
          "startDate"
        ).value,

      endDate:
        document.getElementById(
          "endDate"
        ).value,

      createdAt:
        serverTimestamp(),

      ...targetData(

        document.getElementById(
          "targetType"
        ).value,

        "block",

        "grade",

        "targetUser"

      )

    };


    await addDoc(
      collection(
        db,
        "notices"
      ),
      data
    );


    document.getElementById(
      "noticeTitle"
    ).value = "";


    document.getElementById(
      "noticeBody"
    ).value = "";


    alert(
      "お知らせを公開しました"
    );


  }catch(error){

    console.error(error);

    alert(
      "お知らせを公開できませんでした。\n" +
      error.message
    );

  }

};


/* =========================
   配布文書
========================= */

window.addDocument =
async function(){

  const title =
    document.getElementById(
      "documentTitle"
    ).value.trim();


  const body =
    document.getElementById(
      "documentBody"
    ).value.trim();


  const url =
    document.getElementById(
      "documentUrl"
    ).value.trim();


  if(!title || !url){

    alert(
      "タイトルとURLを入力してください"
    );

    return;

  }


  try{

    const data = {

      title,

      body,

      url,

      startDate:
        document.getElementById(
          "documentStartDate"
        ).value,

      endDate:
        document.getElementById(
          "documentEndDate"
        ).value,

      createdAt:
        serverTimestamp(),

      ...targetData(

        document.getElementById(
          "documentTargetType"
        ).value,

        "documentBlock",

        "documentGrade",

        "documentUser"

      )

    };


    await addDoc(
      collection(
        db,
        "documents"
      ),
      data
    );


    document.getElementById(
      "documentTitle"
    ).value = "";


    document.getElementById(
      "documentBody"
    ).value = "";


    document.getElementById(
      "documentUrl"
    ).value = "";


    alert(
      "配布文書を登録しました"
    );


  }catch(error){

    console.error(error);

    alert(
      "配布文書を登録できませんでした。\n" +
      error.message
    );

  }

};


/* =========================
   カレンダー
========================= */

window.addCalendar =
async function(){

  const title =
    document.getElementById(
      "calendarTitle"
    ).value.trim();


  const startDate =
    document.getElementById(
      "calendarStartDate"
    ).value;


  const endDate =
    document.getElementById(
      "calendarEndDate"
    ).value
    ||
    startDate;


  const description =
    document.getElementById(
      "calendarDescription"
    ).value.trim();


  if(
    !title
    ||
    !startDate
  ){

    alert(
      "予定名と開始日を入力してください"
    );

    return;

  }


  if(
    endDate <
    startDate
  ){

    alert(
      "終了日は開始日以降にしてください"
    );

    return;

  }


  try{

    await addDoc(
      collection(
        db,
        "calendar"
      ),
      {

        title,

        startDate,

        endDate,

        date:startDate,

        description,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    [
      "calendarTitle",
      "calendarStartDate",
      "calendarEndDate",
      "calendarDescription"
    ]

    .forEach(
      id => {

        document.getElementById(
          id
        ).value = "";

      }
    );


    alert(
      "予定を登録しました"
    );


    await loadCalendarAdmin();


  }catch(error){

    console.error(error);

    alert(
      "予定を登録できませんでした。\n" +
      error.message
    );

  }

};


async function loadCalendarAdmin(){

  const area =
    document.getElementById(
      "adminCalendar"
    );


  if(!area) return;


  const snap =
    await getDocs(
      query(
        collection(
          db,
          "calendar"
        ),
        orderBy(
          "startDate",
          "asc"
        )
      )
    );


  area.innerHTML = "";


  snap.forEach(
    item => {

      const data =
        item.data();


      area.innerHTML += `

        <div class="card">

          <p>

            ${esc(
              data.startDate ||
              data.date ||
              ""
            )}

            ${
              data.endDate
              &&
              data.endDate !==
              (
                data.startDate ||
                data.date
              )

              ?

              "〜 " +
              esc(data.endDate)

              :

              ""

            }

          </p>


          <h3>
            ${esc(data.title)}
          </h3>


          <p>
            ${esc(
              data.description
            )}
          </p>


          <button
            onclick="deleteCalendar('${item.id}')"
          >
            削除
          </button>

        </div>

      `;

    }
  );

}


window.deleteCalendar =
async function(id){

  try{

    await deleteDoc(
      doc(
        db,
        "calendar",
        id
      )
    );


    alert(
      "削除しました"
    );


    await loadCalendarAdmin();


  }catch(error){

    console.error(error);

    alert(
      "削除できませんでした。\n" +
      error.message
    );

  }

};


/* =========================
   連絡管理
========================= */

async function loadMessages(){

  const area =
    document.getElementById(
      "messageList"
    );


  if(!area) return;


  const snap =
    await getDocs(
      query(
        collection(
          db,
          "messages"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      )
    );


  area.innerHTML = "";


  snap.forEach(
    item => {

      const data =
        item.data();


      area.innerHTML += `

        <div class="card">

          <p>
            送信者：
            ${esc(
              data.senderName
            )}
          </p>


          <p>
            メール：
            ${esc(
              data.senderEmail
            )}
          </p>


          <p>
            ${esc(
              data.body
            )}
          </p>


          <p>
            状態：
            ${esc(
              data.status ||
              "unread"
            )}
          </p>


          ${
            data.status !==
            "opened"

              ?

              `<button
                onclick="openMessage('${item.id}')"
              >
                開封する
               </button>`

              :

              "確認済み"

          }

        </div>

      `;

    }
  );

}


window.openMessage =
async function(id){

  await updateDoc(
    doc(
      db,
      "messages",
      id
    ),
    {

      status:
        "opened",

      openedAt:
        serverTimestamp()

    }
  );


  await loadMessages();

};


/* =========================
   ユーザー
========================= */

async function loadUsers(){

  const area =
    document.getElementById(
      "userList"
    );


  if(!area) return;


  area.innerHTML = "";


  students.forEach(
    student => {

      area.innerHTML += `

        <div class="card">

          <p>
            名前：
            ${esc(student.name)}
          </p>

          <p>
            ブロック：
            ${esc(student.block)}
          </p>

          <p>
            学年：
            ${esc(student.grade)}
          </p>

        </div>

      `;

    }
  );


  const count =
    document.getElementById(
      "studentCount"
    );


  if(count){

    count.textContent =
      `${students.length}人`;

  }

}


/* =========================
   ダッシュボード
========================= */

async function loadDashboard(){

  const snap =
    await getDocs(
      collection(
        db,
        "scores"
      )
    );


  const count =
    document.getElementById(
      "scoreCount"
    );


  if(count){

    count.textContent =
      `${snap.size}件`;

  }

}


/* =========================
   成績フォーム
========================= */

window.createScoreForm =
async function(){

  const subjects =
    [
      ...document
        .querySelectorAll(
          "#subjectList input:checked"
        )
    ]
    .map(
      input =>
        input.value
    );


  if(!subjects.length){

    alert(
      "科目を1つ以上選択してください"
    );

    return;

  }


  const type =
    document.getElementById(
      "formTargetType"
    ).value;


  try{

    await addDoc(
      collection(
        db,
        "scoreForms"
      ),
      {

        title:
          document.getElementById(
            "formTitle"
          ).value.trim(),

        testType:
          document.getElementById(
            "testType"
          ).value,

        subjects,

        startDate:
          document.getElementById(
            "formStartDate"
          ).value,

        endDate:
          document.getElementById(
            "formEndDate"
          ).value,

        published:true,

        createdBy:
          auth.currentUser.uid,

        createdAt:
          serverTimestamp(),

        ...targetData(

          type,

          "formBlock",

          "formGrade",

          "formUser"

        )

      }
    );


    document.getElementById(
      "formTitle"
    ).value = "";


    alert(
      "成績フォームを作成しました"
    );


  }catch(error){

    console.error(error);

    alert(
      "成績フォームを作成できませんでした。\n" +
      error.message
    );

  }

};


/* =========================
   再回答許可
========================= */

window.allowResubmit =
async function(scoreId){

  try{

    await updateDoc(
      doc(
        db,
        "scores",
        scoreId
      ),
      {

        resubmitAllowed:true,

        resubmitAllowedAt:
          serverTimestamp(),

        resubmitAllowedBy:
          auth.currentUser.uid

      }
    );


    alert(
      "再回答を許可しました"
    );


    await loadScoreSubmissionList();


  }catch(error){

    console.error(error);

    alert(
      "再回答を許可できませんでした。\n" +
      error.message
    );

  }

};


window.denyResubmit =
async function(scoreId){

  try{

    await updateDoc(
      doc(
        db,
        "scores",
        scoreId
      ),
      {

        resubmitAllowed:false

      }
    );


    alert(
      "再回答を禁止しました"
    );


    await loadScoreSubmissionList();


  }catch(error){

    console.error(error);

    alert(
      "変更できませんでした。\n" +
      error.message
    );

  }

};


/* =========================
   提出一覧
========================= */

async function loadScoreSubmissionList(){

  const area =
    document.getElementById(
      "scoreSubmissionList"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "scores"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    area.innerHTML = "";


    snap.forEach(
      item => {

        const data =
          item.data();


        const allowed =
          data.resubmitAllowed === true;


        area.innerHTML += `

          <div class="card">

            <h3>
              ${esc(
                data.name ||
                ""
              )}
            </h3>


            <p>
              ${esc(
                data.testName ||
                ""
              )}
            </p>


            <p>
              合計：
              <strong>
                ${esc(
                  data.total
                )}点
              </strong>
            </p>


            <p>

              状態：

              ${
                allowed

                  ?

                  "再回答許可中"

                  :

                  "提出済み・再回答不可"

              }

            </p>


            <button
              onclick="${
                allowed
                ? `denyResubmit('${item.id}')`
                : `allowResubmit('${item.id}')`
              }"
            >

              ${
                allowed
                ? "再回答を禁止"
                : "再回答を許可"
              }

            </button>

          </div>

        `;

      }
    );


    if(!area.innerHTML){

      area.innerHTML = `

        <div class="card">

          現在、提出された成績はありません。

        </div>

      `;

    }


  }catch(error){

    console.error(
      "提出一覧:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        成績提出一覧を読み込めませんでした。

      </div>

    `;

  }

}
