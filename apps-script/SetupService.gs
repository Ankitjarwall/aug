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
  var startedAt = Date.now(), rows = Math.max(2, sheet.getLastRow()), booleanNames = ["enabled", "show_on_home", "featured", "allow_like", "allow_favourite", "show_in_search", "liked", "favourite", "completed"], checkboxColumns = [], dropdownColumns = [];
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
  var referenceDefinitions = {
    Profiles: { hero_id: "Hero" },
    ProfileCategories: { profile_id: "Profiles", category_id: "Categories" }
  };
  var sheetReferences = referenceDefinitions[sheet.getName()] || {};
  Object.keys(sheetReferences).forEach(function(header) {
    var column = headers.indexOf(header) + 1, targetSheet = sheet.getParent().getSheetByName(sheetReferences[header]);
    if (column && targetSheet) {
      var targetRows = Math.max(2, targetSheet.getLastRow());
      sheet.getRange(2, column, rows - 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(targetSheet.getRange(2, 1, targetRows - 1, 1), true).setAllowInvalid(false).build());
      dropdownColumns.push(header);
    }
  });  if (sheet.getName() === "Settings" && sheet.getLastRow() > 1) {
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
  var enabledCol = headers.indexOf("enabled") + 1, conditionalRules = [];
  if (enabledCol) conditionalRules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=$" + columnLetter_(enabledCol) + "2=FALSE").setBackground("#3d171a").setRanges([sheet.getRange(2, 1, rows - 1, headers.length)]).build());
  if (sheet.getName() === "Profiles" && enabledCol) conditionalRules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=AND($" + columnLetter_(enabledCol) + "2=TRUE,COUNTIF($" + columnLetter_(enabledCol) + "$2:$" + columnLetter_(enabledCol) + "2,TRUE)>5)").setBackground("#6b2c00").setRanges([sheet.getRange(2, 1, rows - 1, headers.length)]).build());
  if (conditionalRules.length) sheet.setConditionalFormatRules(conditionalRules);
  var filter = sheet.getFilter(), filterUpdated = false;
  if (!filter || filter.getRange().getNumRows() !== rows || filter.getRange().getNumColumns() !== headers.length) {
    var savedCriteria = {};
    if (filter) {
      headers.forEach(function(header, index) { var criteria = filter.getColumnFilterCriteria(index + 1); if (criteria) savedCriteria[index + 1] = criteria; });
      filter.remove();
    }
    filter = sheet.getRange(1, 1, rows, headers.length).createFilter();
    Object.keys(savedCriteria).forEach(function(column) { filter.setColumnFilterCriteria(Number(column), savedCriteria[column]); });
    filterUpdated = true;
    debugInfo_("setup.filter.resize", "Sheet filter range updated to cover populated rows.", { sheetName: sheet.getName(), rowCount: rows, columnCount: headers.length, restoredCriteriaCount: Object.keys(savedCriteria).length });
  }
  debugInfo_("setup.rules.complete", "Sheet validation rules applied.", { sheetName: sheet.getName(), checkboxColumns: checkboxColumns, dropdownColumns: dropdownColumns, conditionalFormatting: Boolean(enabledCol), filterUpdated: filterUpdated, durationMs: Date.now() - startedAt });
}

