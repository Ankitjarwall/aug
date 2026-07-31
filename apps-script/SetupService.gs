function initializeNetflixGiftSheet() {
  var ownsContext = !DEBUG_CONTEXT_.requestId;
  if (ownsContext) startDebugExecution_("initializeNetflixGiftSheet", "editor", {});
  var startedAt = Date.now();
  try {
    var ss = spreadsheet_(), names = Object.keys(SCHEMA);
    debugInfo_("setup.start", "Initializing or repairing Sheet tabs.", { spreadsheetName: ss.getName(), sheetCount: names.length });
    names.forEach(function(name, index) {
      var sheet = ss.getSheetByName(name), created = false;
      if (!sheet) { sheet = ss.insertSheet(name); created = true; }
      var headers = SCHEMA[name], existing = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String) : [], addedHeaders = [];
      debugInfo_("setup.sheet.start", "Preparing Sheet tab.", { index: index + 1, total: names.length, sheetName: name, created: created, existingHeaderCount: existing.length });
      headers.forEach(function(header) { if (existing.indexOf(header) < 0) { existing.push(header); addedHeaders.push(header); sheet.getRange(1, existing.length).setValue(header); } });
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, existing.length).setBackground("#e50914").setFontColor("#ffffff").setFontWeight("bold");
      sheet.autoResizeColumns(1, existing.length);
      if (!sheet.getFilter() && sheet.getMaxRows() > 1) { sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), existing.length).createFilter(); debugDebug_("setup.sheet.filter", "Created Sheet filter.", { sheetName: name }); }
      applySheetRules_(sheet, existing);
      debugInfo_("setup.sheet.complete", "Sheet tab prepared.", { sheetName: name, created: created, addedHeaders: addedHeaders, rowCount: sheet.getLastRow(), columnCount: existing.length });
    });
    insertSampleContent();
    var version = clearContentCache_();
    debugInfo_("setup.complete", "Sheet initialization completed.", { sheetCount: names.length, contentVersion: version, durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(true, { sheetCount: names.length, contentVersion: version });
    SpreadsheetApp.getUi().alert("Netflix Gift sheets are ready. Existing data was preserved.");
  } catch (error) {
    debugError_("setup.error", "Sheet initialization failed.", error, { durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}
function applySheetRules_(sheet, headers) {
  var startedAt = Date.now(), rows = Math.max(2, sheet.getMaxRows()), booleanNames = ["enabled", "show_on_home", "featured", "allow_like", "allow_favourite", "show_in_search", "liked", "favourite", "completed"], checkboxColumns = [], dropdownColumns = [];
  debugDebug_("setup.rules.start", "Applying Sheet validation rules.", { sheetName: sheet.getName(), rowCapacity: rows, headerCount: headers.length });
  booleanNames.forEach(function(name) { var col = headers.indexOf(name) + 1; if (col) { checkboxColumns.push(name); sheet.getRange(2, col, rows - 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build()); } });
  var enums = { media_type: ["video", "image", "gallery", "credits"], target_type: ["section", "category", "media", "external"] };
  Object.keys(enums).forEach(function(name) { var col = headers.indexOf(name) + 1; if (col) { dropdownColumns.push(name); sheet.getRange(2, col, rows - 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(enums[name], true).setAllowInvalid(false).build()); } });
  var enabledCol = headers.indexOf("enabled") + 1;
  if (enabledCol) sheet.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=$" + columnLetter_(enabledCol) + "2=FALSE").setBackground("#3d171a").setRanges([sheet.getRange(2, 1, rows - 1, headers.length)]).build()]);
  debugInfo_("setup.rules.complete", "Sheet validation rules applied.", { sheetName: sheet.getName(), checkboxColumns: checkboxColumns, dropdownColumns: dropdownColumns, conditionalFormatting: Boolean(enabledCol), durationMs: Date.now() - startedAt });
}
function insertSampleContent() {
  var ownsContext = !DEBUG_CONTEXT_.requestId;
  if (ownsContext) startDebugExecution_("insertSampleContent", "editor", {});
  var startedAt = Date.now();
  try {
  var ss = spreadsheet_();
  debugInfo_("samples.start", "Checking sample content.", {});
  appendMissing_(ss.getSheetByName("Settings"), [
    ["site_title", "Ankit & Shimran", "Browser and site title", true], ["partner_one_name", "Ankit", "First partner", true], ["partner_two_name", "Shimran", "Second partner", true], ["relationship_start_date", "", "Your anniversary", true], ["default_tagline", "Every love story is beautiful, but ours is my favourite.", "Default romantic tagline", true], ["netflix_logo_text", "OUR STORY", "Header wordmark", true], ["profile_name", "Ankit & Shimran", "Profile label", true], ["profile_avatar_drive_url", "", "Replace with a public Drive image", true], ["intro_enabled", true, "Show opening animation", true], ["intro_duration_ms", 4000, "Intro length in milliseconds", true], ["intro_display_mode", "always", "always, once_per_session, once_per_device, disabled", true], ["intro_audio_drive_url", "", "Optional public audio; autoplay may be blocked", true], ["hero_autoplay_preview", false, "Autoplay hero preview", true], ["content_cache_seconds", 300, "Content cache lifetime", true], ["show_navigation", true, "Display navigation", true], ["show_search", true, "Display search", true], ["show_my_list", true, "Display favourites", true], ["show_continue_watching", true, "Display progress row", true], ["show_credits", true, "Enable credits", true], ["credits_media_id", "memory-12", "Credits media entry", true], ["footer_text", "Made with love, for us.", "Footer copy", true], ["theme_primary_color", "#e50914", "Accent color", true], ["theme_background_color", "#141414", "Page background", true], ["default_language", "en", "Content language", true]
  ], 0);
  appendMissing_(ss.getSheetByName("Navigation"), [["home","Home","section","home",1,true],["story","Our Story","category","our-story",2,true],["memories","Memories","category","beautiful-memories",3,true],["trips","Trips","category","adventures-together",4,true],["my-list","My List","section","my-list",5,true]], 0);
  appendMissing_(ss.getSheetByName("Hero"), [["main-hero","The Story of Ankit & Shimran","A Love Story","A LOVE STORY","From unexpected beginnings to unforgettable memories, this is the story of two people who found home in each other.","demo/romantic-hero.png","demo/romantic-hero.png","","","memory-1","Play","More Info","2026 · A Lifetime Series · Romance",1,true,new Date()]], 0);
  var names = ["Our Story","Beautiful Memories","Adventures Together","Date Nights","Funny Moments","Forever and Always"];
  appendMissing_(ss.getSheetByName("Categories"), names.map(function(name, i) { return [slug_(name),name,"","",i+1,true,true,"16:9",new Date()]; }), 0);
  var titles = ["The Day It Began","That Beautiful Smile","Our Favourite Evening","A Road Taken Together","A Table for Two","Laughing Until Midnight","Sunsets and Promises","The Little Things","Miles of Memories","Home Is You","All Our Tomorrows","To Be Continued"];
  appendMissing_(ss.getSheetByName("Media"), titles.map(function(title, i) { return ["memory-"+(i+1),title,title,"A chapter from our story.","Replace this sample row with your own memory, public Drive links, dates, and message.",i===11?"credits":"image","demo/romantic-hero.png","demo/romantic-hero.png","demo/romantic-hero.png","","","demo/romantic-hero.png",0,"A treasured moment","2026","","LOVE",names[Math.floor(i/2)]+", Ankit, Shimran","Our world",i===0,true,true,true,i===11?"main-credits":"",i+1,true,new Date()]; }), 0);
  appendMissing_(ss.getSheetByName("CategoryItems"), titles.map(function(title, i) { return ["category-item-"+(i+1),slug_(names[Math.floor(i/2)]),"memory-"+(i+1),i+1,true]; }), 0);
  var creditRows = [["Directed by","God"],["Cast","Ankit and Shimran"],["Story by","Our Memories"],["Produced by","Love, Patience and Support"],["Location","Wherever We Are Together"],["Soundtrack","Our Favourite Songs"],["Special Thanks","Family and Friends"],["Final Message","To be continued forever..."]];
  appendMissing_(ss.getSheetByName("Credits"), creditRows.map(function(row, i) { return ["credit-"+(i+1),"main-credits","",row[0],row[1],"","",i+1,true]; }), 0);
  clearContentCache_();
  debugInfo_("samples.complete", "Sample content check completed.", { durationMs: Date.now() - startedAt });
  if (ownsContext) finishDebugExecution_(true, { durationMs: Date.now() - startedAt });
  } catch (error) {
    debugError_("samples.error", "Sample content check failed.", error, { durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}
function appendMissing_(sheet, rows, idColumn) { var existing = sheet.getLastRow() > 1 ? sheet.getRange(2, idColumn + 1, sheet.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); }) : []; var missing = rows.filter(function(row) { return existing.indexOf(String(row[idColumn])) < 0; }); debugDebug_("samples.sheet", "Sample rows compared.", { sheetName: sheet.getName(), candidateCount: rows.length, existingIdCount: existing.length, missingCount: missing.length }); if (missing.length) { var startRow = sheet.getLastRow() + 1; sheet.getRange(startRow,1,missing.length,missing[0].length).setValues(missing); debugInfo_("samples.sheet.write", "Missing sample rows inserted.", { sheetName: sheet.getName(), startRow: startRow, insertedCount: missing.length }); } return missing.length; }
function slug_(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function columnLetter_(column) { var result = ""; while (column) { column--; result = String.fromCharCode(65 + column % 26) + result; column = Math.floor(column / 26); } return result; }
