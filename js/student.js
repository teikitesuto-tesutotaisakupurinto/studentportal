const groupedForms = new Map();

snap.forEach(item => {
  const data = item.data();

  // 既存の公開期間・公開状態などの判定は維持してください。

  const groupName = data.testType || "その他のテスト";

  if (!groupedForms.has(groupName)) {
    groupedForms.set(groupName, []);
  }

  groupedForms.get(groupName).push({
    id: item.id,
    data
  });
});

const cards = [...groupedForms.entries()]
  .map(([groupName, forms]) => `
    <div class="card score-test-group">
      <h2>${esc(groupName)}</h2>

      <div class="score-test-list">
        ${forms.map(({ id, data }) => `
          <div class="card">
            <h3>${esc(data.title || "テスト成績")}</h3>

            <p>
              提出フォーム：
              ${esc(data.title || groupName)}
            </p>

            <a
              class="document-open"
              href="../scoreForm.html?id=${encodeURIComponent(id)}"
            >
              成績を提出・確認
            </a>
          </div>
        `).join("")}
      </div>
    </div>
  `)
  .join("");

area.innerHTML = cards || `
  <div class="card">
    現在提出できるテスト成績はありません。
  </div>
`;
