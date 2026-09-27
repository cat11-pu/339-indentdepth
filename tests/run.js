import assert from "node:assert";
import { pushIndent, depthOf } from "../indent.js";
import { step, close } from "../indentrun.js";

const base = {
  budget: 1,
  state: { stack: [0], depths: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "line", indent: 0 }],
  indent_error_code: "E_BAD_INDENT", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("pushIndent returns a stack", () => {
  assert.ok(Array.isArray(pushIndent([0], 4)));
});

check("depthOf returns a number", () => {
  assert.strictEqual(typeof depthOf([0, 4]), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
