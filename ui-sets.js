// ============================================
// セットUIロジック (UI Sets)
// ============================================

/**
 * セットを画面に表示
 */
function renderSets() {
    const setsList = document.getElementById('sets-list');
    const setsEmptyState = document.getElementById('sets-empty-state');

    if (!setsList || !setsEmptyState) return;

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
    div.dataset.index = index;
    div.dataset.id = set.id;

    div.addEventListener('dragover', handleSetDragOver);
    div.addEventListener('dragleave', handleSetDragLeave);
    div.addEventListener('drop', handleSetDrop);

    div.innerHTML = `
    <div class="drag-handle" draggable="true" title="ドラッグして並べ替え"></div>
    <div class="set-content-wrapper">
        <div class="set-header">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            <input type="checkbox" class="set-checkbox" data-id="${set.id}">
            <div class="set-name">${escapeHtml(set.name)}</div>
          </div>
          <div class="set-actions">
            <button class="btn btn-small btn-info" data-action="load" data-id="${set.id}">読込</button>
            <button class="btn btn-small btn-danger" data-action="delete" data-id="${set.id}">削除</button>
          </div>
        </div>
        <div class="set-info">
          ${formatTimestamp(set.createdAt)} - ${set.values.length}件の変数
        </div>
    </div>
    `;

    const handle = div.querySelector('.drag-handle');
    handle.addEventListener('dragstart', handleSetDragStart);
    handle.addEventListener('dragend', handleSetDragEnd);

    div.querySelector('[data-action="load"]').addEventListener('click', () => loadSet(set.id));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSet(set.id));

    const checkbox = div.querySelector('.set-checkbox');
    checkbox.addEventListener('change', updateDeleteButtonState);
    checkbox.addEventListener('mousedown', (e) => e.stopPropagation());

    return div;
}

// --- Drag & Drop for Sets ---

function handleSetDragStart(e) {
    const item = e.target.closest('.set-item');
    if (!item) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.index);
    e.dataTransfer.setData('type', 'set');
    item.classList.add('dragging');
}

function handleSetDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const item = e.target.closest('.set-item');
    if (!item || item.classList.contains('dragging')) return;

    item.classList.add('drag-over');
}

function handleSetDragLeave(e) {
    const item = e.target.closest('.set-item');
    if (item) {
        item.classList.remove('drag-over');
    }
}

function handleSetDrop(e) {
    e.preventDefault();

    const targetItem = e.target.closest('.set-item');
    if (!targetItem) return;

    if (e.dataTransfer.getData('type') !== 'set') return;

    targetItem.classList.remove('drag-over');

    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(targetItem.dataset.index);

    if (fromIndex === toIndex) return;

    const item = savedSets[fromIndex];
    savedSets.splice(fromIndex, 1);
    savedSets.splice(toIndex, 0, item);

    saveData();
    renderSets();
}

