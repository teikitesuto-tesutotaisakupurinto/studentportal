import {
  auth,
  db,
  requireAdmin
} from "./auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


const form =
  document.getElementById(
    "noticeForm"
  );

const successMessage =
  document.getElementById(
    "successMessage"
  );


requireAdmin(
  async user => {

    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const title =
          document
            .getElementById(
              "title"
            )
            .value
            .trim();


        const body =
          document
            .getElementById(
              "body"
            )
            .value;


        const scope =
          document
            .getElementById(
              "scope"
            )
            .value;


        if(!title){

          alert(
            "タイトルを入力してください。"
          );

          return;
        }


        const submitButton =
          form.querySelector(
            'button[type="submit"]'
          );


        submitButton.disabled =
          true;


        try{

          await addDoc(
            collection(
              db,
              "announcements"
            ),
            {

              title,

              body,

              scope,

              sender:
                user.displayName ||
                user.email ||
                "管理者",

              senderName:
                user.displayName ||
                user.email ||
                "管理者",

              createdBy:
                user.uid,

              createdAt:
                serverTimestamp(),

              publishedAt:
                serverTimestamp()

            }
          );


          /*
           * 送信成功
           */

          successMessage.style.display =
            "block";


          form.reset();


          window.scrollTo({
            top:0,
            behavior:"smooth"
          });


        }catch(error){

          console.error(
            "お知らせ送信エラー:",
            error
          );


          if(
            error.code ===
            "permission-denied"
          ){

            alert(
              "変更できませんでした。\nMissing or insufficient permissions."
            );

          }else{

            alert(
              "お知らせの送信に失敗しました。"
            );

          }

        }finally{

          submitButton.disabled =
            false;

        }

      }
    );

  }
);
