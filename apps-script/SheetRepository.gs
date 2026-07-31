function rows_(sheetName, includeRow) {
  var startedAt = Date.now();
  debugDebug_("sheet.read.start", "Reading Sheet tab.", { sheetName: sheetName, includeRow: includeRow });
  if (!SCHEMA[sheetName]) { debugWarn_("sheet.read.rejected", "Unknown Sheet tab requested.", { sheetName: sheetName }); throw apiException_("INVALID_SHEET", "Unknown sheet name."); }
  var sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet) { debugWarn_("sheet.read.missing", "Required Sheet tab is missing.", { sheetName: sheetName }); throw apiException_("MISSING_SHEET", "Required sheet is missing: " + sheetName); }
  var range = sheet.getDataRange(), values = range.getValues();
  debugDebug_("sheet.read.range", "Sheet range loaded.", { sheetName: sheetName, rows: values.length, columns: values.length ? values[0].length : 0, a1Notation: range.getA1Notation() });
  if (!values.length) return [];
  var headers = values[0].map(String), missingHeaders = [];
  SCHEMA[sheetName].forEach(function(header) { if (headers.indexOf(header) < 0) missingHeaders.push(header); });
  if (missingHeaders.length) { debugWarn_("sheet.headers.invalid", "Required Sheet headers are missing.", { sheetName: sheetName, missingHeaders: missingHeaders, actualHeaders: headers }); throw apiException_("INVALID_HEADERS", sheetName + " is missing header: " + missingHeaders[0], { sheetName: sheetName, missingHeaders: missingHeaders }); }
  var records = values.slice(1).filter(function(row) { return row.some(function(value) { return value !== ""; }); }).map(function(row, index) { var object = {}; headers.forEach(function(header, column) { object[header] = row[column]; }); if (includeRow) object.__row = index + 2; return object; });
  debugInfo_("sheet.read.complete", "Sheet tab read successfully.", { sheetName: sheetName, recordCount: records.length, durationMs: Date.now() - startedAt });
  return records;
}

function getUserState_(visitorId) {
  if (!visitorId) { debugDebug_("state.read.skip", "No visitor ID supplied; returning empty state.", {}); return []; }
  debugInfo_("state.read.start", "Loading visitor state.", { visitorId: visitorId });
  var state = rows_("UserState", false).filter(function(row) { return row.visitor_id === visitorId; }).map(function(r) { return { mediaId: r.media_id, liked: truthy_(r.liked), favourite: truthy_(r.favourite), progressSeconds: num_(r.progress_seconds), durationSeconds: num_(r.duration_seconds), progressPercent: num_(r.progress_percent), completed: truthy_(r.completed), playCount: num_(r.play_count), firstPlayedAt: toIso_(r.first_played_at), lastWatchedAt: toIso_(r.last_watched_at), updatedAt: toIso_(r.updated_at) }; });
  debugInfo_("state.read.complete", "Visitor state loaded.", { visitorId: visitorId, stateCount: state.length });
  return state;
}

