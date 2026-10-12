import {
  db
} from "./firebase.js";


import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





// URLからID取得

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

"お知らせが見つかりません";


return;


}





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

"お知らせが存在しません";


return;


}





const data =
snap.data();







// 公開期間確認

const today =
new Date();




if(data.startDate){


if(
today < new Date(data.startDate)
){

area.innerHTML =
"公開前のお知らせです";


return;

}

}





if(data.endDate){


if(
today > new Date(data.endDate)
){

area.innerHTML =
"公開終了したお知らせです";


return;

}

}







let tag = "";



if(
data.importance === "important"
){


tag = `

<span class="important">

重要

</span>

`;

}






area.innerHTML = `


<div class="card">


${tag}



<h1>

${data.title}

</h1>




<p>

${data.body}

</p>




<p>

公開期間：

${data.startDate || ""}

～

${data.endDate || ""}

</p>



</div>


`;



}



loadNotice();
