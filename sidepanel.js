// ============================================
// サイドパネルのロジック
// ============================================

// DOM要素
let variablesList, setsList, emptyState, setsEmptyState;
let variableDialog, setDialog;
let currentEditingVariableId = null;

// データ
let variables = [];
let savedSets = [];
let currentSetId = null;
let settings = {
    autoHighlight: true,
    showNotifications: true
};

// 選択ターゲットの状態管理 ('extract' or 'paste')
let selectingTarget = 'extract';

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    loadData();
    setupEventListeners();
    setupMessageListener();
});

/**
 * DOM要素を初期化
 */
function initializeElements() {
    variablesList = document.getElementById('variables-list');
    setsList = document.getElementById('sets-list');
    emptyState = document.getElementById('empty-state');
    setsEmptyState = document.getElementById('sets-empty-state');
    variableDialog = document.getElementById('variable-dialog');
    setDialog = document.getElementById('set-dialog');
}

/**
 * データを読み込み
 */
function loadData() {
    chrome.storage.local.get(['variables', 'savedSets', 'currentSetId', 'settings'], (result) => {
        variables = result.variables || [];
        savedSets = result.savedSets || [];
        currentSetId = result.currentSetId || null;
        settings = result.settings || settings;

        // マイグレーション: specificityLevelがない変数にデフォルト値を設定
        let needsSave = false;
        variables.forEach(v => {
            if (v.specificityLevel === undefined) {
                v.specificityLevel = 1;
                needsSave = true;
            }
        });

        if (needsSave) {
            saveData();
        }

        // UIに反映
        renderVariables();
        renderSets();
        updateSettings();
    });
}

/**
 * データを保存
 */
function saveData() {
    chrome.storage.local.set({
        variables: variables,
        savedSets: savedSets,
        currentSetId: currentSetId,
        settings: settings
    });
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
    // 変数追加ボタン
    document.getElementById('btn-add-variable').addEventListener('click', () => {
        openVariableDialog();
    });

    // 一括抽出ボタン
    document.getElementById('btn-extract-all').addEventListener('click', () => {
        extractAllVariables();
    });

    // 一括貼り付けボタン
    document.getElementById('btn-paste-all').addEventListener('click', () => {
        pasteAllVariables();
    });

    // 変数セット保存ボタン
    document.getElementById('btn-save-set').addEventListener('click', () => {
        openSetDialog();
    });

    // 変数ダイアログ
    document.getElementById('btn-select-element').addEventListener('click', () => {
        selectingTarget = 'extract';
        startSelectElement();
    });

    // 貼り付け先要素選択ボタン
    document.getElementById('btn-select-paste-element').addEventListener('click', () => {
        selectingTarget = 'paste';
        startSelectElement();
    });

    document.getElementById('variable-extract-type').addEventListener('change', (e) => {
        const attributeGroup = document.getElementById('attribute-group');
        attributeGroup.style.display = e.target.value === 'attribute' ? 'block' : 'none';
    });

    document.getElementById('btn-dialog-cancel').addEventListener('click', () => {
        closeVariableDialog();
    });

    document.getElementById('btn-dialog-save').addEventListener('click', () => {
        saveVariable();
    });

    // セットダイアログ
    document.getElementById('btn-set-cancel').addEventListener('click', () => {
        closeSetDialog();
    });

    document.getElementById('btn-set-save').addEventListener('click', () => {
        saveSet();
    });

    // 設定
    document.getElementById('setting-auto-highlight').addEventListener('change', (e) => {
        settings.autoHighlight = e.target.checked;
        saveData();
    });

    document.getElementById('setting-show-notifications').addEventListener('change', (e) => {
        settings.showNotifications = e.target.checked;
        saveData();
    });
}

/**
 * メッセージリスナーを設定
 */
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'selectorSelected':
                handleSelectorSelected(request.selector, request.variableId);
                break;

            case 'selectCancelled':
                handleSelectCancelled();
                break;

            case 'pasteComplete':
                handlePasteComplete(request.variableId, request.success);
                break;
        }
        sendResponse({ success: true });
        return true;
    });
}

/**
 * 変数を画面に表示
 */
