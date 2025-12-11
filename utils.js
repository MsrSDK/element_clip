// ============================================
// ユーティリティ関数群
// ============================================

/**
 * DOM要素から一意なCSSセレクタを生成
 * @param {Element} element - 対象のDOM要素
 * @returns {string} CSSセレクタ
 */
function generateSelector(element) {
  if (!element || !(element instanceof Element)) {
    return '';
  }

  // IDがある場合は優先的に使用
  if (element.id) {
    return `#${element.id}`;
  }

  // パスを構築
  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    // クラスがある場合は追加
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // 兄弟要素の中での位置を特定
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const sameTagSiblings = siblings.filter(sibling => 
        sibling.tagName === current.tagName
      );
      
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * DOM要素から値を抽出
 * @param {Element} element - 対象のDOM要素
 * @param {string} extractType - 抽出タイプ ('value', 'text', 'attribute', 'innerHTML')
 * @param {string} attributeName - 属性名（extractTypeが'attribute'の場合）
 * @returns {string} 抽出された値
 */
function extractValue(element, extractType = 'value', attributeName = null) {
  if (!element) {
    return '';
  }

  switch (extractType) {
    case 'value':
      // input, textarea, selectなどのvalue属性
      return element.value || '';
    
    case 'text':
      // テキストコンテンツ
      return element.textContent?.trim() || '';
    
    case 'attribute':
      // 指定された属性
      if (attributeName) {
        return element.getAttribute(attributeName) || '';
      }
      return '';
    
    case 'innerHTML':
      // HTML内容
      return element.innerHTML || '';
    
    default:
      // デフォルトはvalueかtextContent
      return element.value || element.textContent?.trim() || '';
  }
}

/**
 * セレクタから要素を取得して値を抽出
 * @param {string} selector - CSSセレクタ
 * @param {string} extractType - 抽出タイプ
 * @param {string} attributeName - 属性名
 * @returns {string} 抽出された値
 */
function extractValueBySelector(selector, extractType = 'value', attributeName = null) {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Element not found for selector: ${selector}`);
      return '';
    }
    return extractValue(element, extractType, attributeName);
  } catch (error) {
    console.error(`Error extracting value: ${error.message}`);
    return '';
  }
}

/**
 * 要素に値を設定
 * @param {Element} element - 対象のDOM要素
 * @param {string} value - 設定する値
 * @returns {boolean} 成功したかどうか
 */
function pasteValue(element, value) {
  if (!element) {
    return false;
  }

  try {
    // input, textarea, selectの場合
    if ('value' in element) {
      element.value = value;
      // changeイベントを発火
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    
    // contenteditable要素の場合
    if (element.contentEditable === 'true') {
      element.textContent = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    
    // その他の要素の場合はtextContentに設定
    element.textContent = value;
    return true;
  } catch (error) {
    console.error(`Error pasting value: ${error.message}`);
    return false;
  }
}

/**
 * セレクタから要素を取得して値を貼り付け
 * @param {string} selector - CSSセレクタ
 * @param {string} value - 設定する値
 * @returns {boolean} 成功したかどうか
 */
function pasteValueBySelector(selector, value) {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Element not found for selector: ${selector}`);
      return false;
    }
    return pasteValue(element, value);
  } catch (error) {
    console.error(`Error pasting value: ${error.message}`);
    return false;
  }
}

/**
 * UUIDを生成
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 現在のタイムスタンプを取得
 * @returns {number} タイムスタンプ（ミリ秒）
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * タイムスタンプを日時文字列に変換
 * @param {number} timestamp - タイムスタンプ（ミリ秒）
 * @returns {string} 日時文字列
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// エクスポート（Chrome拡張機能のコンテキストで使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateSelector,
    extractValue,
    extractValueBySelector,
    pasteValue,
    pasteValueBySelector,
    generateUUID,
    getCurrentTimestamp,
    formatTimestamp
  };
}