function saveUserState_(visitorId, payload, action) {
  var startedAt = Date.now();
  debugInfo_("state.write.start", "Preparing visitor state upsert.", { visitorId: visitorId, action: action, mediaId: payload.mediaId, payloadKeys: Object.keys(payload) });
  var allowed = ["mediaId", "liked", "favourite", "progressSeconds", "durationSeconds", "progressPercent", "completed", "lastWatchedAt", "clientUpdatedAt"];
  Object.keys(payload).forEach(function(key) { if (allowed.indexOf(key) < 0) { debugWarn_("state.write.field", "Unexpected state field rejected.", { field: key, allowedFields: allowed }); throw apiException_("INVALID_FIELD", "Unexpected state field: " + key); } });
  var mediaId = cleanText_(payload.mediaId, 100);
  if (!mediaId || !rows_("Media", false).some(function(row) { return row.media_id === mediaId && enabled_(row); })) { debugWarn_("state.write.media", "State write references unavailable media.", { mediaId: mediaId }); throw apiException_("INVALID_MEDIA", "The media item is not available."); }
  var lock = LockService.getScriptLock();
  debugDebug_("state.lock.wait", "Waiting for UserState write lock.", { timeoutMs: 10000 });
  lock.waitLock(10000);
  debugInfo_("state.lock.acquired", "UserState write lock acquired.", {});
  try {
    var sheet = spreadsheet_().getSheetByName("UserState"), values = sheet.getDataRange().getValues(), rowIndex = -1;
    for (var i = 1; i < values.length; i++) if (values[i][1] === visitorId && values[i][2] === mediaId) { rowIndex = i + 1; break; }
    var existing = rowIndex > 0 ? values[rowIndex - 1] : [Utilities.getUuid(), visitorId, mediaId, false, false, 0, 0, 0, false, 0, "", "", ""];
    debugDebug_("state.write.mode", rowIndex > 0 ? "Updating existing state row." : "Creating new state row.", { mediaId: mediaId, rowNumber: rowIndex > 0 ? rowIndex : sheet.getLastRow() + 1 });
    if (typeof payload.liked === "boolean") existing[3] = payload.liked;
    if (typeof payload.favourite === "boolean") existing[4] = payload.favourite;
    if (payload.progressSeconds != null) existing[5] = Math.max(0, num_(payload.progressSeconds));
    if (payload.durationSeconds != null) existing[6] = Math.max(0, num_(payload.durationSeconds));
    existing[7] = existing[6] > 0 ? Math.min(100, existing[5] / existing[6] * 100) : 0;
    existing[8] = typeof payload.completed === "boolean" ? payload.completed : existing[7] >= 95;
    if (action === "savePlayback" && existing[5] > 0) { if (!existing[10]) existing[10] = new Date(); existing[11] = new Date(); existing[9] = Math.max(1, num_(existing[9])); }
    existing[12] = new Date();
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, existing.length).setValues([existing]); else sheet.appendRow(existing);
    debugInfo_("state.write.complete", "Visitor state saved.", { visitorId: visitorId, mediaId: mediaId, mode: rowIndex > 0 ? "update" : "insert", progressPercent: existing[7], completed: existing[8], durationMs: Date.now() - startedAt });
    return { saved: true, mediaId: mediaId, updatedAt: nowIso_() };
  } catch (error) {
    debugError_("state.write.error", "Visitor state upsert failed.", error, { visitorId: visitorId, mediaId: mediaId, durationMs: Date.now() - startedAt });
    throw error;
  } finally {
    lock.releaseLock();
    debugDebug_("state.lock.released", "UserState write lock released.", {});
  }
}

function logEvent_(visitorId, payload) {
  debugInfo_("activity.write.start", "Preparing activity event.", { visitorId: visitorId, eventType: payload.eventType, mediaId: payload.mediaId });
  if (ALLOWED_EVENTS.indexOf(payload.eventType) < 0) { debugWarn_("activity.write.event", "Unsupported activity event rejected.", { eventType: payload.eventType }); throw apiException_("INVALID_EVENT", "Unsupported activity event."); }
  var lock = LockService.getScriptLock();
  debugDebug_("activity.lock.wait", "Waiting for ActivityLog write lock.", { timeoutMs: 10000 });
  lock.waitLock(10000);
  try {
    spreadsheet_().getSheetByName("ActivityLog").appendRow([Utilities.getUuid(), visitorId, payload.eventType, cleanText_(payload.mediaId, 100), cleanText_(JSON.stringify(payload.data || {}), 4000), cleanText_(payload.userAgentHash, 128), new Date()]);
    debugInfo_("activity.write.complete", "Activity event saved.", { visitorId: visitorId, eventType: payload.eventType, mediaId: payload.mediaId });
  } catch (error) {
    debugError_("activity.write.error", "Activity event write failed.", error, { visitorId: visitorId, eventType: payload.eventType });
    throw error;
  } finally { lock.releaseLock(); debugDebug_("activity.lock.released", "ActivityLog write lock released.", {}); }
  return { logged: true };
}

function toIso_(value) { if (!value) return ""; var date = value instanceof Date ? value : new Date(value); return isNaN(date.getTime()) ? "" : date.toISOString(); }

function getContentVersion_() { var version = PropertiesService.getScriptProperties().getProperty("CONTENT_VERSION") || "1"; debugDebug_("cache.version.read", "Content version read.", { contentVersion: version }); return version; }

function clearContentCache_() {
  var props = PropertiesService.getScriptProperties(), previousVersion = props.getProperty("CONTENT_VERSION") || "1", config = getConfig_(), key = "bootstrap:" + config.apiVersion + ":" + previousVersion;
  CacheService.getScriptCache().remove(key);
  var nextVersion = String(Date.now());
  props.setProperty("CONTENT_VERSION", nextVersion);
  debugInfo_("cache.clear", "Content cache invalidated and version advanced.", { removedKey: key, previousVersion: previousVersion, nextVersion: nextVersion });
  return nextVersion;
}

function rebuildContentVersion() { startDebugExecution_("rebuildContentVersion", "editor", {}); var version = clearContentCache_(); debugInfo_("cache.rebuild.complete", "Content version rebuilt.", { contentVersion: version }); finishDebugExecution_(true, { contentVersion: version }); SpreadsheetApp.getUi().alert("Content version rebuilt."); }
function clearContentCache() { startDebugExecution_("clearContentCache", "editor", {}); var version = clearContentCache_(); finishDebugExecution_(true, { contentVersion: version }); SpreadsheetApp.getUi().alert("Content cache cleared."); }