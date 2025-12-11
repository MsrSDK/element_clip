// ============================================
// コンテンツスクリプト - Webページに注入される
// ============================================

// 現在のモード
let currentMode = null; // 'select-extract', 'select-paste', 'extracting', 'pasting'
let currentVariableId = null;
let highlightedElement = null;
let overlayElement = null;

// ハイライト用のスタイル
const HIGHLIGHT_STYLE = `
  outline: 3px solid #4CAF50 !important;
  outline-offset: 2px !important;
  background-color: rgba(76, 175, 80, 0.1) !important;
  cursor: pointer !important;
`;

/**
 * 要素選択モードを開始
 */
function startSelectMode(mode, variableId = null) {
    currentMode = mode;
    currentVariableId = variableId;

    // オーバーレイを作成
    createOverlay();

    // マウスイベントリスナーを追加
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);

    console.log(`[Element Clip] ${mode} mode started`);
}

/**
 * 要素選択モードを終了
 */
function stopSelectMode() {
    currentMode = null;
    currentVariableId = null;

    // イベントリスナーを削除
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);

    // オーバーレイを削除
    removeOverlay();

    // ハイライトを解除
    if (highlightedElement) {
        removeHighlight(highlightedElement);
        highlightedElement = null;
    }

    console.log('[Element Clip] Select mode stopped');
}

/**
 * オーバーレイを作成
 */
function createOverlay() {
    if (overlayElement) {
        return;
    }

    overlayElement = document.createElement('div');
    overlayElement.id = 'element-clip-overlay';
    overlayElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.1);
    z-index: 999998;
    pointer-events: none;
  `;

    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  `;

    const modeText = currentMode === 'select-extract' ? '抽出する要素を選択してください' : '貼り付け先の要素を選択してください';
    messageBox.textContent = modeText + ' (Escキーでキャンセル)';

    overlayElement.appendChild(messageBox);
    document.body.appendChild(overlayElement);

    // Escキーでキャンセル
    document.addEventListener('keydown', handleEscapeKey);
}

/**
 * オーバーレイを削除
 */
function removeOverlay() {
    if (overlayElement) {
        overlayElement.remove();
        overlayElement = null;
    }

    document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * Escキーのハンドラ
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        stopSelectMode();
        chrome.runtime.sendMessage({
            action: 'selectCancelled'
        });
    }
}

/**
 * マウスオーバーのハンドラ
 */
function handleMouseOver(event) {
    if (!currentMode || !currentMode.startsWith('select-')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;

    // オーバーレイ自体や子要素は無視
    if (element.id === 'element-clip-overlay' || element.closest('#element-clip-overlay')) {
        return;
    }

    // 既にハイライトされている要素は無視
    if (element === highlightedElement) {
        return;
    }

    // 前のハイライトを解除
    if (highlightedElement) {
        removeHighlight(highlightedElement);
    }

    // 新しい要素をハイライト
    highlightElement(element);
    highlightedElement = element;
}

/**
 * マウスアウトのハンドラ
 */
function handleMouseOut(event) {
    // マウスアウトでは何もしない（ハイライトを維持）
}

/**
 * クリックのハンドラ
 */
function handleClick(event) {
    if (!currentMode || !currentMode.startsWith('select-')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;

    // オーバーレイ自体や子要素は無視
    if (element.id === 'element-clip-overlay' || element.closest('#element-clip-overlay')) {
        return;
    }

    // セレクタを生成
    const selector = generateSelector(element);

    if (currentMode === 'select-extract') {
        // 抽出モード
        chrome.runtime.sendMessage({
            action: 'selectorSelected',
            selector: selector,
            variableId: currentVariableId
        });
    } else if (currentMode === 'select-paste') {
        // 貼り付けモード
        chrome.runtime.sendMessage({
            action: 'pasteTargetSelected',
            selector: selector,
            variableId: currentVariableId
        });
    }

    // モードを終了
    stopSelectMode();
}

/**
 * 要素をハイライト
 */
function highlightElement(element) {
    element.setAttribute('data-element-clip-highlight', 'true');
    element.style.cssText += HIGHLIGHT_STYLE;
}

/**
 * ハイライトを解除
 */
function removeHighlight(element) {
    if (element.hasAttribute('data-element-clip-highlight')) {
        element.removeAttribute('data-element-clip-highlight');
        // スタイルを元に戻す（完全には戻せないので、追加したスタイルのみクリア）
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.backgroundColor = '';
        element.style.cursor = '';
    }
}

/**
 * 値を抽出
 */
function extractValueFromPage(selector, extractType, attributeName) {
    const value = extractValueBySelector(selector, extractType, attributeName);
    return value;
}

/**
 * 値を貼り付け
 */
function pasteValueToPage(selector, value) {
    return pasteValueBySelector(selector, value);
}

/**
 * 通知を表示
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // 3秒後に削除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Element Clip] Message received:', request);

    switch (request.action) {
        case 'startSelectExtract':
            startSelectMode('select-extract', request.variableId);
            sendResponse({ success: true });
            break;

        case 'startSelectPaste':
            startSelectMode('select-paste', request.variableId);
            sendResponse({ success: true });
            break;

        case 'extractValue':
            const extractedValue = extractValueFromPage(
                request.selector,
                request.extractType,
                request.attributeName
            );
            sendResponse({
                success: true,
                value: extractedValue,
                sourceUrl: window.location.href
            });
            showNotification('値を抽出しました');
            break;

        case 'pasteValue':
            const pasteSuccess = pasteValueToPage(request.selector, request.value);
            sendResponse({ success: pasteSuccess });
            if (pasteSuccess) {
                showNotification('値を貼り付けました');
            } else {
                showNotification('貼り付けに失敗しました', 'error');
            }
            break;

        case 'stopSelect':
            stopSelectMode();
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }

    return true; // 非同期レスポンスを有効化
});

console.log('[Element Clip] Content script loaded');
