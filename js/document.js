import {
  db
} from "./firebase.js";


import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// URLから文書ID取得

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

"文書が見つかりません";


return;


}





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

"文書が存在しません";


return;


}





const data =
snap.data();







area.innerHTML = `


<div class="card">


<h1>

${data.title || ""}

</h1>



<p>

${data.body || ""}

</p>





<a href="${data.url || '#'}">

文書を開く

</a>



</div>


`;



}



loadDocument();