function handleSetDragEnd(e) {
    const item = e.target.closest('.set-item');
    if (item) item.classList.remove('dragging');

    document.querySelectorAll('.set-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

// --- Set Actions ---

function openSetDialog() {
    const hasValues = variables.some(v => v.value);
    if (!hasValues) {
        alert('保存する値がありません。まず変数を抽出してください。');
        return;
    }

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

    if (!defaultName) {
        defaultName = `データセット ${formatTimestamp(getCurrentTimestamp())}`;
    }

    document.getElementById('set-name').value = defaultName;
    document.getElementById('set-dialog').classList.add('active');
}

function closeSetDialog() {
    document.getElementById('set-dialog').classList.remove('active');
}

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

    savedSets.unshift(newSet);
    currentSetId = newSet.id;

    if (settings.clearValuesAfterSave) {
        variables.forEach(v => {
            v.value = '';
            v.lastExtracted = null;
        });
        renderVariables();
    }

    saveData();
    renderSets();
    closeSetDialog();
}

function loadSet(setId) {
    const set = savedSets.find(s => s.id === setId);
    if (!set) return;

    let updatedCount = 0;

    variables.forEach(variable => {
        const savedValue = set.values.find(sv => sv.variableId === variable.id);
        if (savedValue) {
            variable.value = savedValue.value;
            variable.lastExtracted = set.createdAt;
            variable.sourceUrl = set.sourceUrl;
            updatedCount++;
        } else {
            variable.value = '';
            variable.lastExtracted = null;
            variable.sourceUrl = '';
        }
    });

    currentSetId = setId;
    saveData();
    renderVariables();
    console.log(`[Element Clip] Loaded set ${set.name}: ${updatedCount} variables updated`);
}

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

function deleteSelectedSets() {
    const checkboxes = document.querySelectorAll('.set-checkbox:checked');
    if (checkboxes.length === 0) return;

    if (!confirm(`${checkboxes.length}個のセットを削除してもよろしいですか？`)) {
        return;
    }

    const idsToDelete = Array.from(checkboxes).map(cb => cb.dataset.id);
    savedSets = savedSets.filter(set => !idsToDelete.includes(set.id));

    const deleteBtn = document.getElementById('btn-delete-selected-sets');
    if (deleteBtn) deleteBtn.style.display = 'none';

    saveData();
    renderSets();
}

function updateDeleteButtonState() {
    const checkedCount = document.querySelectorAll('.set-checkbox:checked').length;
    const deleteBtn = document.getElementById('btn-delete-selected-sets');

    if (deleteBtn) {
        if (checkedCount > 0) {
            deleteBtn.style.display = 'flex';
            deleteBtn.innerHTML = `<span class="icon">🗑️</span> 選択削除 (${checkedCount})`;
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}

// --- Table View Logic ---

function openTableDialog() {
    const dialog = document.getElementById('table-dialog');
    const tableFn = document.getElementById('sets-table-content');

    let headerHtml = `
        <thead>
            <tr>
                <th style="min-width: 120px;">セット名</th>
                <th style="min-width: 100px;">作成日時</th>
    `;

    variables.forEach(v => {
        headerHtml += `<th style="min-width: 150px;">${escapeHtml(v.name)}</th>`;
    });

    headerHtml += `
                <th class="col-actions-header">操作</th>
            </tr>
        </thead>
    `;

    let bodyHtml = '<tbody>';

    if (savedSets.length === 0) {
        const colSpan = variables.length + 3;
        bodyHtml += `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px;">保存されたセットはありません</td></tr>`;
    } else {
        savedSets.forEach(set => {
            bodyHtml += `<tr>`;
            bodyHtml += `<td>${escapeHtml(set.name)}</td>`;
            bodyHtml += `<td>${formatTimestamp(set.createdAt)}</td>`;

            variables.forEach(v => {
                const savedValue = set.values.find(sv => sv.variableId === v.id);
                const displayValue = savedValue ? escapeHtml(savedValue.value) : '<span style="color: #ccc;">-</span>';
                bodyHtml += `<td title="${savedValue ? escapeHtml(savedValue.value) : ''}">${displayValue}</td>`;
            });

            bodyHtml += `
                <td class="col-actions">
                    <button class="btn btn-small btn-info btn-row-action" data-action="load" data-id="${set.id}" title="読込">📥</button>
                    <button class="btn btn-small btn-danger btn-row-action" data-action="delete" data-id="${set.id}" title="削除">🗑️</button>
                </td>
            `;
            bodyHtml += `</tr>`;
        });
    }

    bodyHtml += '</tbody>';

    tableFn.innerHTML = headerHtml + bodyHtml;

    tableFn.querySelectorAll('.btn-row-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            const id = e.currentTarget.dataset.id;

            if (action === 'load') {
                loadSet(id);
                dialog.classList.remove('active');
            } else if (action === 'delete') {
                if (confirm('このセットを削除してもよろしいですか？')) {
                    deleteSet(id);
                    openTableDialog();
                }
            }
        });
    });

    dialog.classList.add('active');
}
