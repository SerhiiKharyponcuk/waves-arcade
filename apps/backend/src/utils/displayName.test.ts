import assert from "node:assert/strict";
import test from "node:test";
import { INVALID_DISPLAY_NAME_MESSAGE, parseDisplayName } from "./displayName.js";

test("display name validation accepts supported names", () => {
  const validNames = [
    "Serhii",
    "Natalia 2026",
    "Player_01",
    "User-123",
    "Test.Name",
    "Марія",
    "Сергій_15"
  ];

  for (const value of validNames) {
    assert.equal(parseDisplayName(value), value.trim());
  }
});

test("display name validation rejects malicious and malformed values", () => {
  const invalidNames = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "\"><script>alert(1)</script>",
    "javascript:alert(1)",
    "admin'--",
    "' OR '1'='1",
    "test'; DROP TABLE users;--",
    "",
    "   ",
    "_________________________________",
    "---------------------------------",
    ".".repeat(33)
  ];

  for (const value of invalidNames) {
    assert.throws(
      () => parseDisplayName(value),
      (error: unknown) =>
        error instanceof Error &&
        "message" in error &&
        error.message === INVALID_DISPLAY_NAME_MESSAGE
    );
  }
});
