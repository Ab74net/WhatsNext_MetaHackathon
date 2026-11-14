import assert from "node:assert/strict";
import { test } from "node:test";
import { isActiveNavigation } from "./navigation.ts";
test("Memory Web stays active on exported trailing-slash URLs without highlighting My Claim", () => {
  for (const path of ["/claims", "/claims/"]) {
    assert.equal(isActiveNavigation(path, "#memory", "/claims#memory"), true);
    assert.equal(isActiveNavigation(path, "#memory", "/claims"), false);
    assert.equal(isActiveNavigation(path, "", "/claims"), true);
  }
  assert.equal(isActiveNavigation("/agent/", "", "/agent"), true);
  assert.equal(isActiveNavigation("/agent-other", "", "/agent"), false);
  assert.equal(isActiveNavigation("/privacy/", "", "/privacy"), true);
});
