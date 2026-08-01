import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps-script/SetupService.gs", "utf8");

describe("production Sheet protection", () => {
  it("never inserts sample content during initialization and blocks populated workbooks", () => {
    const initialize = source.slice(source.indexOf("function initializeNetflixGiftSheet"), source.indexOf("function applySheetRules_"));
    expect(initialize).not.toContain("insertSampleContent(");
    expect(source).toContain('apiException_("PRODUCTION_DATA_PRESENT"');
  });
});