function insertSampleContent() {
  var ownsContext = !DEBUG_CONTEXT_.requestId;
  if (ownsContext) startDebugExecution_("insertSampleContent", "editor", {});
  var startedAt = Date.now();
  try {
    var ss = spreadsheet_();
    var populatedSheets = ["Settings", "Hero", "Media"].filter(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return false;
      return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().some(function(row) { return String(row[0] || "").trim() !== ""; });
    });
    if (populatedSheets.length) {
      debugWarn_("samples.blocked", "Sample content insertion was blocked to protect existing data.", { populatedSheets: populatedSheets });
      throw apiException_("PRODUCTION_DATA_PRESENT", "Sample content can only be inserted into an empty workbook. Existing data was not changed.", { populatedSheets: populatedSheets });
    }
    var sampleResults = {};
    var demoImages = [
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1529634597503-139d3726fed5?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1501901609772-df0848060b33?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=85"
    ];
    var profileImages = [
      "https://ankitjarwall.github.io/aug/profiles/profile-2020.jpg",
      "https://ankitjarwall.github.io/aug/profiles/profile-current.jpg",
      "https://ankitjarwall.github.io/aug/profiles/profile-future.jpg"
    ];
    var demoVideos = {
      0: ["https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", 30],
      6: ["https://media.w3.org/2010/05/sintel/trailer.mp4", 52],
      9: ["https://media.w3.org/2010/05/bunny/trailer.mp4", 33],
      12: ["https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", 30],
      18: ["https://media.w3.org/2010/05/sintel/trailer.mp4", 52]
    };
    debugInfo_("samples.start", "Checking sample content.", { spreadsheetName: ss.getName(), sheetIdSuffix: ss.getId().slice(-6) });
    sampleResults.Settings = upsertSampleRows_(ss.getSheetByName("Settings"), [
      ["site_title", "Ankit & Shimran", "Browser tab title and main site identity. Enter any text.", true],
      ["partner_one_name", "Ankit", "First partner name used in personalised copy.", true],
      ["partner_two_name", "Shimran", "Second partner name used in personalised copy.", true],
      ["relationship_start_date", new Date(2025, 1, 14), "Optional anniversary date. Enter a valid Sheet date.", true],
      ["default_tagline", "Every love story is beautiful, but ours is my favourite.", "Default romantic tagline shown where no custom copy is provided.", true],
      ["netflix_logo_text", "OUR STORY", "Header wordmark. Short uppercase text works best.", true],
      ["profile_name", "Ankit & Shimran", "Profile label shown beside the avatar.", true],
      ["profile_avatar_drive_url", demoImages[1], "Optional Google Drive image or direct public image URL for the profile avatar.", true],
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

    sampleResults.Navigation = upsertSampleRows_(ss.getSheetByName("Navigation"), [
      ["home", "Home", "section", "home", 1, true],
      ["story", "Our Story", "category", "our-story", 2, true],
      ["memories", "Memories", "category", "beautiful-memories", 3, true],
      ["trips", "Trips", "category", "adventures-together", 4, true],
      ["adventures", "Adventures", "category", "adventures-together", 5, true],
      ["milestones", "Milestones", "category", "milestones", 6, true],
      ["my-list", "My List", "section", "my-list", 7, true]
    ], 0);

    var profileRows = [
      ["sample-profile-2020", "In 2020 We", profileImages[0], "sample-hero-2020", 1, true, new Date()],
      ["sample-profile-current", "Currently We", profileImages[1], "main-hero", 2, true, new Date()],
      ["sample-profile-future", "In Future We", profileImages[2], "sample-hero-future", 3, true, new Date()]
    ];
    sampleResults.Profiles = upsertSampleRows_(ss.getSheetByName("Profiles"), profileRows, 0);

    var heroRows = [
      ["sample-hero-2020", "Where Our Story Began", "In 2020 We", "THE FIRST CHAPTER", "The first conversations, favourite smiles, and little moments that turned 2020 into the beginning of us.", profileImages[0], profileImages[0], "", demoVideos[0][0], "memory-1", "Play", "More Info", "2020 - The Beginning - Romance", 1, true, new Date()],
      ["main-hero", "The Story of Ankit & Shimran", "A Love Story", "A LOVE STORY", "From unexpected beginnings to unforgettable memories, this is the story of two people who found home in each other.", demoImages[3], demoImages[3], "", demoVideos[0][0], "memory-1", "Play", "More Info", "Now - A Lifetime Series - Romance", 2, true, new Date()],
      ["sample-hero-future", "All Our Tomorrows", "In Future We", "THE STORY CONTINUES", "A glimpse of the adventures, milestones, quiet mornings, and beautiful future still waiting for us.", profileImages[2], profileImages[2], "", demoVideos[18][0], "memory-19", "Play", "More Info", "Coming Soon - Forever - Romance", 3, true, new Date()]
    ];
    sampleResults.Hero = upsertSampleRows_(ss.getSheetByName("Hero"), heroRows, 0);

    var categories = [
      ["top-10-today", "Top 10 Shows Today", "Today's most-loved memories", "The ten chapters at the top of your story today.", 0, true, true, "16:9", new Date()],
      ["our-story", "Our Story", "Where everything began", "First meetings, first conversations, and the start of your journey.", 1, true, true, "16:9", new Date()],
      ["beautiful-memories", "Beautiful Memories", "Moments worth keeping", "Favourite photos and memories from everyday life.", 2, true, true, "16:9", new Date()],
      ["adventures-together", "Adventures Together", "Places you explored", "Trips, drives, discoveries, and journeys taken together.", 3, true, true, "16:9", new Date()],
      ["date-nights", "Date Nights", "Time just for two", "Dinners, celebrations, and evenings that became special.", 4, true, true, "16:9", new Date()],
      ["funny-moments", "Funny Moments", "The laughter between you", "Inside jokes, surprises, and moments that still make you laugh.", 5, true, true, "16:9", new Date()],
      ["little-things", "The Little Things", "Everyday love", "Small gestures and quiet moments that mean the most.", 6, true, true, "16:9", new Date()],
      ["milestones", "Milestones", "Days that changed everything", "Anniversaries, achievements, and meaningful new chapters.", 7, true, true, "16:9", new Date()],
      ["forever-and-always", "Forever and Always", "The story continues", "Promises, dreams, and everything still waiting ahead.", 8, true, true, "16:9", new Date()]
    ];
    sampleResults.Categories = upsertSampleRows_(ss.getSheetByName("Categories"), categories, 0);

    var profileCategorySeeds = {
      "sample-profile-2020": ["our-story", "beautiful-memories", "date-nights", "funny-moments", "little-things"],
      "sample-profile-current": ["top-10-today", "beautiful-memories", "adventures-together", "date-nights", "little-things"],
      "sample-profile-future": ["adventures-together", "little-things", "milestones", "forever-and-always", "beautiful-memories"]
    };
    var profileCategoryRows = [];
    Object.keys(profileCategorySeeds).forEach(function(profileId) {
      profileCategorySeeds[profileId].forEach(function(categoryId, index) { profileCategoryRows.push(["sample-profile-category-" + profileId + "-" + (index + 1), profileId, categoryId, index + 1, true]); });
    });
    sampleResults.ProfileCategories = replaceOwnedSampleRows_(ss.getSheetByName("ProfileCategories"), profileCategoryRows, 0, function(id) { return id.indexOf("sample-profile-category-") === 0; });
    debugInfo_("samples.profiles.built", "Built sample profile catalog mappings.", { profileCount: profileRows.length, profileCategoryCount: profileCategoryRows.length, maxProfiles: 5 });

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
      var demoVideo = demoVideos[i];
      var demoImage = demoImages[i];
      return [
        "memory-" + (i + 1), seed[0], seed[0], seed[2],
        seed[2] + " Replace this sample with your own photo, date, location, links, and personal message.",
        isCredits ? "credits" : (demoVideo ? "video" : "image"), demoImage, demoImage, demoImage,
        demoVideo ? demoVideo[0] : "", "", demoImage, demoVideo ? demoVideo[1] : 0, demoVideo ? "Open sample video" : "A treasured moment", "2026", "", "LOVE",
        categoryTitleById[seed[1]] + ", Ankit, Shimran", "Add your location", i === 0, true, true, true,
        (isCredits || demoVideo) ? "main-credits" : "", i + 1, true, new Date()
      ];
    });
    sampleResults.Media = upsertSampleRows_(ss.getSheetByName("Media"), mediaRows, 0);

    var categoryItemRows = [];
    var categoryItemCounts = {};
    var playableMediaCount = mediaSeeds.length - 1;
    categories.forEach(function(category, categoryIndex) {
      var categoryId = category[0];
      var offset = categoryId === "top-10-today" ? 0 : Math.max(0, categoryIndex - 1) * 2;
      categoryItemCounts[categoryId] = 10;
      for (var rank = 0; rank < 10; rank++) {
        var mediaIndex = (offset + rank) % playableMediaCount;
        categoryItemRows.push(["sample-category-item-" + categoryId + "-" + (rank + 1), categoryId, "memory-" + (mediaIndex + 1), rank + 1, true]);
      }
    });
    debugInfo_("samples.categoryItems.built", "Built ten ranked sample items for every category.", { categoryCount: categories.length, categoryItemCount: categoryItemRows.length, itemsPerCategory: categoryItemCounts });
    sampleResults.CategoryItems = replaceOwnedSampleRows_(ss.getSheetByName("CategoryItems"), categoryItemRows, 0, function(id) {
      return /^category-item-[0-9]+$/.test(id) || id.indexOf("sample-category-item-") === 0;
    });

    var creditRows = [
      ["A Love Story for the Ages", "Directed by", "My Girlfriend, Shimran", "You are the heart behind every beautiful scene."],
      ["The Leading Lady", "Starring", "Shimran", "The smile that makes every day feel cinematic."],
      ["Her Favourite Person", "Starring", "Ankit", "Lucky enough to share this story with you."],
      ["Written From the Heart", "Written by", "Ankit", "Every word is another way of saying I love you."],
      ["Our Greatest Production", "Produced by", "Love, Trust and Endless Laughter", "Made together, one memory at a time."],
      ["The Perfect Setting", "Location", "Wherever I Am With You", "Every place feels like home beside you."],
      ["Songs That Feel Like Us", "Soundtrack", "Our Favourite Songs", "For every drive, dance and quiet evening."],
      ["For Every Tomorrow", "Dedicated to", "Shimran", "For the life we are still writing together."],
      ["One Last Thing", "Final Message", "I Choose You", "Yesterday, today, and every day after."],
      ["Next Episode", "Coming Soon", "Forever With You", "This love story is only getting started."]
    ];
    sampleResults.Credits = replaceOwnedSampleRows_(ss.getSheetByName("Credits"), creditRows.map(function(row, i) {
      return ["credit-" + (i + 1), "main-credits", row[0], row[1], row[2], row[3], demoImages[i], i + 1, true];
    }), 0, function(id) { return /^credit-[0-9]+$/.test(id); });

    var exampleTimestamp = new Date();
    var exampleVisitorId = "visitor_00000000-0000-0000-0000-000000000000";
    var userStateRows = [
      ["sample-state-1", exampleVisitorId, "memory-1", true, true, 45, 180, 25, false, 1, exampleTimestamp, exampleTimestamp, exampleTimestamp],
      ["sample-state-2", exampleVisitorId, "memory-2", false, true, 180, 180, 100, true, 2, exampleTimestamp, exampleTimestamp, exampleTimestamp],
      ["sample-state-3", exampleVisitorId, "memory-3", true, false, 0, 240, 0, false, 0, "", "", exampleTimestamp]
    ];
    sampleResults.UserState = upsertSampleRows_(ss.getSheetByName("UserState"), userStateRows, 0);

    var activityRows = [
      ["sample-activity-1", exampleVisitorId, "site_open", "", "{\"sample\":true,\"note\":\"Example activity row\"}", "sample-user-agent-hash", exampleTimestamp],
      ["sample-activity-2", exampleVisitorId, "video_start", "memory-1", "{\"sample\":true,\"positionSeconds\":0}", "sample-user-agent-hash", exampleTimestamp],
      ["sample-activity-3", exampleVisitorId, "favourite", "memory-2", "{\"sample\":true,\"favourite\":true}", "sample-user-agent-hash", exampleTimestamp]
    ];
    sampleResults.ActivityLog = upsertSampleRows_(ss.getSheetByName("ActivityLog"), activityRows, 0);

    var validationRows = [
      ["sample-validation-1", "Hero", 2, "banner_drive_url", "Main Hero", "", "Unsplash demo image", "valid", "Example public stock image URL.", exampleTimestamp],
      ["sample-validation-2", "Media", 2, "thumbnail_drive_url", "The Day It Began", "", "Unsplash demo image", "valid", "Example public stock thumbnail URL.", exampleTimestamp],
      ["sample-validation-3", "Media", 2, "video_drive_url", "The Day It Began", "", "MDN CC0 demo video", "valid", "Example public stock video URL.", exampleTimestamp]
    ];
    sampleResults.ValidationLog = upsertSampleRows_(ss.getSheetByName("ValidationLog"), validationRows, 0);
    Object.keys(SCHEMA).forEach(function(sheetName) { applySheetRules_(ss.getSheetByName(sheetName), SCHEMA[sheetName]); });
    clearContentCache_();
    debugInfo_("samples.complete", "Sample content check completed.", { candidates: { settings: 24, navigation: 7, heroes: heroRows.length, profiles: profileRows.length, profileCategories: profileCategoryRows.length, categories: categories.length, media: mediaRows.length, categoryItems: categoryItemRows.length, credits: creditRows.length, userState: userStateRows.length, activityLog: activityRows.length, validationLog: validationRows.length }, writes: sampleResults, spreadsheetName: ss.getName(), sheetIdSuffix: ss.getId().slice(-6), durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(true, { writes: sampleResults, spreadsheetName: ss.getName(), sheetIdSuffix: ss.getId().slice(-6) });
  } catch (error) {
    debugError_("samples.error", "Sample content insertion failed.", error, { durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}
function replaceOwnedSampleRows_(sheet, rows, idColumn, isOwned) {
  var lastRow = sheet.getLastRow();
  var removedRows = 0;
  if (lastRow > 1) {
    var ids = sheet.getRange(2, idColumn + 1, lastRow - 1, 1).getValues();
    for (var index = ids.length - 1; index >= 0; index--) {
      var id = String(ids[index][0] || "");
      if (id && isOwned(id)) {
        sheet.deleteRow(index + 2);
        removedRows++;
      }
    }
  }
  debugInfo_("samples.sheet.ownedRows", "Replaced managed sample rows while preserving custom rows.", { sheetName: sheet.getName(), removedRows: removedRows, replacementRows: rows.length });
  var result = upsertSampleRows_(sheet, rows, idColumn);
  result.removedOwnedRows = removedRows;
  return result;
}
function upsertSampleRows_(sheet, rows, idColumn) {
  var lastRow = sheet.getLastRow();
  var width = rows.length ? rows[0].length : 0;
  var existingRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, width).getValues() : [];
  var clearedPlaceholderRows = 0;
  var clearStart = -1;
  function clearPlaceholderRange_(endIndex) {
    if (clearStart < 0) return;
    var count = endIndex - clearStart;
    sheet.getRange(clearStart + 2, 1, count, width).clearContent();
    for (var i = clearStart; i < endIndex; i++) existingRows[i] = new Array(width).fill("");
    clearedPlaceholderRows += count;
    clearStart = -1;
  }
  existingRows.forEach(function(row, index) {
    var hasId = String(row[idColumn] || "") !== "";
    var containsOnlyBlankCheckboxes = !hasId && row.every(function(value) { return value === "" || value == null || value === false; });
    if (containsOnlyBlankCheckboxes && clearStart < 0) clearStart = index;
    if (!containsOnlyBlankCheckboxes) clearPlaceholderRange_(index);
  });
  clearPlaceholderRange_(existingRows.length);

  var rowById = {};
  existingRows.forEach(function(row, index) {
    var id = String(row[idColumn] || "");
    if (id && rowById[id] == null) rowById[id] = index + 2;
  });
  function firstAvailableRow_() {
    for (var index = 0; index < existingRows.length; index++) {
      if (existingRows[index].every(function(value) { return value === "" || value == null; })) return index + 2;
    }
    existingRows.push(new Array(width).fill(""));
    return existingRows.length + 1;
  }

  var insertedRows = 0;
  var movedRows = 0;
  var repairedRows = 0;
  var repairedCells = 0;
  rows.forEach(function(sampleRow) {
    var id = String(sampleRow[idColumn]);
    var existingRowNumber = rowById[id];
    var availableRowNumber = firstAvailableRow_();
    var rowNumber = existingRowNumber || availableRowNumber;
    var currentRow = existingRowNumber ? existingRows[existingRowNumber - 2] : sampleRow.slice();

    if (existingRowNumber && availableRowNumber < existingRowNumber) {
      sheet.getRange(availableRowNumber, 1, 1, width).setValues([currentRow]);
      sheet.getRange(existingRowNumber, 1, 1, width).clearContent();
      existingRows[availableRowNumber - 2] = currentRow;
      existingRows[existingRowNumber - 2] = new Array(width).fill("");
      rowNumber = availableRowNumber;
      rowById[id] = rowNumber;
      movedRows++;
    } else if (!existingRowNumber) {
      sheet.getRange(rowNumber, 1, 1, width).setValues([currentRow]);
      existingRows[rowNumber - 2] = currentRow;
      rowById[id] = rowNumber;
      insertedRows++;
    }

    var rowChanged = false;
    var upgradingLegacyVideo = sampleRow[5] === "video" && currentRow[5] === "image" && !currentRow[9];
    sampleRow.forEach(function(sampleValue, column) {
      var currentValue = currentRow[column];
      var isBlank = currentValue === "" || currentValue == null;
      var isLegacyAsset = currentValue === "demo/romantic-hero.png";
      var isLegacyVideoField = upgradingLegacyVideo && (column === 5 || column === 9 || column === 12 || column === 13);
      if ((isBlank && sampleValue !== "") || isLegacyAsset || isLegacyVideoField) {
        sheet.getRange(rowNumber, column + 1).setValue(sampleValue);
        currentRow[column] = sampleValue;
        repairedCells++;
        rowChanged = true;
      }
    });
    if (rowChanged) repairedRows++;
  });

  var result = { candidates: rows.length, insertedRows: insertedRows, movedRows: movedRows, repairedRows: repairedRows, repairedCells: repairedCells, clearedPlaceholderRows: clearedPlaceholderRows, finalDataRows: Math.max(0, sheet.getLastRow() - 1) };
  debugInfo_("samples.sheet.complete", "Sample rows inserted, moved, or repaired.", { sheetName: sheet.getName(), result: result });
  return result;
}
function slug_(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function columnLetter_(column) { var result = ""; while (column) { column--; result = String.fromCharCode(65 + column % 26) + result; column = Math.floor(column / 26); } return result; }