function renderVariables() {
    variablesList.innerHTML = '';

    if (variables.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    variables.forEach((variable, index) => {
        const item = createVariableItem(variable, index);
        variablesList.appendChild(item);
    });
}

/**
 * 変数アイテムを作成
 */
function createVariableItem(variable, index) {
    const div = document.createElement('div');
    div.className = 'variable-item';
    div.draggable = true;
    div.dataset.index = index; // 配列インデックスを保持
    div.dataset.id = variable.id;

    // ドラッグ&ドロップイベントの設定
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragend', handleDragEnd);
    div.innerHTML = `
    <div class="variable-header">
      <div class="variable-name">${escapeHtml(variable.name)}</div>
      <div class="variable-actions">
        <button class="btn btn-small btn-success" data-action="extract" data-id="${variable.id}">抽出</button>
        <button class="btn btn-small btn-info" data-action="paste" data-id="${variable.id}">貼付</button>
        <button class="btn btn-small btn-secondary" data-action="edit" data-id="${variable.id}">編集</button>
        <button class="btn btn-small btn-danger" data-action="delete" data-id="${variable.id}">削除</button>
      </div>
    </div>
    <div class="variable-value-container">
      <div class="value-label">値:</div>
      <textarea class="variable-value-edit" data-id="${variable.id}" placeholder="値が設定されていません">${variable.value ? escapeHtml(variable.value) : ''}</textarea>
      <div class="value-hint">値を直接編集できます（自動保存）</div>
    </div>
  `;

    // イベントリスナーを追加
    div.querySelector('[data-action="extract"]').addEventListener('click', () => extractVariable(variable.id));
    div.querySelector('[data-action="paste"]').addEventListener('click', () => startPasteVariable(variable.id));
    div.querySelector('[data-action="edit"]').addEventListener('click', () => editVariable(variable.id));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteVariable(variable.id));

    // 値の編集イベント
    const valueTextarea = div.querySelector('.variable-value-edit');
    valueTextarea.addEventListener('blur', (e) => {
        updateVariableValue(variable.id, e.target.value);
    });

    // Ctrl+Enterで保存してフォーカス解除
    valueTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.target.blur();
        }
    });

    return div;
}

/**
 * セットを画面に表示
 */
function renderSets() {
    setsList.innerHTML = '';

    if (savedSets.length === 0) {
        setsEmptyState.classList.remove('hidden');
        return;
    }

    setsEmptyState.classList.add('hidden');

    savedSets.forEach((set, index) => {
        const item = createSetItem(set, index);
        setsList.appendChild(item);
    });
}

/**
 * セットアイテムを作成
 */
function createSetItem(set, index) {
    const div = document.createElement('div');
    div.className = 'set-item';
    div.draggable = true;
    div.dataset.index = index;
    div.dataset.id = set.id;

    // ドラッグ&ドロップイベントの設定
    div.addEventListener('dragstart', handleSetDragStart);
    div.addEventListener('dragover', handleSetDragOver);
    div.addEventListener('dragleave', handleSetDragLeave);
    div.addEventListener('drop', handleSetDrop);
    div.addEventListener('dragend', handleSetDragEnd);
    div.innerHTML = `
    <div class="set-header">
      <div class="set-name">${escapeHtml(set.name)}</div>
      <div class="set-actions">
        <button class="btn btn-small btn-info" data-action="load" data-id="${set.id}">読込</button>
        <button class="btn btn-small btn-danger" data-action="delete" data-id="${set.id}">削除</button>
      </div>
    </div>
    <div class="set-info">
      ${formatTimestamp(set.createdAt)} - ${set.values.length}件の変数
    </div>
  `;

    // イベントリスナーを追加
    div.querySelector('[data-action="load"]').addEventListener('click', () => loadSet(set.id));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSet(set.id));

    return div;
}

/**
 * 変数ダイアログを開く
 */
