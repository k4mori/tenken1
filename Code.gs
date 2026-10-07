/**
 * 点検記録アプリ → Googleスプレッドシート 受け口
 * 使い方：スプレッドシートの「拡張機能 → Apps Script」に、このコードを全部貼り付けて保存。
 */

// ▼ 合言葉。好きな英数字に変えてください（アプリの設定画面にも同じものを入れます）
const TOKEN = 'ここを好きな合言葉に変える';

const SHEET = '記録';
const HEAD = ['キー', '日付', '時刻', '記録表', '場所', '区分', '項目', '単位', '値', '入力日時', '受信日時'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return out({ ok: false, error: '合言葉が違います' });
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.kind === 'test') {
      const sh = ss.getSheetByName('テスト') || ss.insertSheet('テスト');
      if (sh.getLastRow() === 0) sh.appendRow(['受信日時', 'iPadでの送信日時', 'アプリの版']);
      sh.appendRow([new Date(), body.at || '', body.app || '']);
      return out({ ok: true, test: true });
    }
    if (body.kind === 'vals') return out({ ok: true, n: upsert(ss, body.rows || []) });
    return out({ ok: false, error: '不明な送信です' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// 同じ欄（キー）が既にあれば上書き、なければ下に追加
function upsert(ss, rows) {
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@'); // キーは文字のまま
    sh.getRange('C:C').setNumberFormat('@'); // 時刻（10:00 / 16:00）も文字のまま
  }
  const now = new Date();
  const uniq = new Map();
  rows.forEach(r => uniq.set(String(r[0]), r.slice(0, HEAD.length - 1).concat([now])));

  const last = sh.getLastRow();
  const data = last > 1 ? sh.getRange(2, 1, last - 1, HEAD.length).getValues() : [];
  const pos = new Map(data.map((r, i) => [String(r[0]), i]));
  const add = [];
  let changed = false;
  uniq.forEach((line, key) => {
    if (pos.has(key)) { data[pos.get(key)] = line; changed = true; }
    else add.push(line);
  });
  if (changed) sh.getRange(2, 1, data.length, HEAD.length).setValues(data);
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, HEAD.length).setValues(add);
  return uniq.size;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ブラウザでURLを開いたときの確認用
function doGet() {
  return out({ ok: true, msg: '受け口は動いています' });
}
