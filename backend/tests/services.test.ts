import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { initDatabase, closeDatabase, getDatabase } from "../src/config/database.js";
import { ensureDataDirectories } from "../src/utils/storage.js";
import { voiceService } from "../src/services/voice.service.js";
import { speechService } from "../src/services/speech.service.js";

describe("VoiceForge Backend Core Services", () => {
  before(() => {
    ensureDataDirectories();
    initDatabase();
  });

  after(() => {
    closeDatabase();
  });

  it("should initialize database tables correctly", () => {
    const db = getDatabase();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    assert.ok(tableNames.includes("voices"), "voices table exists");
    assert.ok(tableNames.includes("generations"), "generations table exists");
  });

  it("should list voices", () => {
    const voices = voiceService.list();
    assert.ok(Array.isArray(voices));
  });

  it("should get initial dashboard counts", () => {
    const counts = speechService.getCounts();
    assert.strictEqual(typeof counts.totalVoices, "number");
    assert.strictEqual(typeof counts.totalGenerations, "number");
  });

  it("should return paginated history", () => {
    const history = speechService.getHistory(1, 10);
    assert.ok(Array.isArray(history.generations));
    assert.strictEqual(history.page, 1);
    assert.strictEqual(history.limit, 10);
  });
});
