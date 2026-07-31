// Edit only this block when using a standalone Apps Script project.
// Leave SHEET_ID blank when opened from Sheet > Extensions > Apps Script.
// Leave APP_SECRET blank to generate and store a private signing secret automatically.
var NETFLIX_GIFT_CONFIG = {
  SHEET_ID: "",
  DRIVE_FOLDER_ID: "",
  APP_SECRET: "",
  API_VERSION: "1",
  CACHE_SECONDS: 300,
  STATE_RATE_LIMIT_SECONDS: 30,
  MAX_STATE_WRITES_PER_WINDOW: 20,
  DEBUG_ENABLED: true,
  DEBUG_LEVEL: "DEBUG"
};

var SCHEMA = {
  Settings: ["key", "value", "description", "enabled"],
  Navigation: ["navigation_id", "label", "target_type", "target_value", "sort_order", "enabled"],
  Hero: ["hero_id", "title", "subtitle", "eyebrow", "description", "banner_drive_url", "banner_mobile_drive_url", "title_logo_drive_url", "preview_video_drive_url", "media_id", "play_button_text", "info_button_text", "metadata_text", "sort_order", "enabled", "updated_at"],
  Profiles: ["profile_id", "title", "avatar_drive_url", "hero_id", "sort_order", "enabled", "updated_at"],
  Categories: ["category_id", "title", "subtitle", "description", "sort_order", "enabled", "show_on_home", "card_aspect_ratio", "updated_at"],
  ProfileCategories: ["profile_category_id", "profile_id", "category_id", "sort_order", "enabled"],
  Media: ["media_id", "title", "short_title", "description", "long_description", "media_type", "thumbnail_drive_url", "backdrop_drive_url", "mobile_backdrop_drive_url", "video_drive_url", "preview_video_drive_url", "poster_drive_url", "duration_seconds", "display_duration", "year", "relationship_date", "maturity_label", "tags", "location", "featured", "allow_like", "allow_favourite", "show_in_search", "ending_credits_id", "sort_order", "enabled", "updated_at"],
  CategoryItems: ["category_item_id", "category_id", "media_id", "sort_order", "enabled"],
  Credits: ["credit_id", "credits_group_id", "section_title", "role", "name", "message", "image_drive_url", "sort_order", "enabled"],
  UserState: ["state_id", "visitor_id", "media_id", "liked", "favourite", "progress_seconds", "duration_seconds", "progress_percent", "completed", "play_count", "first_played_at", "last_watched_at", "updated_at"],
  ActivityLog: ["event_id", "visitor_id", "event_type", "media_id", "event_data_json", "user_agent_hash", "created_at"],
  ValidationLog: ["validation_id", "sheet_name", "row_number", "field_name", "media_name", "drive_file_id", "drive_file_name", "validation_status", "error_message", "checked_at"]
};

var ALLOWED_GET = ["health", "bootstrap", "content", "media", "validateMedia", "state", "credits"];
var ALLOWED_POST = ["createSession", "saveState", "savePlayback", "toggleLike", "toggleFavourite", "logEvent", "refreshCache"];
var ALLOWED_EVENTS = ["site_open", "intro_complete", "intro_skip", "profile_select", "hero_play", "card_open", "video_start", "video_pause", "video_progress", "video_complete", "like", "unlike", "favourite", "unfavourite", "credits_open", "api_error"];

function getConfig_() {
  debugDebug_("config.load", "Loading code configuration.", { apiVersion: NETFLIX_GIFT_CONFIG.API_VERSION, cacheSeconds: NETFLIX_GIFT_CONFIG.CACHE_SECONDS, debugLevel: NETFLIX_GIFT_CONFIG.DEBUG_LEVEL });
  return {
    sheetId: resolveSheetId_(),
    folderId: NETFLIX_GIFT_CONFIG.DRIVE_FOLDER_ID,
    secret: getOrCreateSecret_(),
    apiVersion: NETFLIX_GIFT_CONFIG.API_VERSION,
    cacheSeconds: Number(NETFLIX_GIFT_CONFIG.CACHE_SECONDS),
    rateSeconds: Number(NETFLIX_GIFT_CONFIG.STATE_RATE_LIMIT_SECONDS),
    maxWrites: Number(NETFLIX_GIFT_CONFIG.MAX_STATE_WRITES_PER_WINDOW)
  };
}

