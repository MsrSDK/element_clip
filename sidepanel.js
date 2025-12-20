// ============================================
// サイドパネルのメインロジック (Controller)
// ============================================

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // initializeElements(); // UIファイル側でDOMを直接参照しているため、要素初期化は不要または最小限に
    // 設定や変数の変更監視などはここで行う

    // 初期ロード
    loadData(() => {
        renderVariables();
        renderSets();
        updateSettingsUI();
    });

    setupEventListeners();
    setupMessageListener();
});

/**
 * イベントリスナー設定
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

    // 一括変換ボタン
    document.getElementById('btn-transform-all').addEventListener('click', () => {
        transformAllVariables();
    });

    // 変数セット保存ボタン
    document.getElementById('btn-save-set').addEventListener('click', () => {
        openSetDialog();
    });

    // 変数ダイアログ
    document.getElementById('btn-select-element').addEventListener('click', () => {
        // UI変数ファイルのstate更新
        if (typeof selectingTarget !== 'undefined') selectingTarget = 'extract';
        startSelectElement();
    });

    document.getElementById('btn-select-paste-element').addEventListener('click', () => {
        if (typeof selectingTarget !== 'undefined') selectingTarget = 'paste';
        startSelectElement();
    });

    document.getElementById('btn-verify-selector').addEventListener('click', () => {
        const selector = document.getElementById('variable-selector').value.trim();
        verifySelector(selector);
    });

    document.getElementById('btn-verify-paste-selector').addEventListener('click', () => {
        const selector = document.getElementById('variable-paste-selector').value.trim();
        verifySelector(selector);
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

    // セット一括削除ボタン
    document.getElementById('btn-delete-selected-sets').addEventListener('click', () => {
        deleteSelectedSets();
    });

    // 一覧表示ボタン (v1.4.0)
    document.getElementById('btn-show-table').addEventListener('click', () => {
        openTableDialog();
    });

    document.getElementById('btn-close-table').addEventListener('click', () => {
        document.getElementById('table-dialog').classList.remove('active');
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

    document.getElementById('setting-clear-values').addEventListener('change', (e) => {
        settings.clearValuesAfterSave = e.target.checked;
        saveData();
    });

    // テンプレート管理 (v1.4.7)
    document.getElementById('btn-manage-templates').addEventListener('click', () => {
        openTemplateDialog();
    });

    document.getElementById('btn-close-template-dialog').addEventListener('click', () => {
        closeTemplateDialog();
    });

    document.getElementById('btn-save-template').addEventListener('click', () => {
        saveCurrentAsTemplate();
    });
}

/**
 * 設定UIの更新
 */
function updateSettingsUI() {
    document.getElementById('setting-auto-highlight').checked = settings.autoHighlight;
    document.getElementById('setting-show-notifications').checked = settings.showNotifications;
    document.getElementById('setting-clear-values').checked = settings.clearValuesAfterSave;
}

/**
 * メッセージリスナー
 */
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'selectorSelected':
                handleSelectorSelected(request.selector, request.variableId);
                break;

            case 'pasteTargetSelected':
                handleSelectorSelected(request.selector, request.variableId);
                break;

            case 'selectCancelled':
                // 何もしない
                break;

            case 'pasteComplete':
                // ログ等
                break;
        }
        sendResponse({ success: true });
        return true;
    });
}