function openVariableDialog(variableId = null) {
    currentEditingVariableId = variableId;

    if (variableId) {
        // 編集モード
        const variable = variables.find(v => v.id === variableId);
        if (variable) {
            document.getElementById('variable-name').value = variable.name;
            document.getElementById('variable-selector').value = variable.extractSelector;
            document.getElementById('variable-paste-selector').value = variable.pasteSelector || '';
            document.getElementById('variable-specificity').value = variable.specificityLevel || 1;
            document.getElementById('variable-extract-type').value = variable.extractType;
            document.getElementById('variable-attribute-name').value = variable.attributeName || '';

            const attributeGroup = document.getElementById('attribute-group');
            attributeGroup.style.display = variable.extractType === 'attribute' ? 'block' : 'none';
        }
    } else {
        // 新規作成モード
        document.getElementById('variable-name').value = '';
        document.getElementById('variable-selector').value = '';
        document.getElementById('variable-paste-selector').value = '';
        document.getElementById('variable-specificity').value = '1';
        document.getElementById('variable-extract-type').value = 'text';
        document.getElementById('variable-attribute-name').value = '';
        document.getElementById('attribute-group').style.display = 'none';
    }

    variableDialog.classList.add('active');
}

/**
 * 変数ダイアログを閉じる
 */
function closeVariableDialog() {
    variableDialog.classList.remove('active');
    currentEditingVariableId = null;
}

/**
 * 要素選択を開始
 */
function startSelectElement() {
    const specificityLevel = parseInt(document.getElementById('variable-specificity').value) || 1;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'startSelectExtract',
                variableId: currentEditingVariableId || 'temp',
                specificityLevel: specificityLevel
            });
        }
    });
}

/**
 * セレクタが選択された時の処理
 */
function handleSelectorSelected(selector, variableId) {
    if (selectingTarget === 'extract') {
        document.getElementById('variable-selector').value = selector;
    } else {
        document.getElementById('variable-paste-selector').value = selector;
    }
}

/**
 * 選択がキャンセルされた時の処理
 */
function handleSelectCancelled() {
    // 特に何もしない
}

/**
 * 変数を保存
 */
function saveVariable() {
    const name = document.getElementById('variable-name').value.trim();
    const selector = document.getElementById('variable-selector').value.trim();
    const pasteSelector = document.getElementById('variable-paste-selector').value.trim();
    const specificityLevel = parseInt(document.getElementById('variable-specificity').value) || 1;
    const extractType = document.getElementById('variable-extract-type').value;
    const attributeName = document.getElementById('variable-attribute-name').value.trim();

    if (!name || !selector) {
        alert('変数名と抽出元CSSセレクタは必須です');
        return;
    }

    if (currentEditingVariableId) {
        // 編集
        const variable = variables.find(v => v.id === currentEditingVariableId);
        if (variable) {
            variable.name = name;
            variable.extractSelector = selector;
            variable.pasteSelector = pasteSelector;
            variable.specificityLevel = specificityLevel;
            variable.extractType = extractType;
            variable.attributeName = extractType === 'attribute' ? attributeName : null;
        }
    } else {
        // 新規作成
        const newVariable = {
            id: generateUUID(),
            name: name,
            extractSelector: selector,
            pasteSelector: pasteSelector,
            specificityLevel: specificityLevel,
            extractType: extractType,
            attributeName: extractType === 'attribute' ? attributeName : null,
            value: '',
            lastExtracted: null,
            sourceUrl: ''
        };
        variables.push(newVariable);
    }

    saveData();
    renderVariables();
    closeVariableDialog();
}

/**
 * 変数を編集
 */
function editVariable(variableId) {
    openVariableDialog(variableId);
}

/**
 * 変数を削除
 */
function deleteVariable(variableId) {
    if (confirm('この変数を削除してもよろしいですか？')) {
        variables = variables.filter(v => v.id !== variableId);
        saveData();
        renderVariables();
    }
}

/**
 * 変数の値を更新
 */
function updateVariableValue(variableId, newValue) {
    const variable = variables.find(v => v.id === variableId);
    if (variable) {
        variable.value = newValue;
        variable.lastExtracted = getCurrentTimestamp();
        saveData();
        console.log(`[Element Clip] Variable "${variable.name}" value updated manually`);
    }
}

/**
 * 変数の値を抽出
 */
function extractVariable(variableId) {
    const variable = variables.find(v => v.id === variableId);
    if (!variable) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'extractValue',
                selector: variable.extractSelector,
                extractType: variable.extractType,
                attributeName: variable.attributeName
            }, (response) => {
                if (response && response.success) {
                    variable.value = response.value;
                    variable.lastExtracted = getCurrentTimestamp();
                    variable.sourceUrl = response.sourceUrl;
                    saveData();
                    renderVariables();
                }
            });
        }
    });
}

