// ============================================
// コンテンツスクリプト - Webページに注入される
// ============================================

// 現在のモード
let currentMode = null; // 'select-extract', 'select-paste'
let currentVariableId = null;
let highlightedElement = null;

// ハイライト用のスタイル (overlay.jsに移動した方が良いが、element自体への適用なのでここに保持)
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

    // オーバーレイを作成 (overlay.js)
    createOverlay();

    // マウス/キーボードイベントリスナーを追加
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    console.log(`[Element Clip] ${mode} mode started`);
}

/**
 * 要素選択モードを終了
 */
function stopSelectMode() {
    currentMode = null;
    currentVariableId = null;

    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);

    // オーバーレイを削除 (overlay.js)
    removeOverlay();

    if (highlightedElement) {
        removeHighlight(highlightedElement);
        highlightedElement = null;
    }

    console.log('[Element Clip] Select mode stopped');
}

/**
 * 右クリックイベントハンドラ（キャンセル用）
 */
function handleContextMenu(event) {
    if (currentMode) {
        event.preventDefault();
        event.stopPropagation();

        stopSelectMode();
        console.log('[Element Clip] Selection cancelled by Right Click');
    }
}

function handleMouseOver(event) {
    if (!currentMode || !currentMode.startsWith('select-')) return;

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;

    if (element.id === 'element-clip-overlay' || element.closest('#element-clip-overlay')) return;
    if (element === highlightedElement) return;

    if (highlightedElement) {
        removeHighlight(highlightedElement);
    }

    highlightElement(element);
    highlightedElement = element;
}

function handleMouseOut(event) {
    // 何もしない
}

function handleClick(event) {
    if (!currentMode || !currentMode.startsWith('select-')) return;

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;

    if (element.id === 'element-clip-overlay' || element.closest('#element-clip-overlay')) return;

    // セレクタ生成 (utils.js)
    const specificityLevel = window.elementClipSpecificityLevel || 1;
    const selector = generateSelector(element, specificityLevel);

    if (currentMode === 'select-extract') {
        chrome.runtime.sendMessage({
            action: 'selectorSelected',
            selector: selector,
            variableId: currentVariableId
        });
    } else if (currentMode === 'select-paste') {
        chrome.runtime.sendMessage({
            action: 'pasteTargetSelected',
            selector: selector,
            variableId: currentVariableId
        });
    }

    stopSelectMode();
}

function highlightElement(element) {
    element.setAttribute('data-element-clip-highlight', 'true');
    element.style.cssText += HIGHLIGHT_STYLE;
}

function removeHighlight(element) {
    if (element.hasAttribute('data-element-clip-highlight')) {
        element.removeAttribute('data-element-clip-highlight');
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.backgroundColor = '';
        element.style.cursor = '';
    }
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

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startSelectExtract':
            if (request.specificityLevel !== undefined) {
                window.elementClipSpecificityLevel = request.specificityLevel;
            }
            startSelectMode('select-extract', request.variableId);
            sendResponse({ success: true });
            break;

        case 'startSelectPaste':
            startSelectMode('select-paste', request.variableId);
            sendResponse({ success: true });
            break;

        case 'extractValue':
            const extractedValue = extractValueBySelector( // utils.js
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
            const pasteSuccess = pasteValueBySelector(request.selector, request.value); // utils.js
            sendResponse({ success: pasteSuccess });
            if (pasteSuccess) {
                showNotification('値を貼り付けました');
            } else {
                showNotification('貼り付けに失敗しました', 'error');
            }
            return true;

        case 'verifySelector':
            highlightElements(request.selector, sendResponse); // overlay.js
            return true;

        case 'stopSelect':
            stopSelectMode();
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }

    return true;
});

console.log('[Element Clip] Content script loaded');
