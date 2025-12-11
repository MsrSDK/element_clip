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

    // すべて抽出ボタン
    document.getElementById('btn-extract-all').addEventListener('click', () => {
        extractAllVariables();
    });

    // すべて貼り付けボタン
    document.getElementById('btn-paste-all').addEventListener('click', () => {
        pasteAllVariables();
    });

    // すべて保存ボタン
    document.getElementById('btn-save-set').addEventListener('click', () => {
        openSetDialog();
    });

    // 変数ダイアログ
    document.getElementById('btn-select-element').addEventListener('click', () => {
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

    variables.forEach(variable => {
        const item = createVariableItem(variable);
        variablesList.appendChild(item);
    });
}

/**
 * 変数アイテムを作成
 */
function createVariableItem(variable) {
    const div = document.createElement('div');
    div.className = 'variable-item';
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
    <div class="variable-info">
      <div class="variable-selector">${escapeHtml(variable.extractSelector)}</div>
    </div>
    <div class="variable-value ${variable.value ? '' : 'empty'}">
      ${variable.value ? escapeHtml(variable.value) : '値が設定されていません'}
    </div>
  `;

    // イベントリスナーを追加
    div.querySelector('[data-action="extract"]').addEventListener('click', () => extractVariable(variable.id));
    div.querySelector('[data-action="paste"]').addEventListener('click', () => startPasteVariable(variable.id));
    div.querySelector('[data-action="edit"]').addEventListener('click', () => editVariable(variable.id));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteVariable(variable.id));

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

    savedSets.forEach(set => {
        const item = createSetItem(set);
        setsList.appendChild(item);
    });
}

/**
 * セットアイテムを作成
 */
function createSetItem(set) {
    const div = document.createElement('div');
    div.className = 'set-item';
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
            document.getElementById('variable-extract-type').value = variable.extractType;
            document.getElementById('variable-attribute-name').value = variable.attributeName || '';

            const attributeGroup = document.getElementById('attribute-group');
            attributeGroup.style.display = variable.extractType === 'attribute' ? 'block' : 'none';
        }
    } else {
        // 新規作成モード
        document.getElementById('variable-name').value = '';
        document.getElementById('variable-selector').value = '';
        document.getElementById('variable-extract-type').value = 'value';
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'startSelectExtract',
                variableId: currentEditingVariableId || 'temp'
            });
        }
    });
}

/**
 * セレクタが選択された時の処理
 */
function handleSelectorSelected(selector, variableId) {
    document.getElementById('variable-selector').value = selector;
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
    const extractType = document.getElementById('variable-extract-type').value;
    const attributeName = document.getElementById('variable-attribute-name').value.trim();

    if (!name || !selector) {
        alert('変数名とCSSセレクタは必須です');
        return;
    }

    if (currentEditingVariableId) {
        // 編集
        const variable = variables.find(v => v.id === currentEditingVariableId);
        if (variable) {
            variable.name = name;
            variable.extractSelector = selector;
            variable.extractType = extractType;
            variable.attributeName = extractType === 'attribute' ? attributeName : null;
        }
    } else {
        // 新規作成
        const newVariable = {
            id: generateUUID(),
            name: name,
            extractSelector: selector,
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

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'startSelectPaste',
                variableId: variableId
            });
        }
    });
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

    const defaultName = `データセット ${formatTimestamp(getCurrentTimestamp())}`;
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

console.log('[Element Clip] Side panel script loaded');
