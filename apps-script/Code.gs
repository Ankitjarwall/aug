function doGet(e) {
  var request = e && e.parameter || {};
  var action = request.action || "health";
  startDebugExecution_(action, "GET", { parameters: request });
  return handleRequest_(action, request, false);
}

function doPost(e) {
  var rawBody = e && e.postData && e.postData.contents || "{}";
  startDebugExecution_("post", "POST", { contentLength: rawBody.length });
  var body = {};
  try {
    debugDebug_("request.parse.start", "Parsing POST JSON body.", { contentLength: rawBody.length });
    body = JSON.parse(rawBody);
    DEBUG_CONTEXT_.action = body.action || "unknown";
    debugInfo_("request.parse.complete", "POST JSON body parsed.", { action: body.action, visitorId: body.visitorId, payloadKeys: Object.keys(body.payload || {}) });
  } catch (error) {
    debugError_("request.parse.error", "POST body is not valid JSON.", error, { contentLength: rawBody.length });
    finishDebugExecution_(false, { code: "INVALID_JSON" });
    return jsonError_("INVALID_JSON", "The request body is not valid JSON.", {});
  }
  return handleRequest_(body.action, body, true);
}

function handleRequest_(action, request, isPost) {
  var startedAt = Date.now();
  try {
    debugInfo_("request.validate", "Validating API action.", { action: action, method: isPost ? "POST" : "GET", visitorId: request.visitorId });
    if ((isPost ? ALLOWED_POST : ALLOWED_GET).indexOf(action) < 0) throw apiException_("UNKNOWN_ACTION", "This API action is not available.");
    var data;
    debugInfo_("request.route", "Routing API action.", { action: action });
    if (action === "health") data = { status: "ok" };
    else if (action === "bootstrap" || action === "content") data = debugStage_("route.bootstrap", function() { return getBootstrap_(request.visitorId || ""); });
    else if (action === "media") data = debugStage_("route.media", function() { return getMedia_(request.mediaId || ""); }, { mediaId: request.mediaId });
    else if (action === "credits") data = debugStage_("route.credits", function() { return getCredits_(request.groupId || "main-credits"); }, { groupId: request.groupId });
    else if (action === "state") data = debugStage_("route.state", function() { return getUserState_(request.visitorId || ""); }, { visitorId: request.visitorId });
    else if (action === "validateMedia") data = debugStage_("route.validateMedia", function() { return validateAllMedia(); });
    else if (action === "createSession") data = debugStage_("route.createSession", function() { return createSession_(request.visitorId); }, { visitorId: request.visitorId });
    else {
      debugStage_("security.session", function() { verifyWrite_(request); }, { visitorId: request.visitorId });
      debugStage_("security.rateLimit", function() { enforceRateLimit_(request.visitorId, action); }, { visitorId: request.visitorId, action: action });
      if (["saveState", "savePlayback", "toggleLike", "toggleFavourite"].indexOf(action) >= 0) data = debugStage_("route.saveState", function() { return saveUserState_(request.visitorId, request.payload || {}, action); }, { mediaId: request.payload && request.payload.mediaId });
      else if (action === "logEvent") data = debugStage_("route.logEvent", function() { return logEvent_(request.visitorId, request.payload || {}); }, { eventType: request.payload && request.payload.eventType });
      else data = debugStage_("route.refreshCache", function() { clearContentCache_(); return { cleared: true }; });
    }
    debugInfo_("request.success", "API action completed successfully.", { action: action, durationMs: Date.now() - startedAt, response: summarizeResponse_(data) });
    finishDebugExecution_(true, { action: action, durationMs: Date.now() - startedAt });
    return jsonSuccess_(data);
  } catch (error) {
    debugError_("request.error", "API action failed.", error, { action: action, durationMs: Date.now() - startedAt });
    finishDebugExecution_(false, { action: action, code: error.code || "INTERNAL_ERROR", durationMs: Date.now() - startedAt });
    return jsonError_(error.code || "INTERNAL_ERROR", error.code ? error.message : "The service could not complete this request.", error.details || {});
  }
}

