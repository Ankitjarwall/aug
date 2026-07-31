function onOpen() {
  startDebugExecution_("onOpen", "sheet-trigger", {});
  try {
    debugInfo_("menu.create.start", "Creating Netflix Gift Sheet menu.", {});
    SpreadsheetApp.getUi().createMenu("Netflix Gift")
      .addItem("Initialize or Repair Sheets", "initializeNetflixGiftSheet").addItem("Insert Sample Content", "insertSampleContent")
      .addSeparator().addItem("Validate All Media", "validateAllMedia").addItem("Clear Content Cache", "clearContentCache")
      .addItem("View Last Validation", "viewLastValidation").addItem("Rebuild Content Version", "rebuildContentVersion")
      .addSeparator().addItem("Show Setup Instructions", "showSetupInstructions").addToUi();
    debugInfo_("menu.create.complete", "Netflix Gift Sheet menu created.", { itemCount: 7 });
    finishDebugExecution_(true, { operation: "onOpen" });
  } catch (error) {
    debugError_("menu.create.error", "Could not create Netflix Gift Sheet menu.", error, {});
    finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" });
    throw error;
  }
}

function viewLastValidation() {
  startDebugExecution_("viewLastValidation", "editor", {});
  try {
    var ss = spreadsheet_(), sheet = ss.getSheetByName("ValidationLog");
    debugInfo_("validation.view", "Opening ValidationLog tab.", { lastRow: sheet.getLastRow(), lastColumn: sheet.getLastColumn() });
    ss.setActiveSheet(sheet);
    if (sheet.getLastRow() > 1) sheet.setActiveRange(sheet.getRange(sheet.getLastRow(), 1, 1, sheet.getLastColumn()));
    finishDebugExecution_(true, { lastRow: sheet.getLastRow() });
  } catch (error) { debugError_("validation.view.error", "Could not open ValidationLog tab.", error, {}); finishDebugExecution_(false, { code: error.code || "INTERNAL_ERROR" }); throw error; }
}

function showSetupInstructions() {
  startDebugExecution_("showSetupInstructions", "editor", {});
  debugInfo_("setup.instructions", "Showing setup instructions.", {});
  SpreadsheetApp.getUi().alert("1. Configuration is at the top of Config.gs. When this script is bound to the Sheet, leave SHEET_ID blank.\n2. Run setupNetflixGift() once.\n3. Replace demo paths with public Drive links.\n4. Run Validate All Media.\n5. Deploy as a Web App: execute as you, access anyone.\n6. Use the /exec URL in NEXT_PUBLIC_APPS_SCRIPT_URL.\n\nDebug logs: Apps Script editor > Executions > select a run > Logs.");
  finishDebugExecution_(true, { operation: "showSetupInstructions" });
}