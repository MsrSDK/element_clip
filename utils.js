// ============================================
// ユーティリティ関数群
// ============================================

/**
 * DOM要素から一意なCSSセレクタを生成（詳細度レベル対応版）
 * @param {Element} element - 対象のDOM要素
 * @param {number} specificityLevel - 詳細度レベル (1-4, デフォルト: 1)
 * @returns {string} CSSセレクタ
 */
function generateSelector(element, specificityLevel = 1) {
  if (!element || !(element instanceof Element)) {
    return '';
  }


  // レベルに応じた設定（より詳細な設定に強化）
  const config = {
    1: { maxClasses: 3, maxDepth: 3, includeNth: true, includeType: true },    // 旧レベル3相当
    2: { maxClasses: 5, maxDepth: 5, includeNth: true, includeType: true },    // より詳細
    3: { maxClasses: 999, maxDepth: 8, includeNth: true, includeType: true },  // 非常に詳細
    4: { maxClasses: 999, maxDepth: 999, includeNth: true, includeType: true } // 最大限（bodyまで）
  };

  const settings = config[specificityLevel] || config[1];
  return generateSelectorWithSettings(element, settings);
}

/**
 * 設定に基づいてセレクタを生成
 * @param {Element} element - 対象のDOM要素
 * @param {Object} settings - 生成設定
 * @returns {string} CSSセレクタ
 */
function generateSelectorWithSettings(element, settings) {

  // IDがある場合は優先的に使用（最もシンプル）
  if (element.id) {
    // IDが一意であることを確認
    const idSelector = `#${CSS.escape(element.id)}`;
    if (document.querySelectorAll(idSelector).length === 1) {
      return idSelector;
    }
  }

  // nameまたはaria-label属性がある場合はそれを使用
  if (element.name) {
    const nameSelector = `${element.tagName.toLowerCase()}[name="${CSS.escape(element.name)}"]`;
    if (document.querySelectorAll(nameSelector).length === 1) {
      return nameSelector;
    }
  }

  // シンプルなクラスセレクタを試す
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c && !c.match(/^(active|hover|focus|disabled|selected)$/i));

    // 単一クラスで一意になるか試す
    for (const cls of classes) {
      const classSelector = `${element.tagName.toLowerCase()}.${CSS.escape(cls)}`;
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    }

    // 複数クラスの組み合わせで試す（最大2つまで）
    if (classes.length > 1) {
      const combinedSelector = `${element.tagName.toLowerCase()}.${classes.slice(0, 2).map(c => CSS.escape(c)).join('.')}`;
      if (document.querySelectorAll(combinedSelector).length === 1) {
        return combinedSelector;
      }
    }
  }

  // 親要素を含めた最小限のパスを構築
  const path = [];
  let current = element;
  let depth = 0;

  while (current && current !== document.body && depth < settings.maxDepth) {
    let selector = current.tagName.toLowerCase();

    // ID、name、クラスを優先的に使用
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break; // IDが見つかったら終了
    } else if (current.name) {
      selector += `[name="${CSS.escape(current.name)}"]`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c && !c.match(/^(active|hover|focus|disabled|selected)$/i));
      const classesToUse = classes.slice(0, settings.maxClasses);
      if (classesToUse.length > 0) {
        selector += '.' + classesToUse.map(c => CSS.escape(c)).join('.');
      }
    }

    // 兄弟要素の中での位置（設定に応じて）
    if (settings.includeNth && current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const sameTagSiblings = siblings.filter(sibling => sibling.tagName === current.tagName);

      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current);
        selector += `:nth-of-type(${index + 1})`;
      }
    }

    path.unshift(selector);

    // このセレクタで一意になるかチェック
    const currentPath = path.join(' > ');
    if (document.querySelectorAll(currentPath).length === 1) {
      return currentPath;
    }

    current = current.parentElement;
    depth++;
  }

  // 最終的に生成されたパスを返す
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
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
    formatTimestamp,
    escapeHtml
  };
}
