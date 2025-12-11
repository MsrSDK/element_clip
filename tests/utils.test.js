// ============================================
// ユーティリティ関数のテスト
// ============================================

function runAllTests() {
    // 統合テスト - utils.jsの読み込み確認
    const integrationSection = createSection('統合テスト - utils.js読み込み確認');

    runTest(integrationSection, 'utils.jsが正しく読み込まれている', () => {
        assert(typeof generateSelector !== 'undefined', 'generateSelector関数が定義されているべき');
        assert(typeof extractValue !== 'undefined', 'extractValue関数が定義されているべき');
        assert(typeof pasteValue !== 'undefined', 'pasteValue関数が定義されているべき');
        assert(typeof generateUUID !== 'undefined', 'generateUUID関数が定義されているべき');
    });

    runTest(integrationSection, 'すべてのユーティリティ関数が呼び出し可能', () => {
        assert(typeof generateSelector === 'function', 'generateSelectorは関数であるべき');
        assert(typeof extractValue === 'function', 'extractValueは関数であるべき');
        assert(typeof pasteValue === 'function', 'pasteValueは関数であるべき');
        assert(typeof extractValueBySelector === 'function', 'extractValueBySelectorは関数であるべき');
        assert(typeof pasteValueBySelector === 'function', 'pasteValueBySelectorは関数であるべき');
        assert(typeof generateUUID === 'function', 'generateUUIDは関数であるべき');
        assert(typeof getCurrentTimestamp === 'function', 'getCurrentTimestampは関数であるべき');
        assert(typeof formatTimestamp === 'function', 'formatTimestampは関数であるべき');
    });

    runTest(integrationSection, 'content.jsで必要な関数が利用可能', () => {
        // content.jsで使用される主要な関数をテスト
        const testDiv = document.createElement('div');
        testDiv.id = 'integration-test';
        document.body.appendChild(testDiv);

        // generateSelectorが動作するか
        const selector = generateSelector(testDiv);
        assert(selector, 'generateSelectorが値を返すべき');
        assert(selector.includes('integration-test'), 'セレクタにIDが含まれるべき');

        // extractValueBySelectorが動作するか
        testDiv.textContent = 'test content';
        const value = extractValueBySelector('#integration-test', 'text');
        assertEqual(value, 'test content', 'extractValueBySelectorが正しく動作するべき');

        // pasteValueBySelectorが動作するか
        const input = document.createElement('input');
        input.id = 'integration-test-input';
        document.body.appendChild(input);

        const success = pasteValueBySelector('#integration-test-input', 'pasted value');
        assert(success, 'pasteValueBySelectorが成功するべき');
        assertEqual(input.value, 'pasted value', '値が正しく貼り付けられるべき');

        // クリーンアップ
        document.body.removeChild(testDiv);
        document.body.removeChild(input);
    });

    runTest(integrationSection, '関数のエラーハンドリング', () => {
        // null要素に対するエラーハンドリング
        const selector1 = generateSelector(null);
        assertEqual(selector1, '', 'nullに対しては空文字列を返すべき');

        const value1 = extractValueBySelector('#non-existent-element-12345', 'value');
        assertEqual(value1, '', '存在しない要素からの抽出は空文字列を返すべき');

        const success1 = pasteValueBySelector('#non-existent-element-12345', 'test');
        assertEqual(success1, false, '存在しない要素への貼り付けは失敗するべき');
    });

    // CSSセレクタ生成のテスト
    const selectorSection = createSection('CSSセレクタ生成テスト');

    runTest(selectorSection, 'ID要素のセレクタ生成', () => {
        // テスト用の要素を作成
        const testDiv = document.createElement('div');
        testDiv.id = 'test-element';
        document.body.appendChild(testDiv);

        const selector = generateSelector(testDiv);
        assertEqual(selector, '#test-element', 'IDセレクタが正しく生成されるべき');

        document.body.removeChild(testDiv);
    });

    runTest(selectorSection, 'クラス要素のセレクタ生成', () => {
        const testDiv = document.createElement('div');
        testDiv.className = 'test-class another-class';
        document.body.appendChild(testDiv);

        const selector = generateSelector(testDiv);
        assert(selector.includes('test-class'), 'クラス名がセレクタに含まれるべき');

        document.body.removeChild(testDiv);
    });

    runTest(selectorSection, 'null要素のセレクタ生成', () => {
        const selector = generateSelector(null);
        assertEqual(selector, '', 'null要素は空文字列を返すべき');
    });

    // 値抽出のテスト
    const extractSection = createSection('値抽出テスト');

    runTest(extractSection, 'input要素のvalue抽出', () => {
        const input = document.createElement('input');
        input.value = 'test value';
        document.body.appendChild(input);

        const value = extractValue(input, 'value');
        assertEqual(value, 'test value', 'input要素のvalueが正しく抽出されるべき');

        document.body.removeChild(input);
    });

    runTest(extractSection, 'div要素のtext抽出', () => {
        const div = document.createElement('div');
        div.textContent = 'test text content';
        document.body.appendChild(div);

        const value = extractValue(div, 'text');
        assertEqual(value, 'test text content', 'div要素のtextが正しく抽出されるべき');

        document.body.removeChild(div);
    });

    runTest(extractSection, '属性値の抽出', () => {
        const link = document.createElement('a');
        link.href = 'https://example.com';
        document.body.appendChild(link);

        const value = extractValue(link, 'attribute', 'href');
        assertEqual(value, 'https://example.com', 'href属性が正しく抽出されるべき');

        document.body.removeChild(link);
    });

    runTest(extractSection, 'innerHTML抽出', () => {
        const div = document.createElement('div');
        div.innerHTML = '<span>test</span>';
        document.body.appendChild(div);

        const value = extractValue(div, 'innerHTML');
        assertEqual(value, '<span>test</span>', 'innerHTMLが正しく抽出されるべき');

        document.body.removeChild(div);
    });

    // 値貼り付けのテスト
    const pasteSection = createSection('値貼り付けテスト');

    runTest(pasteSection, 'input要素への貼り付け', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);

        const success = pasteValue(input, 'pasted value');
        assert(success, '貼り付けが成功するべき');
        assertEqual(input.value, 'pasted value', 'input要素に値が設定されるべき');

        document.body.removeChild(input);
    });

    runTest(pasteSection, 'textarea要素への貼り付け', () => {
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        const success = pasteValue(textarea, 'pasted text');
        assert(success, '貼り付けが成功するべき');
        assertEqual(textarea.value, 'pasted text', 'textarea要素に値が設定されるべき');

        document.body.removeChild(textarea);
    });

    runTest(pasteSection, 'null要素への貼り付け', () => {
        const success = pasteValue(null, 'test');
        assertEqual(success, false, 'null要素への貼り付けは失敗するべき');
    });

    // UUID生成のテスト
    const uuidSection = createSection('UUID生成テスト');

    runTest(uuidSection, 'UUID形式の確認', () => {
        const uuid = generateUUID();
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        assert(uuidPattern.test(uuid), 'UUIDが正しい形式であるべき');
    });

    runTest(uuidSection, 'UUID一意性の確認', () => {
        const uuid1 = generateUUID();
        const uuid2 = generateUUID();
        assert(uuid1 !== uuid2, '生成されるUUIDは一意であるべき');
    });

    // タイムスタンプのテスト
    const timestampSection = createSection('タイムスタンプテスト');

    runTest(timestampSection, 'タイムスタンプ生成', () => {
        const timestamp = getCurrentTimestamp();
        assert(typeof timestamp === 'number', 'タイムスタンプは数値であるべき');
        assert(timestamp > 0, 'タイムスタンプは正の数であるべき');
    });

    runTest(timestampSection, 'タイムスタンプのフォーマット', () => {
        const timestamp = 1734012345678; // 2024-12-12 20:12:25
        const formatted = formatTimestamp(timestamp);
        assert(formatted.includes('/'), 'フォーマットされた日時にスラッシュが含まれるべき');
        assert(formatted.includes(':'), 'フォーマットされた日時にコロンが含まれるべき');
    });

    // セレクタによる抽出/貼り付けのテスト
    const selectorOpsSection = createSection('セレクタ操作テスト');

    runTest(selectorOpsSection, 'セレクタによる値抽出', () => {
        const input = document.createElement('input');
        input.id = 'test-input-extract';
        input.value = 'test value';
        document.body.appendChild(input);

        const value = extractValueBySelector('#test-input-extract', 'value');
        assertEqual(value, 'test value', 'セレクタで要素を見つけて値を抽出できるべき');

        document.body.removeChild(input);
    });

    runTest(selectorOpsSection, 'セレクタによる値貼り付け', () => {
        const input = document.createElement('input');
        input.id = 'test-input-paste';
        document.body.appendChild(input);

        const success = pasteValueBySelector('#test-input-paste', 'pasted value');
        assert(success, 'セレクタで要素を見つけて貼り付けできるべき');
        assertEqual(input.value, 'pasted value', '値が正しく貼り付けられるべき');

        document.body.removeChild(input);
    });

    runTest(selectorOpsSection, '存在しないセレクタでの抽出', () => {
        const value = extractValueBySelector('#non-existent-element', 'value');
        assertEqual(value, '', '存在しない要素の抽出は空文字列を返すべき');
    });

    runTest(selectorOpsSection, '存在しないセレクタでの貼り付け', () => {
        const success = pasteValueBySelector('#non-existent-element', 'test');
        assertEqual(success, false, '存在しない要素への貼り付けは失敗するべき');
    });
}
