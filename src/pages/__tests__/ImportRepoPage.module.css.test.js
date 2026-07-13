// Tests for the CSS module changes in ImportRepoPage.module.css.
//
// This project has no existing test framework configured, so these tests
// rely only on Node's built-in test runner (`node --test`) and core modules,
// avoiding the need to introduce new dependencies. Since the change under
// test is a plain CSS module (no executable logic), the tests parse the
// raw stylesheet and assert on the declarations for the rules that were
// modified in this PR: `.repoNameRow` and `.repoName`.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(__dirname, "../ImportRepoPage.module.css");
const css = readFileSync(cssPath, "utf-8");

/**
 * Extracts the declaration block for a given single-class CSS selector,
 * e.g. extractRule(css, "repoName") returns the contents between the
 * braces of `.repoName { ... }`.
 *
 * Uses a negative lookahead on the selector name to avoid matching
 * selectors that merely start with the same prefix (e.g. `.repoNameRow`
 * when looking for `.repoName`).
 */
function extractRule(source, className) {
  const pattern = new RegExp(
    `\\.${className}(?![A-Za-z0-9_-])\\s*\\{([^}]*)\\}`,
    "m"
  );
  const match = source.match(pattern);
  assert.ok(match, `Expected to find a ".${className} { ... }" rule in the CSS file`);
  return match[1];
}

function normalizeDeclarations(block) {
  return block
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean);
}

describe("ImportRepoPage.module.css", () => {
  describe(".repoNameRow rule", () => {
    const block = extractRule(css, "repoNameRow");
    const declarations = normalizeDeclarations(block);

    test("sets flex-wrap to nowrap so the row no longer wraps", () => {
      assert.ok(
        declarations.includes("flex-wrap: nowrap"),
        `Expected "flex-wrap: nowrap" in .repoNameRow, got: ${block}`
      );
    });

    test("does not use the old flex-wrap: wrap value", () => {
      assert.ok(
        !declarations.includes("flex-wrap: wrap"),
        `Did not expect "flex-wrap: wrap" in .repoNameRow, got: ${block}`
      );
    });

    test("sets min-width to 0 to allow child ellipsis truncation within flex layout", () => {
      assert.ok(
        declarations.includes("min-width: 0"),
        `Expected "min-width: 0" in .repoNameRow, got: ${block}`
      );
    });

    test("retains pre-existing layout declarations alongside the new ones", () => {
      assert.ok(declarations.includes("display: flex"));
      assert.ok(declarations.includes("align-items: center"));
      assert.ok(declarations.includes("gap: 8px"));
    });
  });

  describe(".repoName rule", () => {
    const block = extractRule(css, "repoName");
    const declarations = normalizeDeclarations(block);

    test("uses flex: 1 to size responsively within its row", () => {
      assert.ok(
        declarations.includes("flex: 1"),
        `Expected "flex: 1" in .repoName, got: ${block}`
      );
    });

    test("sets min-width to 0 so text-overflow ellipsis can take effect", () => {
      assert.ok(
        declarations.includes("min-width: 0"),
        `Expected "min-width: 0" in .repoName, got: ${block}`
      );
    });

    test("no longer sets a fixed max-width of 200px", () => {
      assert.ok(
        !declarations.some((d) => d.replace(/\s+/g, "") === "max-width:200px"),
        `Did not expect "max-width: 200px" in .repoName, got: ${block}`
      );
      assert.ok(
        !declarations.some((d) => d.startsWith("max-width")),
        `Did not expect any "max-width" declaration in .repoName, got: ${block}`
      );
    });

    test("retains pre-existing text truncation declarations", () => {
      assert.ok(declarations.includes("white-space: nowrap"));
      assert.ok(declarations.includes("overflow: hidden"));
      assert.ok(declarations.includes("text-overflow: ellipsis"));
    });
  });

  describe("regression: rules appear exactly once", () => {
    test(".repoNameRow selector is defined exactly once", () => {
      const matches = css.match(/\.repoNameRow(?![A-Za-z0-9_-])\s*\{/g) || [];
      assert.equal(matches.length, 1);
    });

    test(".repoName selector is defined exactly once", () => {
      const matches = css.match(/\.repoName(?![A-Za-z0-9_-])\s*\{/g) || [];
      assert.equal(matches.length, 1);
    });
  });
});