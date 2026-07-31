function parseDriveReference_(value) {
  var input = String(value || "").trim();
  if (!input) return null;
  if (/^[\w-]{20,}$/.test(input)) { debugDebug_("drive.parse", "Parsed raw Drive file ID.", { fileId: input, originalType: "id" }); return { fileId: input, resourceKey: "", originalType: "id" }; }
  var match = input.match(/\/d\/([\w-]+)/), idMatch = input.match(/[?&]id=([\w-]+)/), keyMatch = input.match(/[?&]resourcekey=([\w-]+)/i), id = match && match[1] || idMatch && idMatch[1];
  if (!id) { debugDebug_("drive.parse.direct", "Value is not a recognized Drive reference; treating it as a direct URL/path.", { value: input }); return null; }
  var result = { fileId: id, resourceKey: keyMatch && keyMatch[1] || "", originalType: match ? "file" : "query" };
  debugDebug_("drive.parse", "Parsed Drive URL.", { fileId: result.fileId, hasResourceKey: Boolean(result.resourceKey), originalType: result.originalType });
  return result;
}

function normalizeImageUrl_(value) {
  var ref = parseDriveReference_(value);
  if (!ref) return String(value || "");
  var url = "https://drive.google.com/thumbnail?id=" + ref.fileId + "&sz=w1600" + (ref.resourceKey ? "&resourcekey=" + encodeURIComponent(ref.resourceKey) : "");
  debugDebug_("drive.normalize.image", "Normalized Drive image URL.", { fileId: ref.fileId, hasResourceKey: Boolean(ref.resourceKey) });
  return url;
}

function normalizeMediaUrl_(value, type) {
  var ref = parseDriveReference_(value);
  if (!ref) return String(value || "");
  var url = type === "video" ? "https://drive.google.com/uc?export=download&id=" + ref.fileId + (ref.resourceKey ? "&resourcekey=" + encodeURIComponent(ref.resourceKey) : "") : normalizeImageUrl_(value);
  debugDebug_("drive.normalize.media", "Normalized Drive media URL.", { fileId: ref.fileId, mediaType: type, hasResourceKey: Boolean(ref.resourceKey) });
  return url;
}

function inspectDriveFile_(value) {
  var startedAt = Date.now(), ref = parseDriveReference_(value);
  if (!ref) {
    var directUrl = String(value || "").trim();
    if (/^https:\/\//i.test(directUrl)) {
      var directName = directUrl.split("?")[0].split("/").pop() || "Public media URL";
      debugInfo_("drive.inspect.direct", "Accepted a direct public HTTPS media URL.", { host: (directUrl.match(/^https:\/\/([^/]+)/i) || ["", ""])[1], fileName: directName });
      return { fileId: "", fileName: directName, mimeType: "external", size: 0, isAccessible: true, isPublic: true, sharingAccess: "PUBLIC_HTTPS", sharingPermission: "VIEW", viewUrl: directUrl, previewUrl: directUrl, downloadUrl: directUrl, thumbnailUrls: [directUrl], resourceKey: "", issue: "" };
    }
    debugWarn_("drive.inspect.invalid", "Media value is neither a Drive reference nor a public HTTPS URL.", { hasValue: Boolean(value) });
    return { fileId: "", isAccessible: false, isPublic: false, issue: value ? "Invalid media URL" : "Empty URL" };
  }
  debugInfo_("drive.inspect.start", "Inspecting Drive file.", { fileId: ref.fileId, hasResourceKey: Boolean(ref.resourceKey) });
  try {
    var file = DriveApp.getFileById(ref.fileId), access = file.getSharingAccess(), permission = file.getSharingPermission(), publicAccess = access === DriveApp.Access.ANYONE || access === DriveApp.Access.ANYONE_WITH_LINK;
    var result = { fileId: ref.fileId, fileName: file.getName(), mimeType: file.getMimeType(), size: file.getSize(), isAccessible: true, isPublic: publicAccess && permission === DriveApp.Permission.VIEW, sharingAccess: String(access), sharingPermission: String(permission), viewUrl: file.getUrl(), previewUrl: "https://drive.google.com/file/d/" + ref.fileId + "/preview", downloadUrl: "https://drive.google.com/uc?export=download&id=" + ref.fileId, thumbnailUrls: [320,480,640,960,1280,1920].map(function(width) { return "https://drive.google.com/thumbnail?id=" + ref.fileId + "&sz=w" + width; }), resourceKey: ref.resourceKey, issue: publicAccess ? "" : "File is not shared with anyone with the link" };
    debugInfo_("drive.inspect.complete", "Drive file inspected.", { fileId: ref.fileId, fileName: result.fileName, mimeType: result.mimeType, size: result.size, isPublic: result.isPublic, sharingAccess: result.sharingAccess, durationMs: Date.now() - startedAt });
    if (!result.isPublic) debugWarn_("drive.inspect.private", "Drive file is not publicly viewable.", { fileId: ref.fileId, fileName: result.fileName, sharingAccess: result.sharingAccess, sharingPermission: result.sharingPermission });
    return result;
  } catch (error) {
    debugError_("drive.inspect.error", "Drive file inspection failed.", error, { fileId: ref.fileId, durationMs: Date.now() - startedAt });
    return { fileId: ref.fileId, fileName: "", isAccessible: false, isPublic: false, resourceKey: ref.resourceKey, issue: error.message };
  }
}

