async function loadScoreSubmissionList() {
  const area = document.getElementById("scoreSubmissionList");

  if (!area) return;

  try {
    const snap = await getDocs(
      query(
        collection(db, "scores"),
        orderBy("createdAt", "desc")
      )
    );

    if (snap.empty) {
      area.innerHTML = `
        <p>提出された成績はありません。</p>
      `;
      return;
    }

    const groups = new Map();

    snap.forEach(item => {
      const data = item.data();

      const testName = String(
        data.testName || data.formId || "未設定"
      );

      if (!groups.has(testName)) {
        groups.set(testName, []);
      }

      groups.get(testName).push({
        id: item.id,
        data
      });
    });

    area.innerHTML = [...groups.entries()]
      .map(([testName, submissions]) => `
        <div class="card score-test-group">
          <h3>${esc(testName)}</h3>

          <p>
            提出件数：${submissions.length}件
          </p>

          <button
            type="button"
            onclick="loadScoreAnalysis(${JSON.stringify(testName).replace(/</g, '\\u003c')})"
          >
            成績分析結果を見る
          </button>

          <div class="score-test-list">
            ${submissions.map(({ id, data }) => `
              <div class="card">
                <h4>${esc(data.name || "氏名未設定")}</h4>

                <p>
                  合計：${esc(data.total)} 点
                </p>

                <p>
                  ${
                    data.resubmitAllowed === true
                      ? "再回答を許可しています"
                      : "再回答不可"
                  }
                </p>

                ${
                  data.resubmitAllowed === true
                    ? `
                      <button
                        onclick="denyResubmit('${id}')"
                      >
                        再回答を禁止
                      </button>
                    `
                    : `
                      <button
                        onclick="allowResubmit('${id}')"
                      >
                        再回答を許可
                      </button>
                    `
                }
              </div>
            `).join("")}
          </div>
        </div>
      `)
      .join("");

  } catch (error) {
    console.error(error);

    area.innerHTML = `
      <div class="card error">
        成績提出状況を読み込めませんでした。
      </div>
    `;
  }
}
