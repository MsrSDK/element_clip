// ============================================
// テンプレートUIロジック (UI Templates)
// ============================================

/**
 * テンプレートダイアログを開く
 */
function openTemplateDialog() {
    renderTemplateList();
    document.getElementById('template-dialog').classList.add('active');
}

/**
 * テンプレートダイアログを閉じる
 */
function closeTemplateDialog() {
    document.getElementById('template-dialog').classList.remove('active');
}

/**
 * 現在の変数構成をテンプレートとして保存
 */
function saveCurrentAsTemplate() {
    const nameInput = document.getElementById('template-name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('テンプレート名を入力してください');
        return;
    }

    if (variables.length === 0) {
        if (!confirm('変数が1つもありませんが、空のテンプレートとして保存しますか？')) {
            return;
        }
    }

    // 変数リストのディープコピーを作成（値はクリアするべきか？ -> 構成保存なら値は不要だが、
    // 初期値として持たせたい場合もあるかも？
    // 要求は「変数一覧の項目保存」なので、定義（name, selector, type等）が重要。
    // 値(value)はクリアして保存するのが一般的だが、ユーザーがデフォルト値を意図している可能性もある。
    // ここでは、利便性のため「値も含めて保存」し、読み込み時に「値も読み込むか」聞くか、
    // あるいは単純に保存時の状態を復元するのが直感的。
    // -> シンプルに丸ごと保存する。

    // ただし、IDは新しく採番しないと、読み込み時に重複や混乱を招く可能性があるが、
    // 読み込み＝置換なら問題ない。

    const templateVariables = JSON.parse(JSON.stringify(variables));

    const newTemplate = {
        id: generateUUID(),
        name: name,
        createdAt: getCurrentTimestamp(),
        variables: templateVariables
    };

    variableTemplates.push(newTemplate);
    saveData();

    nameInput.value = ''; // 入力欄クリア
    renderTemplateList();
    alert('テンプレートを保存しました');
}

/**
 * テンプレートを読み込み
 */
function loadTemplate(templateId) {
    const template = variableTemplates.find(t => t.id === templateId);
    if (!template) return;

    if (variables.length > 0) {
        if (!confirm('現在の変数一覧は上書きされます。よろしいですか？')) {
            return;
        }
    }

    // ディープコピーして読み込み
    variables = JSON.parse(JSON.stringify(template.variables));

    // IDは…そのままで良いか？
    // そのままで問題ない。

    saveData();
    renderVariables();

    closeTemplateDialog();
    // alert(`テンプレート「${template.name}」を読み込みました`);
}

/**
 * テンプレートを削除
 */
function deleteTemplate(templateId) {
    const template = variableTemplates.find(t => t.id === templateId);
    if (!template) return;

    if (!confirm(`テンプレート「${template.name}」を削除してもよろしいですか？`)) {
        return;
    }

    variableTemplates = variableTemplates.filter(t => t.id !== templateId);
    saveData();
    renderTemplateList();
}

/**
 * テンプレートリストを描画
 */
function renderTemplateList() {
    const listContainer = document.getElementById('templates-list');
    listContainer.innerHTML = '';

    if (variableTemplates.length === 0) {
        listContainer.innerHTML = '<div style="color: #888; text-align: center; padding: 10px;">保存されたテンプレートはありません</div>';
        return;
    }

    variableTemplates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'template-item';
        // スタイルはsidepanel.cssに追加が必要
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;';

        const info = document.createElement('div');
        info.innerHTML = `
            <div style="font-weight: bold;">${escapeHtml(template.name)}</div>
            <div style="font-size: 11px; color: #666;">
                ${formatTimestamp(template.createdAt)} - 変数 ${template.variables.length}個
            </div>
        `;

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '4px';

        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-small btn-info';
        loadBtn.textContent = '読込';
        loadBtn.onclick = () => loadTemplate(template.id);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-small btn-danger';
        delBtn.innerHTML = '🗑️'; // アイコンのみでコンパクトに
        delBtn.onclick = () => deleteTemplate(template.id);

        actions.appendChild(loadBtn);
        actions.appendChild(delBtn);

        item.appendChild(info);
        item.appendChild(actions);

        listContainer.appendChild(item);
    });
}
