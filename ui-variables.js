// ============================================
// 変数UIロジック (UI Variables)
// ============================================

let currentEditingVariableId = null;
let selectingTarget = 'extract';

/**
 * 変数を画面に表示
 */
function renderVariables() {
    const variablesList = document.getElementById('variables-list');
    const emptyState = document.getElementById('empty-state');

    if (!variablesList || !emptyState) return;

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
    div.dataset.index = index;
    div.dataset.id = variable.id;

    // ドロップ受け入れはアイテム全体で
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('drop', handleDrop);

    // HTML構造
    div.innerHTML = `
    <div class="drag-handle" draggable="true" title="ドラッグして並べ替え"></div>
    <div class="variable-content-wrapper">
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
    </div>
    `;

    // ドラッグイベント
    const handle = div.querySelector('.drag-handle');
    handle.addEventListener('dragstart', handleDragStart);
    handle.addEventListener('dragend', handleDragEnd);

    // アクションボタンイベント
    div.querySelector('[data-action="extract"]').addEventListener('click', () => extractVariable(variable.id));
    div.querySelector('[data-action="paste"]').addEventListener('click', () => startPasteVariable(variable.id));
    div.querySelector('[data-action="edit"]').addEventListener('click', () => editVariable(variable.id));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteVariable(variable.id));

    // 値の編集イベント
    const valueTextarea = div.querySelector('.variable-value-edit');
    valueTextarea.addEventListener('blur', (e) => {
        updateVariableValue(variable.id, e.target.value);
    });

    valueTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.target.blur();
        }
    });

    return div;
}

// --- Drag & Drop Handlers ---

function handleDragStart(e) {
    const item = e.target.closest('.variable-item');
    if (!item) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.index);
    e.dataTransfer.setData('type', 'variable');
    item.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const item = e.target.closest('.variable-item');
    if (!item || item.classList.contains('dragging')) return;

    item.classList.add('drag-over');
}

function handleDragLeave(e) {
    const item = e.target.closest('.variable-item');
    if (item) {
        item.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();

    const targetItem = e.target.closest('.variable-item');
    if (!targetItem) return;

    if (e.dataTransfer.getData('type') !== 'variable') return;

    targetItem.classList.remove('drag-over');

    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(targetItem.dataset.index);

    if (fromIndex === toIndex) return;

    const item = variables[fromIndex];
    variables.splice(fromIndex, 1);
    variables.splice(toIndex, 0, item);

    saveData();
    renderVariables();
}

function handleDragEnd(e) {
    const item = e.target.closest('.variable-item');
    if (item) item.classList.remove('dragging');

    document.querySelectorAll('.variable-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

// --- Variable Actions ---

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
                }, index * 100);
            });
        }
    });
}

function startPasteVariable(variableId) {
    const variable = variables.find(v => v.id === variableId);
    if (!variable || !variable.value) {
        alert('貼り付ける値がありません');
        return;
    }

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
                        selector: variable.extractSelector, // 注意: ここはextractSelectorを使う? 要件確認: 一括貼り付けはextractSelector(元)を使う仕様だったか?
                        // コード上はextractSelectorを使っていたが、貼り付け先設定があればそちらを使うべきでは?
                        // 元コード: selector: variable.extractSelector
                        // しかしv1.3.9でPaste Selectorが追加された。
                        // ここでPaste Selectorがあれば優先すべき。
                        selector: variable.pasteSelector || variable.extractSelector,
                        value: variable.value
                    }, (response) => {
                        completed++;
                    });
                }, index * 100);
            });
        }
    });
}

function updateVariableValue(variableId, newValue) {
    const variable = variables.find(v => v.id === variableId);
    if (variable) {
        variable.value = newValue;
        variable.lastExtracted = getCurrentTimestamp();
        saveData();
    }
}

function deleteVariable(variableId) {
    if (confirm('この変数を削除してもよろしいですか？')) {
        variables = variables.filter(v => v.id !== variableId);
        saveData();
        renderVariables();
    }
}

function editVariable(variableId) {
    openVariableDialog(variableId);
}