/**
 * すべての変数を抽出
 */
function extractAllVariables() {
    if (variables.length === 0) {
        alert('抽出する変数がありません');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            let completed = 0;

            variables.forEach((variable, index) => {
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'extractValue',
                        selector: variable.extractSelector,
                        extractType: variable.extractType,
                        attributeName: variable.attributeName
                    }, (response) => {
                        if (response && response.success) {
                            variable.value = response.value;
                            variable.lastExtracted = getCurrentTimestamp();
                            variable.sourceUrl = response.sourceUrl;
                        }

                        completed++;
                        if (completed === variables.length) {
                            saveData();
                            renderVariables();
                        }
                    });
                }, index * 100); // 少し遅延させて順次実行
            });
        }
    });
}

/**
 * 変数の値を貼り付け開始
 */
function startPasteVariable(variableId) {
    const variable = variables.find(v => v.id === variableId);
    if (!variable || !variable.value) {
        alert('貼り付ける値がありません');
        return;
    }

    // 貼り付け先セレクタが設定されている場合は、それを使用して直接貼り付け
    if (variable.pasteSelector) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'pasteValue',
                    selector: variable.pasteSelector,
                    value: variable.value
                }, (response) => {
                    if (response && response.success) {
                        console.log(`[Element Clip] Pasted value to ${variable.pasteSelector}`);
                    } else {
                        // 失敗した場合や要素が見つからない場合は選択モードに移行
                        if (confirm('指定された貼り付け先要素が見つかりませんでした。手動で要素を選択して貼り付けますか？')) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'startSelectPaste',
                                variableId: variableId
                            });
                        }
                    }
                });
            }
        });
    } else {
        // 貼り付け先セレクタがない場合は、従来通り選択モードを開始
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startSelectPaste',
                    variableId: variableId
                });
            }
        });
    }
}

/**
 * すべての変数を貼り付け
 */
function pasteAllVariables() {
    const variablesWithValue = variables.filter(v => v.value);

    if (variablesWithValue.length === 0) {
        alert('貼り付ける値がありません');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            let completed = 0;

            variablesWithValue.forEach((variable, index) => {
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'pasteValue',
                        selector: variable.extractSelector,
                        value: variable.value
                    }, (response) => {
                        completed++;
                    });
                }, index * 100);
            });
        }
    });
}

/**
 * 貼り付け完了の処理
 */
function handlePasteComplete(variableId, success) {
    // 必要に応じて処理
}

/**
 * セットダイアログを開く
 */
function openSetDialog() {
    const hasValues = variables.some(v => v.value);
    if (!hasValues) {
        alert('保存する値がありません。まず変数を抽出してください。');
        return;
    }

    // デフォルト名を生成: 1番目と2番目の変数の値を使用
    let defaultName = '';
    const firstValue = variables[0] && variables[0].value ? variables[0].value.trim() : '';
    const secondValue = variables[1] && variables[1].value ? variables[1].value.trim() : '';

    if (firstValue) {
        defaultName += firstValue;
        if (secondValue) {
            defaultName += ` ${secondValue}`;
        }
    } else if (secondValue) {
        defaultName = secondValue;
    }

    // 値がない場合は日時を使用
    if (!defaultName) {
        defaultName = `データセット ${formatTimestamp(getCurrentTimestamp())}`;
    }

    document.getElementById('set-name').value = defaultName;
    setDialog.classList.add('active');
}

/**
 * セットダイアログを閉じる
 */
function closeSetDialog() {
    setDialog.classList.remove('active');
}

/**
 * セットを保存
 */
function saveSet() {
    const name = document.getElementById('set-name').value.trim();
    if (!name) {
        alert('セット名は必須です');
        return;
    }

    const newSet = {
        id: generateUUID(),
        name: name,
        createdAt: getCurrentTimestamp(),
        sourceUrl: variables[0]?.sourceUrl || '',
        values: variables.map(v => ({
            variableId: v.id,
            variableName: v.name,
            value: v.value || ''
        }))
    };

    savedSets.unshift(newSet); // 先頭に追加
    currentSetId = newSet.id;

    saveData();
    renderSets();
    closeSetDialog();
}

