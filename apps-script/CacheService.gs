function refreshContentCache() {
  var ownsContext = !DEBUG_CONTEXT_.requestId;
  if (ownsContext) startDebugExecution_("refreshContentCache", "editor", {});
  var startedAt = Date.now();
  try {
    debugInfo_("cache.refresh.start", "Refreshing bootstrap content cache.", {});
    var version = clearContentCache_();
    var content = getBootstrap_("");
    debugInfo_("cache.refresh.complete", "Bootstrap content cache refreshed.", { contentVersion: version, mediaCount: content.media.length, categoryCount: content.categories.length, durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(true, { contentVersion: version });
    SpreadsheetApp.getUi().alert("Content cache refreshed.");
  } catch (error) {
    debugError_("cache.refresh.error", "Content cache refresh failed.", error, { durationMs: Date.now() - startedAt });
    if (ownsContext) finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}