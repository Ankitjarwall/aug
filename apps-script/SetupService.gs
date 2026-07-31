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
    try { SpreadsheetApp.getUi().alert("Netflix Gift sheets are ready. Existing data was preserved."); }
    catch (uiError) { debugDebug_("setup.notice.skipped", "Editor alert was unavailable for this execution type.", { reason: uiError.message }); }
  } catch (error) {
    debugError_("setup.error", "Sheet initialization failed.", error, { durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}
function applySheetRules_(sheet, headers) {
  var startedAt = Date.now(), rows = Math.max(2, sheet.getMaxRows()), booleanNames = ["enabled", "show_on_home", "featured", "allow_like", "allow_favourite", "show_in_search", "liked", "favourite", "completed"], checkboxColumns = [], dropdownColumns = [];
  debugDebug_("setup.rules.start", "Applying Sheet validation rules.", { sheetName: sheet.getName(), rowCapacity: rows, headerCount: headers.length });
  booleanNames.forEach(function(name) {
    var col = headers.indexOf(name) + 1;
    if (col) {
      checkboxColumns.push(name);
      sheet.getRange(2, col, rows - 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    }
  });
  var enums = {
    media_type: ["video", "image", "gallery", "credits"],
    target_type: ["section", "category", "media", "external"],
    card_aspect_ratio: ["16:9", "2:3", "1:1"],
    event_type: ALLOWED_EVENTS,
    validation_status: ["valid", "invalid"]
  };
  Object.keys(enums).forEach(function(name) {
    var col = headers.indexOf(name) + 1;
    if (col) {
      dropdownColumns.push(name);
      sheet.getRange(2, col, rows - 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(enums[name], true).setAllowInvalid(false).build());
    }
  });
  if (sheet.getName() === "Settings" && sheet.getLastRow() > 1) {
    var keys = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues(), valueColumn = headers.indexOf("value") + 1;
    var booleanSettings = ["intro_enabled", "hero_autoplay_preview", "show_navigation", "show_search", "show_my_list", "show_continue_watching", "show_credits"];
    keys.forEach(function(row, index) {
      var key = String(row[0]), target = sheet.getRange(index + 2, valueColumn), rule = null;
      if (booleanSettings.indexOf(key) >= 0) rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      else if (key === "intro_display_mode") rule = SpreadsheetApp.newDataValidation().requireValueInList(["always", "once_per_session", "once_per_device", "disabled"], true).setAllowInvalid(false).build();
      else if (key === "intro_duration_ms") rule = SpreadsheetApp.newDataValidation().requireNumberBetween(1200, 15000).setAllowInvalid(false).build();
      else if (key === "content_cache_seconds") rule = SpreadsheetApp.newDataValidation().requireNumberBetween(30, 21600).setAllowInvalid(false).build();
      else if (key === "relationship_start_date") rule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
      if (rule) target.setDataValidation(rule);
    });
  }
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
      ["site_title", "Ankit & you", "Browser tab title and main site identity. Enter any text.", true],
      ["partner_one_name", "Ankit", "First partner name used in personalised copy.", true],
      ["partner_two_name", "you", "Second partner name used in personalised copy.", true],
      ["relationship_start_date", "", "Optional anniversary date. Enter a valid Sheet date.", true],
      ["default_tagline", "Every love story is beautiful, but ours is my favourite.", "Default romantic tagline shown where no custom copy is provided.", true],
      ["netflix_logo_text", "OUR STORY", "Header wordmark. Short uppercase text works best.", true],
      ["profile_name", "Ankit & you", "Profile label shown beside the avatar.", true],
      ["profile_avatar_drive_url", "", "Optional public Google Drive image URL for the profile avatar.", true],
      ["intro_enabled", true, "Show the opening animation. Options: TRUE or FALSE.", true],
      ["intro_duration_ms", 4000, "Intro duration in milliseconds. Allowed range: 1200 to 15000.", true],
      ["intro_display_mode", "always", "Opening frequency. Options: always, once_per_session, once_per_device, disabled.", true],
      ["intro_audio_drive_url", "", "Optional public Google Drive audio URL. Browser autoplay rules still apply.", true],
      ["hero_autoplay_preview", false, "Autoplay the optional hero preview. Options: TRUE or FALSE.", true],
      ["content_cache_seconds", 300, "Content cache lifetime in seconds. Allowed range: 30 to 21600.", true],
      ["show_navigation", true, "Display the top navigation. Options: TRUE or FALSE.", true],
      ["show_search", true, "Display content search. Options: TRUE or FALSE.", true],
      ["show_my_list", true, "Display the visitor favourites row. Options: TRUE or FALSE.", true],
      ["show_continue_watching", true, "Display playback progress. Options: TRUE or FALSE.", true],
      ["show_credits", true, "Enable the ending credits experience. Options: TRUE or FALSE.", true],
      ["credits_media_id", "memory-20", "Media ID that opens ending credits. Must match a Media.media_id value.", true],
      ["footer_text", "Made with love, for us.", "Footer message shown below all content rows.", true],
      ["theme_primary_color", "#e50914", "Primary accent colour as a CSS hex value, for example #e50914.", true],
      ["theme_background_color", "#141414", "Page background colour as a CSS hex value, for example #141414.", true],
      ["default_language", "en", "Default content language code, for example en, hi, or ja.", true]
    ], 0);

    appendMissing_(ss.getSheetByName("Navigation"), [
      ["home", "Home", "section", "home", 1, true],
      ["story", "Our Story", "category", "our-story", 2, true],
      ["memories", "Memories", "category", "beautiful-memories", 3, true],
      ["adventures", "Adventures", "category", "adventures-together", 4, true],
      ["milestones", "Milestones", "category", "milestones", 5, true],
      ["my-list", "My List", "section", "my-list", 6, true]
    ], 0);

    appendMissing_(ss.getSheetByName("Hero"), [[
      "main-hero", "The Story of Ankit & you", "A Love Story", "A LOVE STORY",
      "From unexpected beginnings to unforgettable memories, this is the story of two people who found home in each other.",
      "demo/romantic-hero.png", "demo/romantic-hero.png", "", "", "memory-1", "Play", "More Info",
      "2026 - A Lifetime Series - Romance", 1, true, new Date()
    ]], 0);

    var categories = [
      ["our-story", "Our Story", "Where everything began", "First meetings, first conversations, and the start of your journey.", 1, true, true, "16:9", new Date()],
      ["beautiful-memories", "Beautiful Memories", "Moments worth keeping", "Favourite photos and memories from everyday life.", 2, true, true, "16:9", new Date()],
      ["adventures-together", "Adventures Together", "Places you explored", "Trips, drives, discoveries, and journeys taken together.", 3, true, true, "16:9", new Date()],
      ["date-nights", "Date Nights", "Time just for two", "Dinners, celebrations, and evenings that became special.", 4, true, true, "16:9", new Date()],
      ["funny-moments", "Funny Moments", "The laughter between you", "Inside jokes, surprises, and moments that still make you laugh.", 5, true, true, "16:9", new Date()],
      ["little-things", "The Little Things", "Everyday love", "Small gestures and quiet moments that mean the most.", 6, true, true, "16:9", new Date()],
      ["milestones", "Milestones", "Days that changed everything", "Anniversaries, achievements, and meaningful new chapters.", 7, true, true, "16:9", new Date()],
      ["forever-and-always", "Forever and Always", "The story continues", "Promises, dreams, and everything still waiting ahead.", 8, true, true, "16:9", new Date()]
    ];
    appendMissing_(ss.getSheetByName("Categories"), categories, 0);

    var mediaSeeds = [
      ["The Day It Began", "our-story", "Where your story first started."],
      ["Our First Conversation", "our-story", "The words that made you want to know each other better."],
      ["That Beautiful Smile", "our-story", "A smile that became impossible to forget."],
      ["Our Favourite Evening", "beautiful-memories", "One ordinary evening that became a favourite memory."],
      ["A Picture Worth Keeping", "beautiful-memories", "A photograph that brings the whole moment back."],
      ["Sunsets and Promises", "beautiful-memories", "A quiet sunset shared with someone who feels like home."],
      ["A Road Taken Together", "adventures-together", "A journey made better because you travelled side by side."],
      ["Miles of Memories", "adventures-together", "The places, playlists, and conversations along the way."],
      ["Our Favourite Escape", "adventures-together", "A trip you would happily experience all over again."],
      ["A Table for Two", "date-nights", "Good food, long conversations, and time that moved too quickly."],
      ["Under the City Lights", "date-nights", "An evening made brighter simply by being together."],
      ["A Celebration to Remember", "date-nights", "A special occasion filled with warmth and happiness."],
      ["Laughing Until Midnight", "funny-moments", "The kind of laughter that makes everything else disappear."],
      ["Our Best Inside Joke", "funny-moments", "A joke only the two of you could fully understand."],
      ["Morning Messages", "little-things", "A simple message that made the whole day feel better."],
      ["Home Is You", "little-things", "The comfort of feeling at home wherever you are together."],
      ["A Day to Celebrate", "milestones", "A milestone that deserves its own chapter in your story."],
      ["All We Have Achieved", "milestones", "A reminder of how far you have come together."],
      ["All Our Tomorrows", "forever-and-always", "The plans, hopes, and dreams still waiting ahead."],
      ["To Be Continued", "forever-and-always", "The closing credits for this chapter, with many more to come."]
    ];
    var categoryTitleById = {};
    categories.forEach(function(category) { categoryTitleById[category[0]] = category[1]; });
    var mediaRows = mediaSeeds.map(function(seed, i) {
      var isCredits = i === mediaSeeds.length - 1;
      return [
        "memory-" + (i + 1), seed[0], seed[0], seed[2],
        seed[2] + " Replace this sample with your own photo, date, location, links, and personal message.",
        isCredits ? "credits" : "image", "demo/romantic-hero.png", "demo/romantic-hero.png", "demo/romantic-hero.png",
        "", "", "demo/romantic-hero.png", 0, "A treasured moment", "2026", "", "LOVE",
        categoryTitleById[seed[1]] + ", Ankit, you", "Add your location", i === 0, true, true, true,
        isCredits ? "main-credits" : "", i + 1, true, new Date()
      ];
    });
    appendMissing_(ss.getSheetByName("Media"), mediaRows, 0);
    appendMissing_(ss.getSheetByName("CategoryItems"), mediaSeeds.map(function(seed, i) {
      return ["category-item-" + (i + 1), seed[1], "memory-" + (i + 1), i + 1, true];
    }), 0);

    var creditRows = [
      ["A Story Made Together", "Directed by", "Both of Us", "Every chapter was shaped by the two of us."],
      ["Starring", "Cast", "Ankit and you", "Two people, one unforgettable story."],
      ["Our Memories", "Story by", "Us", "Inspired by moments both big and small."],
      ["Made With Love", "Produced by", "Love, Patience and Support", "Created with care through every season."],
      ["Wherever We Are", "Location", "Home Is Wherever We Are Together", ""],
      ["Songs We Remember", "Soundtrack", "Our Favourite Songs", ""],
      ["The People Beside Us", "Special Thanks", "Family and Friends", "For sharing the journey with us."],
      ["For Every Tomorrow", "Dedicated to", "Our Future", "For all the memories still to come."],
      ["One Last Thing", "Final Message", "I Choose You", "Yesterday, today, and every day after."],
      ["Next Episode", "Coming Soon", "To Be Continued", "This story is only getting started."]
    ];
    appendMissing_(ss.getSheetByName("Credits"), creditRows.map(function(row, i) {
      return ["credit-" + (i + 1), "main-credits", row[0], row[1], row[2], row[3], "", i + 1, true];
    }), 0);

    applySheetRules_(ss.getSheetByName("Settings"), SCHEMA.Settings);
    clearContentCache_();
    debugInfo_("samples.complete", "Sample content check completed.", { settings: 24, navigation: 6, heroes: 1, categories: categories.length, media: mediaRows.length, categoryItems: mediaSeeds.length, credits: creditRows.length, durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(true, { media: mediaRows.length, categories: categories.length, credits: creditRows.length });
  } catch (error) {
    debugError_("samples.error", "Sample content insertion failed.", error, { durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}
function appendMissing_(sheet, rows, idColumn) { var existing = sheet.getLastRow() > 1 ? sheet.getRange(2, idColumn + 1, sheet.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]); }) : []; var missing = rows.filter(function(row) { return existing.indexOf(String(row[idColumn])) < 0; }); debugDebug_("samples.sheet", "Sample rows compared.", { sheetName: sheet.getName(), candidateCount: rows.length, existingIdCount: existing.length, missingCount: missing.length }); if (missing.length) { var startRow = sheet.getLastRow() + 1; sheet.getRange(startRow,1,missing.length,missing[0].length).setValues(missing); debugInfo_("samples.sheet.write", "Missing sample rows inserted.", { sheetName: sheet.getName(), startRow: startRow, insertedCount: missing.length }); } return missing.length; }
function slug_(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function columnLetter_(column) { var result = ""; while (column) { column--; result = String.fromCharCode(65 + column % 26) + result; column = Math.floor(column / 26); } return result; }