/**
 * セットを読み込み
 */
function loadSet(setId) {
    const set = savedSets.find(s => s.id === setId);
    if (!set) return;

    if (confirm(`セット「${set.name}」を読み込みますか？現在の値は上書きされます。`)) {
        set.values.forEach(savedValue => {
            const variable = variables.find(v => v.id === savedValue.variableId);
            if (variable) {
                variable.value = savedValue.value;
            }
        });

        currentSetId = setId;
        saveData();
        renderVariables();
    }
}

/**
 * セットを削除
 */
function deleteSet(setId) {
    const set = savedSets.find(s => s.id === setId);
    if (!set) return;

    if (confirm(`セット「${set.name}」を削除してもよろしいですか？`)) {
        savedSets = savedSets.filter(s => s.id !== setId);
        if (currentSetId === setId) {
            currentSetId = null;
        }
        saveData();
        renderSets();
    }
}

/**
 * 設定をUIに反映
 */
function updateSettings() {
    document.getElementById('setting-auto-highlight').checked = settings.autoHighlight;
    document.getElementById('setting-show-notifications').checked = settings.showNotifications;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}


/**
 * ドラッグ開始時
 */
function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.dataTransfer.setData('type', 'variable'); // タイプ識別
    e.target.classList.add('dragging');
}

/**
 * ドラッグオーバー時（ドロップ可能にする）
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // ドラッグ中の要素自体には何もしない
    const item = e.target.closest('.variable-item');
    if (!item || item.classList.contains('dragging')) return;

    item.classList.add('drag-over');
}

/**
 * ドラッグ要素が外れた時
 */
function handleDragLeave(e) {
    const item = e.target.closest('.variable-item');
    if (item) {
        item.classList.remove('drag-over');
    }
}

/**
 * ドロップ時
 */
function handleDrop(e) {
    e.preventDefault();

    // タイプチェック
    const type = e.dataTransfer.getData('type');
    if (type !== 'variable') return;

    const targetItem = e.target.closest('.variable-item');
    if (!targetItem) return;

    // スタイルをリセット
    targetItem.classList.remove('drag-over');

    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(targetItem.dataset.index);

    if (fromIndex === toIndex) return;

    // 配列の並べ替え
    const item = variables[fromIndex];
    variables.splice(fromIndex, 1);
    variables.splice(toIndex, 0, item);

    // 保存して再描画
    saveData();
    renderVariables();
}

/**
 * ドラッグ終了時
 */
function handleDragEnd(e) {
    e.target.classList.remove('dragging');

    // すべてのdrag-overクラスを削除（念のため）
    document.querySelectorAll('.variable-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

console.log('[Element Clip] Side panel script loaded');

/**
 * セットのドラッグ開始時
 */
function handleSetDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.dataTransfer.setData('type', 'set'); // タイプを識別
    e.target.classList.add('dragging');
}

/**
 * セットのドラッグオーバー時
 */
function handleSetDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // タイプチェックはdropで行うか、ここで行ってdropEffectを制御する

    const item = e.target.closest('.set-item');
    if (!item || item.classList.contains('dragging')) return;

    item.classList.add('drag-over');
}

/**
 * セットのドラッグ要素が外れた時
 */
function handleSetDragLeave(e) {
    const item = e.target.closest('.set-item');
    if (item) {
        item.classList.remove('drag-over');
    }
}

/**
 * セットのドロップ時
 */
function handleSetDrop(e) {
    e.preventDefault();

    // タイプチェック
    const type = e.dataTransfer.getData('type');
    if (type !== 'set') return;

    const targetItem = e.target.closest('.set-item');
    if (!targetItem) return;

    targetItem.classList.remove('drag-over');

    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(targetItem.dataset.index);

    if (fromIndex === toIndex) return;

    // 配列の並べ替え
    const item = savedSets[fromIndex];
    savedSets.splice(fromIndex, 1);
    savedSets.splice(toIndex, 0, item);

    // 保存して再描画
    saveData();
    renderSets();
}

/**
 * セットのドラッグ終了時
 */
function handleSetDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.set-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}
