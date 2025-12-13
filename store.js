// ============================================
// データ管理 (Store)
// ============================================

// グローバルデータの定義
// 他のスクリプトファイルからアクセス可能にするため、windowオブジェクトに紐付けるか
// 単にトップレベルで定義する（Chrome拡張のページ内スクリプトでは共有される）

var variables = [];
var savedSets = [];
var variableTemplates = []; // 変数項目のテンプレート
var currentSetId = null;
var settings = {
    autoHighlight: true,
    showNotifications: true,
    clearValuesAfterSave: false
};

/**
 * データを読み込み
 * @param {Function} callback - 読み込み完了後のコールバック
 */
function loadData(callback) {
    chrome.storage.local.get(['variables', 'savedSets', 'variableTemplates', 'currentSetId', 'settings'], (result) => {
        variables = result.variables || [];
        savedSets = result.savedSets || [];
        variableTemplates = result.variableTemplates || [];
        currentSetId = result.currentSetId || null;

        // 設定をマージ
        if (result.settings) {
            settings = { ...settings, ...result.settings };
        }

        // マイグレーション: specificityLevelがない変数にデフォルト値を設定
        let needsSave = false;
        variables.forEach(v => {
            if (v.specificityLevel === undefined) {
                v.specificityLevel = 1;
                v.pasteSpecificityLevel = 1; // 貼り付け用も
                needsSave = true;
            }
            // 貼り付け用がない場合のマイグレーション
            if (v.pasteSpecificityLevel === undefined) {
                v.pasteSpecificityLevel = 1;
                needsSave = true;
            }
        });

        if (needsSave) {
            saveData();
        }

        if (callback) callback();
    });
}

/**
 * データを保存
 */
function saveData() {
    chrome.storage.local.set({
        variables: variables,
        savedSets: savedSets,
        variableTemplates: variableTemplates,
        currentSetId: currentSetId,
        settings: settings
    });
}
