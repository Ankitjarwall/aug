var DEBUG_CONTEXT_ = { requestId: "", action: "", startedAt: 0 };
var DEBUG_LEVELS_ = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

function startDebugExecution_(action, transport, details) {
  DEBUG_CONTEXT_ = { requestId: Utilities.getUuid(), action: action || "unknown", startedAt: Date.now() };
  debugInfo_("execution.start", "Execution started.", { transport: transport, request: details || {} });
  return DEBUG_CONTEXT_.requestId;
}

function finishDebugExecution_(ok, details) {
  debugLog_(ok ? "INFO" : "ERROR", "execution.finish", ok ? "Execution completed." : "Execution failed.", details || {});
}

function debugStage_(stage, callback, details) {
  var startedAt = Date.now();
  debugDebug_(stage + ".start", "Stage started.", details || {});
  try {
    var result = callback();
    debugInfo_(stage + ".complete", "Stage completed.", { durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    debugError_(stage + ".error", "Stage failed.", error, { durationMs: Date.now() - startedAt });
    throw error;
  }
}

function debugDebug_(stage, message, data) { debugLog_("DEBUG", stage, message, data); }
function debugInfo_(stage, message, data) { debugLog_("INFO", stage, message, data); }
function debugWarn_(stage, message, data) { debugLog_("WARN", stage, message, data); }
function debugError_(stage, message, error, data) {
  var details = data || {};
  details.error = errorToDebug_(error);
  debugLog_("ERROR", stage, message, details);
}

function debugLog_(level, stage, message, data) {
  if (typeof NETFLIX_GIFT_CONFIG !== "undefined" && NETFLIX_GIFT_CONFIG.DEBUG_ENABLED === false) return;
  var configured = typeof NETFLIX_GIFT_CONFIG !== "undefined" ? NETFLIX_GIFT_CONFIG.DEBUG_LEVEL || "INFO" : "INFO";
  if ((DEBUG_LEVELS_[level] || 20) < (DEBUG_LEVELS_[configured] || 20)) return;
  var entry = {
    app: "netflix-gift",
    timestamp: new Date().toISOString(),
    level: level,
    requestId: DEBUG_CONTEXT_.requestId || "manual-" + Utilities.getUuid(),
    action: DEBUG_CONTEXT_.action || "manual",
    stage: stage,
    elapsedMs: DEBUG_CONTEXT_.startedAt ? Date.now() - DEBUG_CONTEXT_.startedAt : 0,
    message: message,
    data: sanitizeDebugData_(data || {}, 0)
  };
  var line;
  try { line = JSON.stringify(entry); } catch (error) { line = JSON.stringify({ level: "ERROR", stage: "logger.serialize", message: error.message }); }
  if (level === "ERROR") console.error(line);
  else if (level === "WARN") console.warn(line);
  else console.log(line);
}

function sanitizeDebugData_(value, depth, key) {
  if (depth > 4) return "[depth-limited]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return errorToDebug_(value);
  if (typeof value === "string") {
    if (/secret|token|authorization|password/i.test(key || "")) return "[redacted]";
    if ((key || "").toLowerCase().indexOf("visitor") >= 0) return maskIdentifier_(value);
    return value.length > 500 ? value.slice(0, 500) + "...[truncated]" : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map(function(item) { return sanitizeDebugData_(item, depth + 1, key); });
  if (typeof value === "object") {
    var output = {};
    Object.keys(value).slice(0, 40).forEach(function(childKey) {
      output[childKey] = sanitizeDebugData_(value[childKey], depth + 1, childKey);
    });
    return output;
  }
  return String(value);
}

function errorToDebug_(error) {
  return {
    name: error && error.name || "Error",
    code: error && error.code || "INTERNAL_ERROR",
    message: error && error.message || String(error),
    stack: error && error.stack ? String(error.stack).slice(0, 4000) : ""
  };
}

function maskIdentifier_(value) {
  var text = String(value || "");
  if (text.length <= 10) return "[masked]";
  return text.slice(0, 8) + "..." + text.slice(-4);
}
