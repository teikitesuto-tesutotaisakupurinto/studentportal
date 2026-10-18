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
    document.getElementById(page);


  if(target){

    target.style.display =
      "block";
  }


  if(
    page === "scores" &&
    window.loadScoreAnalysis
  ){

    window.loadScoreAnalysis();
  }

};


onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "../index.html";

      return;
    }


    const role =
      await getUserRole(user);


    if(role !== "admin"){

      alert(
        "管理者権限がありません。"
      );

      location.href =
        "../student.html";

      return;
    }


    try{

      await loadStudents();

      await loadBlocks();

      await loadMessages();

      await loadUsers();

      await loadCalendarAdmin();

      await loadDashboard();

      await loadNoticeList();

      await loadDocumentList();

      await loadScoreForms();

    }catch(error){

      console.error(
        "管理画面初期化エラー:",
        error
      );

    }

  }
);


async function loadStudents(){

  const snap =
    await getDocs(
      collection(
        db,
        "users"
      )
    );


  students = [];


  snap.forEach(item => {

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

  });


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


function populateUserSelect(id){

  const select =
    document.getElementById(id);

  if(!select) return;


  select.innerHTML =
    "";


  const sorted =
    [...students].sort(
      (a,b) =>
        String(a.name || "")
        .localeCompare(
          String(b.name || ""),
          "ja"
        )
    );


  sorted.forEach(
    student => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        student.id;


      option.textContent =

        `${student.name || "名前未設定"}` +

        `（${student.grade || "学年未設定"}` +

        `・${student.block || "ブロック未設定"}）`;


      select.appendChild(
        option
      );

    }
  );
}


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
    ]
    .sort();


  [
    "block",
    "documentBlock",
    "formBlock"
  ]
  .forEach(id => {

    const select =
      document.getElementById(id);

    if(!select) return;


    select.innerHTML =
      `<option value="">
        選択してください
      </option>`;


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

  });
}


function setupTargetSelect(
  selectId,
  blockId,
  gradeId,
  userId
){

  const select =
    document.getElementById(
      selectId
    );


  if(!select) return;


  const type =
    select.value;


  [
    blockId,
    gradeId,
    userId
  ]
  .forEach(id => {

    const area =
      document.getElementById(id);

    if(area){

      area.style.display =
        "none";
    }

  });


  if(
    type === "block"
  ){

    document.getElementById(
      blockId
    ).style.display =
      "block";

  }


  if(
    type === "grade"
  ){

    document.getElementById(
      gradeId
    ).style.display =
      "block";

  }


  if(
    type === "block_grade"
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
    type === "individual"
  ){

    document.getElementById(
      userId
    ).style.display =
      "block";

  }

}


window.changeTarget =
function(){

  setupTargetSelect(
    "targetType",
    "blockArea",
    "gradeArea",
    "userArea"
  );

};


window.changeDocumentTarget =
function(){

  setupTargetSelect(
    "documentTargetType",
    "documentBlockArea",
    "documentGradeArea",
    "documentUserArea"
  );

};


window.changeFormTarget =
function(){

  setupTargetSelect(
    "formTargetType",
    "formBlockArea",
    "formGradeArea",
    "formUserArea"
  );

};


function targetData(
  type,
  blockId,
  gradeId,
  userId
){

  const result = {
    targetType:type
  };


  if(
    type === "block" ||
    type === "block_grade"
  ){

    result.block =
      document.getElementById(
        blockId
      )?.value || "";
  }


  if(
    type === "grade" ||
    type === "block_grade"
  ){

    result.grade =
      document.getElementById(
        gradeId
      )?.value || "";
  }


  if(
    type === "individual"
  ){

    result.uid =
      document.getElementById(
        userId
      )?.value || "";
  }


  return result;
}


function getTargetLabel(data){

  const type =
    data.targetType ||
    "all";


  if(type === "all")
    return "全生徒";


  if(type === "block")
    return `ブロック一斉送信（${data.block || ""}）`;


  if(type === "grade")
    return `学年一斉送信（${data.grade || ""}）`;


  if(type === "block_grade")
    return `ブロック＋学年（${data.block || ""}・${data.grade || ""}）`;


  if(type === "individual")
    return "個別送信";


  return "指定なし";
}