function jsonSuccess_(data) {
  var c = getConfig_();
  var envelope = { ok: true, data: data, meta: { apiVersion: c.apiVersion, generatedAt: nowIso_(), contentVersion: getContentVersion_(), requestId: DEBUG_CONTEXT_.requestId }, error: null };
  debugDebug_("response.serialize", "Serializing success response.", { response: summarizeResponse_(data) });
  return ContentService.createTextOutput(JSON.stringify(envelope)).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(code, message, details) {
  var envelope = { ok: false, data: null, meta: { apiVersion: NETFLIX_GIFT_CONFIG.API_VERSION, generatedAt: nowIso_(), contentVersion: getContentVersion_(), requestId: DEBUG_CONTEXT_.requestId }, error: { code: code, message: message, details: details || {} } };
  debugWarn_("response.serialize", "Serializing error response.", { code: code, message: message });
  return ContentService.createTextOutput(JSON.stringify(envelope)).setMimeType(ContentService.MimeType.JSON);
}

function apiException_(code, message, details) { var error = new Error(message); error.code = code; error.details = details || {}; return error; }

function createSession_(visitorId) {
  debugDebug_("session.create.validate", "Validating visitor ID for a new session.", { visitorId: visitorId });
  if (!/^visitor_[a-f0-9-]{20,}$/i.test(String(visitorId || ""))) throw apiException_("INVALID_VISITOR", "The visitor ID is invalid.");
  var config = getConfig_();
  if (!config.secret || config.secret.length < 20) throw apiException_("CONFIGURATION_ERROR", "APP_SECRET must contain at least 20 characters.");
  var expiresAt = Date.now() + 3600000;
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({ visitorId: visitorId, expiresAt: expiresAt })).replace(/=+$/, "");
  var signature = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, config.secret)).replace(/=+$/, "");
  debugInfo_("session.create.complete", "Signed session token created.", { visitorId: visitorId, expiresAt: new Date(expiresAt).toISOString() });
  return { sessionToken: payload + "." + signature, sessionExpiresAt: expiresAt };
}

function verifyWrite_(request) {
  debugDebug_("session.verify.start", "Verifying signed write session.", { visitorId: request.visitorId, hasToken: Boolean(request.sessionToken) });
  var parts = String(request.sessionToken || "").split(".");
  if (parts.length !== 2) throw apiException_("INVALID_SESSION", "A valid session token is required.");
  var expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], getConfig_().secret)).replace(/=+$/, "");
  if (!constantTimeEqual_(parts[1], expected)) throw apiException_("INVALID_SESSION", "The session signature is invalid.");
  var payload;
  try { payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); }
  catch (error) { debugError_("session.verify.decode", "Session payload decoding failed.", error, {}); throw apiException_("INVALID_SESSION", "The session payload is invalid."); }
  if (payload.expiresAt <= Date.now()) throw apiException_("SESSION_EXPIRED", "The session has expired. Refresh the page.");
  if (payload.visitorId !== request.visitorId) throw apiException_("INVALID_SESSION", "The session does not match this visitor.");
  debugInfo_("session.verify.complete", "Signed write session verified.", { visitorId: request.visitorId, expiresAt: new Date(payload.expiresAt).toISOString() });
}

function constantTimeEqual_(a, b) { if (a.length !== b.length) return false; var result = 0; for (var i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }

function enforceRateLimit_(visitorId, action) {
  var c = getConfig_(), cache = CacheService.getScriptCache(), key = "rate:" + visitorId + ":" + action, count = Number(cache.get(key) || 0) + 1;
  debugDebug_("rateLimit.check", "Checking write rate limit.", { visitorId: visitorId, action: action, count: count, maximum: c.maxWrites, windowSeconds: c.rateSeconds });
  if (count > c.maxWrites) { debugWarn_("rateLimit.rejected", "Write rate limit exceeded.", { visitorId: visitorId, action: action, count: count, maximum: c.maxWrites }); throw apiException_("RATE_LIMITED", "Too many updates were sent. Please wait a moment."); }
  cache.put(key, String(count), c.rateSeconds);
}

function summarizeResponse_(data) {
  if (Array.isArray(data)) return { type: "array", count: data.length };
  if (!data || typeof data !== "object") return { type: typeof data };
  var summary = { type: "object", keys: Object.keys(data).slice(0, 20) };
  ["media", "categories", "credits", "userState", "mediaIssues"].forEach(function(key) { if (Array.isArray(data[key])) summary[key + "Count"] = data[key].length; });
  return summary;
}