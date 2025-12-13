// ============================================
// オーバーレイ（Content Script用）
// ============================================

let overlayElement = null;

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

    // currentModeはcontent.jsで定義されているグローバル変数（共有されるか確認が必要）
    // NOTE: 別ファイルにした場合、currentModeへのアクセスに注意が必要
    // 本来は引数で渡すべきだが、今回は簡易リファクタリングとして
    // このファイルもcontent_scriptsに読み込まれる
    // 
    // しかし、ES Moduleでない場合、別ファイルの変数はwindowスコープでないと見えない？
    // Content Scriptのコンテキストでは、複数のスクリプトファイルは同じグローバルスコープを共有する

    // 一旦テキストは汎用的にするか、呼び出し元で制御
    messageBox.id = 'element-clip-message-box';
    // 初期メッセージ空、後で設定

    overlayElement.appendChild(messageBox);
    document.body.appendChild(overlayElement);
}

/**
 * オーバーレイメッセージを更新
 */
function updateOverlayMessage(text) {
    const box = document.getElementById('element-clip-message-box');
    if (box) {
        box.textContent = text;
    }
}

/**
 * オーバーレイを削除
 */
function removeOverlay() {
    if (overlayElement) {
        overlayElement.remove();
        overlayElement = null;
    }
}

/**
 * セレクタ確認用に要素を一時ハイライト
 */
function highlightElements(selector, sendResponse) {
    try {
        const elements = document.querySelectorAll(selector);

        if (elements.length === 0) {
            sendResponse({ success: true, count: 0 });
            return;
        }

        elements.forEach(el => {
            // 元のスタイルを保存
            const originalTransition = el.style.transition;
            const originalOutline = el.style.outline;
            const originalBoxShadow = el.style.boxShadow;

            // ハイライト適用
            el.style.transition = 'all 0.3s ease';
            el.style.outline = '4px solid #FF5722';
            el.style.outlineOffset = '2px';
            el.style.boxShadow = '0 0 10px rgba(255, 87, 34, 0.5)';

            // スクロールして表示（最初の要素のみ）
            if (el === elements[0]) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // 数秒後に元に戻す
            setTimeout(() => {
                el.style.outline = originalOutline;
                el.style.boxShadow = originalBoxShadow;

                setTimeout(() => {
                    el.style.transition = originalTransition;
                }, 300);
            }, 2000);
        });

        sendResponse({ success: true, count: elements.length });

    } catch (e) {
        console.error('[Element Clip] Verification failed:', e);
        sendResponse({ success: false, error: e.toString() });
    }
}