// --- Dialog & Selector Logic ---

function openVariableDialog(variableId = null) {
    currentEditingVariableId = variableId;
    const variableDialog = document.getElementById('variable-dialog');

    if (variableId) {
        const variable = variables.find(v => v.id === variableId);
        if (variable) {
            document.getElementById('variable-name').value = variable.name;
            document.getElementById('variable-selector').value = variable.extractSelector;
            document.getElementById('variable-paste-selector').value = variable.pasteSelector || '';
            document.getElementById('variable-specificity').value = variable.specificityLevel || 1;
            document.getElementById('variable-paste-specificity').value = variable.pasteSpecificityLevel || 1;
            document.getElementById('variable-extract-type').value = variable.extractType;
            if (variable.attributeName) {
                document.getElementById('variable-attribute-name').value = variable.attributeName;
                document.getElementById('attribute-group').style.display = 'block';
            } else {
                document.getElementById('variable-attribute-name').value = '';
                document.getElementById('attribute-group').style.display = 'none';
            }
        }
    } else {
        document.getElementById('variable-name').value = '';
        document.getElementById('variable-selector').value = '';
        document.getElementById('variable-paste-selector').value = '';
        document.getElementById('variable-specificity').value = '1';
        document.getElementById('variable-paste-specificity').value = '1';
        document.getElementById('variable-extract-type').value = 'text';
        document.getElementById('variable-attribute-name').value = '';
        document.getElementById('attribute-group').style.display = 'none';
    }

    variableDialog.classList.add('active');
}

function closeVariableDialog() {
    const variableDialog = document.getElementById('variable-dialog');
    variableDialog.classList.remove('active');
    currentEditingVariableId = null;
}

function saveVariable() {
    const name = document.getElementById('variable-name').value.trim();
    const selector = document.getElementById('variable-selector').value.trim();
    const pasteSelector = document.getElementById('variable-paste-selector').value.trim();
    const specificityLevel = parseInt(document.getElementById('variable-specificity').value) || 1;
    const extractType = document.getElementById('variable-extract-type').value;
    const attributeName = document.getElementById('variable-attribute-name').value.trim();

    if (!name) {
        alert('変数名は必須です');
        return;
    }

    if (currentEditingVariableId) {
        const variable = variables.find(v => v.id === currentEditingVariableId);
        if (variable) {
            variable.name = name;
            variable.extractSelector = selector;
            variable.pasteSelector = pasteSelector;
            variable.specificityLevel = specificityLevel;
            variable.pasteSpecificityLevel = parseInt(document.getElementById('variable-paste-specificity').value) || 1;
            variable.extractType = extractType;
            variable.attributeName = extractType === 'attribute' ? attributeName : null;
        }
    } else {
        const newVariable = {
            id: generateUUID(),
            name: name,
            extractSelector: selector,
            pasteSelector: pasteSelector,
            specificityLevel: specificityLevel,
            pasteSpecificityLevel: parseInt(document.getElementById('variable-paste-specificity').value) || 1,
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

function startSelectElement() {
    let specificityLevel;
    if (selectingTarget === 'extract') {
        specificityLevel = parseInt(document.getElementById('variable-specificity').value) || 1;
    } else {
        specificityLevel = parseInt(document.getElementById('variable-paste-specificity').value) || 1;
    }

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

function handleSelectorSelected(selector, variableId) {
    if (selectingTarget === 'extract') {
        document.getElementById('variable-selector').value = selector;
    } else {
        document.getElementById('variable-paste-selector').value = selector;
    }
}

function verifySelector(selector) {
    if (!selector) {
        alert('セレクタが入力されていません');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'verifySelector',
                selector: selector
            }, (response) => {
                if (response && response.success) {
                    if (response.count === 0) {
                        alert('該当する要素が見つかりませんでした');
                    } else {
                        console.log(`[Element Clip] ${response.count} elements highlighted`);
                    }
                } else {
                    alert('該当する要素が見つかりませんでした（またはページが読み込まれていません）');
                }
            });
        }
    });
}