function validateAllMedia() {
  var ownsContext = !DEBUG_CONTEXT_.requestId;
  if (ownsContext) startDebugExecution_("validateAllMedia", "editor", {});
  var startedAt = Date.now(), targets = [], definitions = [
    ["Settings", "profile_avatar_drive_url", "key"], ["Settings", "intro_audio_drive_url", "key"], ["Profiles", "avatar_drive_url", "title"], ["Hero", "banner_drive_url", "title"], ["Hero", "banner_mobile_drive_url", "title"], ["Hero", "title_logo_drive_url", "title"], ["Hero", "preview_video_drive_url", "title"],
    ["Media", "thumbnail_drive_url", "title"], ["Media", "backdrop_drive_url", "title"], ["Media", "mobile_backdrop_drive_url", "title"], ["Media", "video_drive_url", "title"], ["Media", "preview_video_drive_url", "title"], ["Media", "poster_drive_url", "title"], ["Credits", "image_drive_url", "name"]
  ];
  debugInfo_("validation.start", "Collecting media references for validation.", { definitionCount: definitions.length });
  definitions.forEach(function(def) {
    var records = rows_(def[0], true);
    debugDebug_("validation.collect", "Scanning media field.", { sheetName: def[0], fieldName: def[1], rowCount: records.length });
    records.forEach(function(row) { if (row[def[1]]) targets.push({ sheet: def[0], row: row.__row, field: def[1], title: row[def[2]], value: row[def[1]] }); });
  });
  debugInfo_("validation.targets", "Media validation targets collected.", { targetCount: targets.length });
  var results = targets.map(function(target, index) {
    debugInfo_("validation.item.start", "Validating media reference.", { index: index + 1, total: targets.length, sheetName: target.sheet, rowNumber: target.row, fieldName: target.field, title: target.title });
    var info = inspectDriveFile_(target.value), status = info.isAccessible && info.isPublic ? "valid" : "invalid";
    debugInfo_("validation.item.complete", "Media reference validated.", { index: index + 1, total: targets.length, sheetName: target.sheet, rowNumber: target.row, fieldName: target.field, fileId: info.fileId, status: status, issue: info.issue || "" });
    return [Utilities.getUuid(), target.sheet, target.row, target.field, target.title, info.fileId || "", info.fileName || "", status, info.issue || "", new Date()];
  });
  var sheet = spreadsheet_().getSheetByName("ValidationLog");
  if (results.length) { var startRow = sheet.getLastRow() + 1; sheet.getRange(startRow, 1, results.length, SCHEMA.ValidationLog.length).setValues(results); debugInfo_("validation.log.write", "Validation results written to ValidationLog.", { startRow: startRow, resultCount: results.length }); }
  clearContentCache_();
  var summary = { checked: results.length, invalid: results.filter(function(row) { return row[7] === "invalid"; }).length };
  debugInfo_("validation.complete", "Media validation completed.", { checked: summary.checked, invalid: summary.invalid, durationMs: Date.now() - startedAt });
  if (ownsContext) finishDebugExecution_(true, summary);
  return summary;
}

function latestMediaIssues_() {
  try {
    var issues = rows_("ValidationLog", false).filter(function(row) { return row.validation_status === "invalid"; }).slice(-50).map(function(row) { return { contentTitle: row.media_name, fileName: row.drive_file_name, sheetName: row.sheet_name, rowNumber: num_(row.row_number), fieldName: row.field_name, fileId: row.drive_file_id, reason: row.error_message, openUrl: row.drive_file_id ? "https://drive.google.com/file/d/" + row.drive_file_id + "/view" : "" }; });
    debugInfo_("validation.issues", "Latest media issues loaded.", { issueCount: issues.length });
    return issues;
  } catch (error) {
    debugError_("validation.issues.error", "Could not read latest media issues.", error, {});
    return [];
  }
}