window.createNotice =
async function(){

  const title =
    document.getElementById(
      "noticeTitle"
    )?.value.trim();


  const body =
    document.getElementById(
      "noticeBody"
    )?.value.trim();


  if(!title){

    alert(
      "タイトルを入力してください。"
    );

    return;
  }


  const targetType =
    document.getElementById(
      "targetType"
    ).value;


  const target =
    targetData(
      targetType,
      "block",
      "grade",
      "targetUser"
    );


  if(
    targetType === "block" &&
    !target.block
  ){

    alert(
      "ブロックを選択してください。"
    );

    return;
  }


  if(
    targetType === "grade" &&
    !target.grade
  ){

    alert(
      "学年を選択してください。"
    );

    return;
  }


  if(
    targetType === "block_grade" &&
    (!target.block ||
     !target.grade)
  ){

    alert(
      "ブロックと学年を選択してください。"
    );

    return;
  }


  if(
    targetType === "individual" &&
    !target.uid
  ){

    alert(
      "生徒を選択してください。"
    );

    return;
  }


  try{

    await addDoc(
      collection(
        db,
        "notices"
      ),
      {

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

        senderUid:
          auth.currentUser.uid,

        senderName:
          auth.currentUser.displayName ||
          auth.currentUser.email ||
          "管理者",

        createdAt:
          serverTimestamp(),

        ...target

      }
    );


    document.getElementById(
      "noticeTitle"
    ).value = "";


    document.getElementById(
      "noticeBody"
    ).value = "";


    alert(
      "送信しました。"
    );


    await loadNoticeList();


  }catch(error){

    console.error(
      "お知らせ作成エラー:",
      error
    );


    alert(
      "お知らせを送信できませんでした。\n\n" +
      "Firestoreの権限設定も確認してください。"
    );
  }
};


async function loadNoticeList(){

  const area =
    document.getElementById(
      "noticeList"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "notices"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    if(snap.empty){

      area.innerHTML =
        `<div class="card">
          お知らせはありません。
        </div>`;

      return;
    }


    let html = "";


    snap.forEach(
      item => {

        const data =
          item.data();


        html += `

          <div class="notice-card">

            <a
              class="notice-title-link"
              href="admin.html?edit=${encodeURIComponent(item.id)}">

              ${esc(data.title)}

            </a>

            <div class="notice-meta">

              配信者：
              ${esc(
                data.senderName ||
                "管理者"
              )}

              ⇒

              配信範囲：
              ${esc(
                getTargetLabel(data)
              )}

            </div>

          </div>

        `;
      }
    );


    area.innerHTML =
      html;


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        お知らせを読み込めませんでした。
      </div>`;
  }
}


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


  if(!title){

    alert(
      "タイトルを入力してください。"
    );

    return;
  }


  if(!url){

    alert(
      "配布文書URLを入力してください。"
    );

    return;
  }


  const type =
    document.getElementById(
      "documentTargetType"
    ).value;


  const target =
    targetData(
      type,
      "documentBlock",
      "documentGrade",
      "documentUser"
    );


  try{

    await addDoc(
      collection(
        db,
        "documents"
      ),
      {

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

        senderUid:
          auth.currentUser.uid,

        senderName:
          auth.currentUser.displayName ||
          auth.currentUser.email ||
          "管理者",

        createdAt:
          serverTimestamp(),

        ...target

      }
    );


    [
      "documentTitle",
      "documentBody",
      "documentUrl"
    ]
    .forEach(id => {

      document.getElementById(
        id
      ).value = "";

    });


    alert(
      "配布文書を登録しました。"
    );


    await loadDocumentList();


  }catch(error){

    console.error(error);

    alert(
      "配布文書を登録できませんでした。"
    );
  }
};


async function loadDocumentList(){

  const area =
    document.getElementById(
      "documentList"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "documents"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    let html = "";


    snap.forEach(
      item => {

        const data =
          item.data();


        html += `

          <div class="card">

            <div class="document-header">

              <div>

                <h3>
                  ${esc(data.title)}
                </h3>

                <p>
                  ${esc(data.body || "")}
                </p>

              </div>

              <a
                class="button-link"
                href="${esc(data.url || "#")}"
                target="_blank"
                rel="noopener noreferrer">

                配布文書を開く

              </a>

            </div>

            <p class="document-period">

              配信者：
              ${esc(
                data.senderName ||
                "管理者"
              )}

              ⇒

              配信範囲：
              ${esc(
                getTargetLabel(data)
              )}

            </p>

          </div>

        `;
      }
    );


    area.innerHTML =
      html ||

      `<div class="card">
        配布文書はありません。
      </div>`;


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        配布文書を読み込めませんでした。
      </div>`;
  }
}


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
    ).value ||
    startDate;


  if(
    !title ||
    !startDate
  ){

    alert(
      "予定名と開始日を入力してください。"
    );

    return;
  }


  if(
    endDate < startDate
  ){

    alert(
      "終了日は開始日以降にしてください。"
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

        description:
          document.getElementById(
            "calendarDescription"
          ).value.trim(),

        createdBy:
          auth.currentUser.uid,

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
    .forEach(id => {

      document.getElementById(
        id
      ).value = "";

    });


    alert(
      "予定を登録しました。"
    );


    loadCalendarAdmin();


  }catch(error){

    console.error(error);

    alert(
      "予定を登録できませんでした。"
    );
  }
};


