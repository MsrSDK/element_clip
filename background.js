// ============================================
// バックグラウンドスクリプト（Service Worker）
// ============================================

// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Element Clip] Extension installed');

    // 初期データを設定
    chrome.storage.local.get(['variables', 'savedSets', 'settings'], (result) => {
        if (!result.variables) {
            chrome.storage.local.set({
                variables: [],
                savedSets: [],
                currentSetId: null,
                settings: {
                    autoHighlight: true,
                    showNotifications: true
                }
            });
        }
    });
});

// アクションボタンクリック時にサイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Element Clip] Background received message:', request);

    switch (request.action) {
        case 'selectorSelected':
            // セレクタが選択された
            handleSelectorSelected(request.selector, request.variableId, sender.tab.id);
            sendResponse({ success: true });
            break;

        case 'pasteTargetSelected':
            // 貼り付け先が選択された
            handlePasteTargetSelected(request.selector, request.variableId, sender.tab.id);
            sendResponse({ success: true });
            break;

        case 'selectCancelled':
            // 選択がキャンセルされた
            notifySidePanel({ action: 'selectCancelled' });
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }

    return true;
});

/**
 * セレクタが選択された時の処理
 */
function handleSelectorSelected(selector, variableId, tabId) {
    // サイドパネルに通知
    notifySidePanel({
        action: 'selectorSelected',
        selector: selector,
        variableId: variableId
    });
}

/**
 * 貼り付け先が選択された時の処理
 */
function handlePasteTargetSelected(selector, variableId, tabId) {
    // 変数データを取得
    chrome.storage.local.get(['variables'], (result) => {
        const variables = result.variables || [];
        const variable = variables.find(v => v.id === variableId);

        if (variable && variable.value) {
            // コンテンツスクリプトに貼り付けを指示
            chrome.tabs.sendMessage(tabId, {
                action: 'pasteValue',
                selector: selector,
                value: variable.value
            }, (response) => {
                // サイドパネルに通知
                notifySidePanel({
                    action: 'pasteComplete',
                    variableId: variableId,
                    success: response?.success || false
                });
            });
        }
    });
}

/**
 * サイドパネルに通知を送る
 */
function notifySidePanel(message) {
    // サイドパネルを開いているタブを探して通知
    chrome.runtime.sendMessage(message).catch(err => {
        // サイドパネルが開いていない場合はエラーになるが、無視
        console.log('[Element Clip] Side panel not open:', err.message);
    });
}

console.log('[Element Clip] Background script loaded');
