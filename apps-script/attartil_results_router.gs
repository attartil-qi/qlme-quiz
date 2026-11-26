/**
 * AtTartil Quiz Results — one script for all quizzes.
 *
 * Each quiz POSTs its results here together with:
 *   quizId     its path in the qlme-quiz repo, without ".html"
 *              e.g. "english/surah/quiz_al-jumuah_ayah3-4"
 *   folder     Drive folders under ATTARTIL CLAUDE QUIZZES,
 *              e.g. ["English", "Surah", "Surah Al-Jumuah", "Ayat 3 & 4"]
 *   sheetTitle e.g. "Results: Quiz Al-Jumuah ayat 3 & 4"
 *   columns    [[header, value], ...] in the order they should appear
 *
 * The first time a quiz submits, this script creates that quiz's own Sheet in
 * the right folder (making any missing folders). After that, every submission
 * from the quiz goes to the same Sheet. Each quiz keeps its own Sheet, so
 * results are never mixed.
 *
 * A new Sheet is only created for a quiz that really exists in the
 * attartil-qi/qlme-quiz repository, so strangers can't fill your Drive.
 *
 * Set up once: script.google.com > New project > paste this > Save >
 * Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone >
 * Deploy > Authorize. Send the /exec URL to Claude.
 */

var ROOT_FOLDER_ID = '1V6U_MEkXtO16Anig88RyWIQwjXDICg6F'; // ATTARTIL CLAUDE QUIZZES
var REPO_RAW = 'https://raw.githubusercontent.com/attartil-qi/qlme-quiz/';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var quizId = String(data.quizId || '');
    var ref = String(data.ref || 'main');
    if (!/^(english|malay)\/[a-z_]+\/[\w.-]{1,80}$/.test(quizId)) return reply_({status: 'error', message: 'bad quizId'});
    if (!/^[\w.\/-]{1,100}$/.test(ref)) return reply_({status: 'error', message: 'bad ref'});
    var columns = data.columns;
    if (!Array.isArray(columns) || !columns.length || columns.length > 40) return reply_({status: 'error', message: 'bad columns'});

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var found = getOrCreateSheet_(quizId, ref, data.folder, data.sheetTitle);
      if (!found) return reply_({status: 'error', message: 'unknown quiz'});
      appendRow_(found.sheet, columns);
      return reply_({status: 'success', sheetId: found.id, sheetUrl: found.url, created: found.created});
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return reply_({status: 'error', message: String(err)});
  }
}

function doGet() {
  return reply_({status: 'ok', message: 'AtTartil quiz results endpoint'});
}

function getOrCreateSheet_(quizId, ref, folderPath, title) {
  var props = PropertiesService.getScriptProperties();
  var key = 'sheet:' + quizId;
  var id = props.getProperty(key);
  if (id) {
    try {
      var ss = SpreadsheetApp.openById(id);
      return {sheet: ss.getSheets()[0], id: id, url: ss.getUrl(), created: false};
    } catch (err) { /* Sheet was deleted: make a new one below */ }
  }
  // Only create Sheets for quizzes that exist in the repo.
  var check = UrlFetchApp.fetch(REPO_RAW + ref + '/' + quizId + '.html', {muteHttpExceptions: true, method: 'get'});
  if (check.getResponseCode() !== 200) return null;

  var folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var path = Array.isArray(folderPath) ? folderPath.slice(0, 5) : [];
  path.forEach(function (name) {
    name = String(name).slice(0, 100);
    var it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  });
  var name = String(title || ('Results: ' + quizId)).slice(0, 150);
  var existing = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var file = null;
  while (existing.hasNext()) { var f = existing.next(); if (f.getName() === name) { file = f; break; } }
  var created = false;
  if (!file) {
    var ssNew = SpreadsheetApp.create(name);
    file = DriveApp.getFileById(ssNew.getId());
    file.moveTo(folder);
    created = true;
  }
  props.setProperty(key, file.getId());
  var ss2 = SpreadsheetApp.openById(file.getId());
  return {sheet: ss2.getSheets()[0], id: file.getId(), url: ss2.getUrl(), created: created};
}

function appendRow_(sheet, columns) {
  var headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (!headers.length) {
    headers = ['Timestamp'];
    sheet.getRange(1, 1, 1, 1).setValues([headers]);
  }
  var row = [];
  row[0] = new Date();
  columns.forEach(function (pair) {
    var h = String(pair[0]).slice(0, 100);
    var v = pair[1] == null ? '' : String(pair[1]).slice(0, 45000);
    var idx = headers.indexOf(h);
    if (idx < 0) {
      headers.push(h);
      idx = headers.length - 1;
      sheet.getRange(1, idx + 1).setValue(h); // a new column appears at the end
    }
    row[idx] = v;
  });
  for (var i = 0; i < headers.length; i++) if (row[i] === undefined) row[i] = '';
  // Write answers as plain text, so scores like "9/10" don't turn into dates
  // and nothing a student types is run as a formula.
  var r = sheet.getLastRow() + 1;
  sheet.getRange(r, 2, 1, Math.max(headers.length - 1, 1)).setNumberFormat('@');
  sheet.getRange(r, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(r, 1, 1, headers.length).setValues([row]);
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
