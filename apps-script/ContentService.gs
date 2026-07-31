function getBootstrap_(visitorId) {
  var startedAt = Date.now();
  var version = getContentVersion_(), config = getConfig_(), cache = CacheService.getScriptCache(), key = "bootstrap:" + config.apiVersion + ":" + version;
  debugInfo_("bootstrap.start", "Building bootstrap response.", { visitorId: visitorId, contentVersion: version, cacheKey: key });
  var cached = cache.get(key), content = null;
  if (cached) {
    try { content = JSON.parse(cached); debugInfo_("bootstrap.cache.hit", "Bootstrap content loaded from cache.", { bytes: cached.length }); }
    catch (error) { debugError_("bootstrap.cache.parse", "Cached bootstrap JSON was invalid; rebuilding content.", error, { bytes: cached.length }); }
  } else debugInfo_("bootstrap.cache.miss", "Bootstrap content cache missed.", { cacheKey: key });
  if (!content) {
    content = debugStage_("bootstrap.contentBuild", function() { return buildContent_(); });
    var serialized = JSON.stringify(content), ttl = Math.min(21600, Math.max(30, config.cacheSeconds));
    cache.put(key, serialized, ttl);
    debugInfo_("bootstrap.cache.write", "Bootstrap content cached.", { bytes: serialized.length, ttlSeconds: ttl });
  }
  var output = JSON.parse(JSON.stringify(content));
  output.userState = visitorId ? getUserState_(visitorId) : [];
  debugInfo_("bootstrap.state", "Visitor state attached.", { visitorId: visitorId, stateCount: output.userState.length });
  if (visitorId) {
    var session = createSession_(visitorId);
    output.sessionToken = session.sessionToken;
    output.sessionExpiresAt = session.sessionExpiresAt;
    debugInfo_("bootstrap.session", "Visitor session attached.", { visitorId: visitorId, expiresAt: new Date(session.sessionExpiresAt).toISOString() });
  }
  debugInfo_("bootstrap.complete", "Bootstrap response ready.", { durationMs: Date.now() - startedAt, mediaCount: output.media.length, categoryCount: output.categories.length, creditCount: output.credits.length, issueCount: output.mediaIssues.length });
  return output;
}
function buildContent_() {
  var startedAt = Date.now();
  debugInfo_("content.build.start", "Reading Sheet content.", {});
  var settingsRows = rows_("Settings", true), settingsMap = {};
  settingsRows.forEach(function(row) { if (truthy_(row.enabled)) settingsMap[row.key] = row.value; });
  var mediaRows = rows_("Media", true).filter(enabled_);
  var categoryRows = rows_("Categories", true).filter(function(row) { return enabled_(row) && truthy_(row.show_on_home); });
  var links = rows_("CategoryItems", true).filter(enabled_);
  var navigationRows = rows_("Navigation", true).filter(enabled_);
  var heroRows = rows_("Hero", true).filter(enabled_);
  var creditRows = rows_("Credits", true).filter(enabled_);
  debugInfo_("content.build.rows", "Content rows loaded and filtered.", { settings: settingsRows.length, navigation: navigationRows.length, heroes: heroRows.length, categories: categoryRows.length, media: mediaRows.length, categoryItems: links.length, credits: creditRows.length });
  var data = {
    settings: mapSettings_(settingsMap),
    navigation: navigationRows.sort(sortOrder_).map(mapNavigation_),
    hero: heroRows.sort(sortOrder_).map(mapHero_)[0] || {},
    categories: categoryRows.sort(sortOrder_).map(function(row) { var c = mapCategory_(row); c.mediaIds = links.filter(function(link) { return link.category_id === row.category_id; }).sort(sortOrder_).map(function(link) { return link.media_id; }); return c; }),
    media: mediaRows.sort(sortOrder_).map(mapMedia_),
    credits: creditRows.sort(sortOrder_).map(mapCredit_),
    mediaIssues: latestMediaIssues_(),
    contentVersion: getContentVersion_(),
    generatedAt: nowIso_()
  };
  debugStage_("content.references", function() { validateReferences_(data); }, { mediaCount: data.media.length, categoryCount: data.categories.length });
  debugInfo_("content.build.complete", "Content model built.", { durationMs: Date.now() - startedAt, mediaCount: data.media.length, categoryCount: data.categories.length, issueCount: data.mediaIssues.length });
  return data;
}
function mapSettings_(s) { return {
  siteTitle: s.site_title || "Ankit & you", partnerOneName: s.partner_one_name || "Ankit", partnerTwoName: s.partner_two_name || "you", defaultTagline: s.default_tagline || "", logoText: s.netflix_logo_text || "OUR STORY", profileName: s.profile_name || "",
  profileAvatarUrl: normalizeImageUrl_(s.profile_avatar_drive_url || ""), introEnabled: truthy_(s.intro_enabled), introDurationMs: num_(s.intro_duration_ms, 4000), introDisplayMode: s.intro_display_mode || "always", introAudioUrl: normalizeMediaUrl_(s.intro_audio_drive_url || "", "audio"),
  showNavigation: truthy_(s.show_navigation), showSearch: truthy_(s.show_search), showMyList: truthy_(s.show_my_list), showContinueWatching: truthy_(s.show_continue_watching), showCredits: truthy_(s.show_credits), creditsMediaId: s.credits_media_id || "", footerText: s.footer_text || "", themePrimaryColor: s.theme_primary_color || "#e50914", themeBackgroundColor: s.theme_background_color || "#141414"
}; }
function mapNavigation_(r) { return { id: r.navigation_id, label: r.label, targetType: r.target_type, targetValue: r.target_value, sortOrder: num_(r.sort_order) }; }
function mapHero_(r) { return { id: r.hero_id, title: r.title, subtitle: r.subtitle, eyebrow: r.eyebrow, description: r.description, bannerUrl: normalizeImageUrl_(r.banner_drive_url), mobileBannerUrl: normalizeImageUrl_(r.banner_mobile_drive_url), titleLogoUrl: normalizeImageUrl_(r.title_logo_drive_url), previewVideoUrl: normalizeMediaUrl_(r.preview_video_drive_url, "video"), mediaId: r.media_id, playButtonText: r.play_button_text || "Play", infoButtonText: r.info_button_text || "More Info", metadataText: r.metadata_text || "" }; }
function mapCategory_(r) { return { id: r.category_id, title: r.title, subtitle: r.subtitle, description: r.description, sortOrder: num_(r.sort_order), cardAspectRatio: r.card_aspect_ratio || "16:9", mediaIds: [] }; }
function mapMedia_(r) { var drive = parseDriveReference_(r.video_drive_url || r.backdrop_drive_url || ""); return { id: r.media_id, title: r.title, shortTitle: r.short_title, description: r.description, longDescription: r.long_description, mediaType: r.media_type || "image", thumbnailUrl: normalizeImageUrl_(r.thumbnail_drive_url), backdropUrl: normalizeImageUrl_(r.backdrop_drive_url), mobileBackdropUrl: normalizeImageUrl_(r.mobile_backdrop_drive_url), videoUrl: normalizeMediaUrl_(r.video_drive_url, "video"), previewVideoUrl: normalizeMediaUrl_(r.preview_video_drive_url, "video"), posterUrl: normalizeImageUrl_(r.poster_drive_url), durationSeconds: num_(r.duration_seconds), displayDuration: r.display_duration || "", year: String(r.year || ""), relationshipDate: r.relationship_date || "", maturityLabel: r.maturity_label || "LOVE", tags: String(r.tags || "").split(",").map(function(tag) { return tag.trim(); }).filter(String), location: r.location || "", featured: truthy_(r.featured), allowLike: truthy_(r.allow_like), allowFavourite: truthy_(r.allow_favourite), endingCreditsId: r.ending_credits_id || "", sortOrder: num_(r.sort_order), sourceSheetRow: r.__row, driveFileId: drive && drive.fileId || "", driveFileName: "" }; }
function mapCredit_(r) { return { id: r.credit_id, groupId: r.credits_group_id, sectionTitle: r.section_title, role: r.role, name: r.name, message: r.message, imageUrl: normalizeImageUrl_(r.image_drive_url), sortOrder: num_(r.sort_order) }; }
function enabled_(row) { return truthy_(row.enabled); } function sortOrder_(a, b) { return num_(a.sort_order) - num_(b.sort_order); }
function getMedia_(id) { debugInfo_("content.media.lookup", "Looking up media item.", { mediaId: id }); var result = buildContent_().media.filter(function(item) { return item.id === id; })[0]; if (!result) { debugWarn_("content.media.missing", "Media item was not found.", { mediaId: id }); throw apiException_("MEDIA_NOT_FOUND", "The requested media item does not exist."); } debugInfo_("content.media.found", "Media item found.", { mediaId: id, mediaType: result.mediaType }); return result; }
function getCredits_(groupId) { var credits = buildContent_().credits.filter(function(item) { return item.groupId === groupId; }); debugInfo_("content.credits", "Credits group loaded.", { groupId: groupId, count: credits.length }); return credits; }
function validateReferences_(data) { debugDebug_("content.references.start", "Validating content references.", { mediaCount: data.media.length, categoryCount: data.categories.length }); var ids = {}; data.media.forEach(function(item) { if (ids[item.id]) { debugWarn_("content.references.duplicate", "Duplicate media ID detected.", { mediaId: item.id }); throw apiException_("DUPLICATE_ID", "Duplicate media ID: " + item.id); } ids[item.id] = true; }); data.categories.forEach(function(category) { category.mediaIds.forEach(function(id) { if (!ids[id]) { debugWarn_("content.references.invalid", "Category references missing media.", { categoryId: category.id, mediaId: id }); throw apiException_("INVALID_REFERENCE", "Category " + category.id + " references missing media " + id); } }); }); debugInfo_("content.references.complete", "Content references are valid.", { mediaCount: data.media.length, categoryCount: data.categories.length }); }