function resolveSheetId_() {
  if (NETFLIX_GIFT_CONFIG.SHEET_ID) {
    debugInfo_("config.sheet", "Using SHEET_ID from Config.gs.", { source: "code", sheetIdSuffix: String(NETFLIX_GIFT_CONFIG.SHEET_ID).slice(-6) });
    return NETFLIX_GIFT_CONFIG.SHEET_ID;
  }
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty("INTERNAL_SHEET_ID");
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    var activeId = active.getId();
    if (savedId !== activeId) {
      props.setProperty("INTERNAL_SHEET_ID", activeId);
      debugWarn_("config.sheet.repaired", "Updated the internally recorded Sheet ID to the active spreadsheet.", { previousIdSuffix: String(savedId || "").slice(-6), sheetIdSuffix: activeId.slice(-6), spreadsheetName: active.getName() });
    }
    debugInfo_("config.sheet", "Using the active bound spreadsheet.", { source: "active-sheet", sheetIdSuffix: activeId.slice(-6), spreadsheetName: active.getName() });
    return activeId;
  }
  if (savedId) {
    debugInfo_("config.sheet", "Using internally recorded Sheet ID for a non-editor execution.", { source: "internal", sheetIdSuffix: savedId.slice(-6) });
    return savedId;
  }
  throw new Error("Set SHEET_ID at the top of Config.gs when using a standalone Apps Script project.");
}
function getOrCreateSecret_() {
  if (NETFLIX_GIFT_CONFIG.APP_SECRET) {
    if (NETFLIX_GIFT_CONFIG.APP_SECRET.length < 20) throw new Error("APP_SECRET in Config.gs must contain at least 20 characters.");
    debugInfo_("config.secret", "Using APP_SECRET from Config.gs.", { source: "code", length: NETFLIX_GIFT_CONFIG.APP_SECRET.length });
    return NETFLIX_GIFT_CONFIG.APP_SECRET;
  }
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("INTERNAL_APP_SECRET");
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    props.setProperty("INTERNAL_APP_SECRET", secret);
    debugInfo_("config.secret", "Generated and stored a private signing secret.", { source: "generated", length: secret.length });
  }
  debugDebug_("config.secret", "Using internally stored signing secret.", { source: "internal", length: secret.length });
  return secret;
}

function setupNetflixGift() {
  startDebugExecution_("setupNetflixGift", "editor", {});
  var startedAt = Date.now();
  try {
    resolveSheetId_();
    getOrCreateSecret_();
    initializeNetflixGiftSheet();
    debugInfo_("setup.wrapper.complete", "One-step setup completed.", { durationMs: Date.now() - startedAt });
    finishDebugExecution_(true, { operation: "setupNetflixGift", durationMs: Date.now() - startedAt });
  } catch (error) {
    debugError_("setup.wrapper.error", "One-step setup failed.", error, { durationMs: Date.now() - startedAt });
    finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR", durationMs: Date.now() - startedAt });
    throw error;
  }
}
function spreadsheet_() { var sheetId = getConfig_().sheetId; debugDebug_("spreadsheet.open", "Opening configured spreadsheet.", { sheetIdSuffix: String(sheetId).slice(-6) }); return SpreadsheetApp.openById(sheetId); }
function nowIso_() { return new Date().toISOString(); }
function cleanText_(value, max) { var text = String(value == null ? "" : value).slice(0, max || 2000); return /^[=+\-@]/.test(text) ? "'" + text : text; }
function truthy_(value) { return value === true || String(value).toLowerCase() === "true" || value === 1; }
function num_(value, fallback) { var n = Number(value); return isFinite(n) ? n : (fallback || 0); }