async function loadCalendarAdmin(){

  const area =
    document.getElementById(
      "adminCalendar"
    );


  if(!area) return;


  try{

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


    let html = "";


    snap.forEach(
      item => {

        const data =
          item.data();


        html += `

          <div class="card">

            <h3>
              ${esc(data.title)}
            </h3>

            <p>

              ${esc(
                data.startDate ||
                data.date ||
                ""
              )}

              ${
                data.endDate &&
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

            <p>
              ${esc(
                data.description || ""
              )}
            </p>

            <button
              type="button"
              class="danger-button"
              onclick="deleteCalendar('${item.id}')">

              削除

            </button>

          </div>

        `;
      }
    );


    area.innerHTML =
      html ||

      `<div class="card">
        登録済みの予定はありません。
      </div>`;


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        カレンダーを読み込めませんでした。
      </div>`;
  }
}


window.deleteCalendar =
async function(id){

  if(
    !confirm(
      "この予定を削除しますか？"
    )
  )
    return;


  try{

    await deleteDoc(
      doc(
        db,
        "calendar",
        id
      )
    );


    await loadCalendarAdmin();


  }catch(error){

    console.error(error);

    alert(
      "削除できませんでした。"
    );
  }
};


async function loadMessages(){

  const area =
    document.getElementById(
      "messageList"
    );


  if(!area) return;


  try{

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


    let html = "";


    snap.forEach(
      item => {

        const data =
          item.data();


        html += `

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

            <div class="message-body">
              ${esc(
                data.body
              ).replace(
                /\n/g,
                "<br>"
              )}
            </div>

          </div>

        `;

      }
    );


    area.innerHTML =
      html ||

      `<div class="card">
        連絡はありません。
      </div>`;


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        連絡を読み込めませんでした。
      </div>`;
  }
}


async function loadUsers(){

  const area =
    document.getElementById(
      "userList"
    );


  if(!area) return;


  let html = "";


  students.forEach(
    student => {

      html += `

        <div class="card">

          <h3>
            ${esc(
              student.name ||
              "名前未設定"
            )}
          </h3>

          <p>
            ブロック：
            ${esc(
              student.block ||
              ""
            )}
          </p>

          <p>
            学年：
            ${esc(
              student.grade ||
              ""
            )}
          </p>

        </div>

      `;

    }
  );


  area.innerHTML =
    html ||

    `<div class="card">
      生徒が登録されていません。
    </div>`;


  const count =
    document.getElementById(
      "studentCount"
    );


  if(count){

    count.textContent =
      `${students.length}人`;
  }
}


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


async function loadScoreForms(){

  const area =
    document.getElementById(
      "scoreFormList"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "scoreForms"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    let html = "";


    snap.forEach(
      item => {

        const data =
          item.data();


        html += `

          <div class="card">

            <h3>
              ${esc(data.title)}
            </h3>

            <p>
              ${esc(
                data.testType ||
                ""
              )}
            </p>

          </div>

        `;
      }
    );


    area.innerHTML =
      html ||

      `<div class="card">
        成績フォームはありません。
      </div>`;


  }catch(error){

    console.error(error);
  }
}


window.createScoreForm =
async function(){

  const subjects =
    [
      ...document.querySelectorAll(
        "#subjectList input:checked"
      )
    ]
    .map(
      input =>
        input.value
    );


  if(!subjects.length){

    alert(
      "科目を1つ以上選択してください。"
    );

    return;
  }


  const type =
    document.getElementById(
      "formTargetType"
    ).value;


  const target =
    targetData(
      type,
      "formBlock",
      "formGrade",
      "formUser"
    );


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

        ...target

      }
    );


    document.getElementById(
      "formTitle"
    ).value = "";


    alert(
      "成績フォームを作成しました。"
    );


  }catch(error){

    console.error(error);

    alert(
      "成績フォームを作成できませんでした。"
    );
  }
};
