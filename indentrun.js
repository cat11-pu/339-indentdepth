// indentrun.js：按处理预算处理并留账（基线：一律给空表）
import { pushIndent, depthOf } from "./indent.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function validateEvents(spec) {
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  for (const event of spec.events || []) {
    if (!event || typeof event !== "object" || event.id === undefined
        || event.kind !== "line" || !Number.isInteger(event.indent)) {
      fail(eventCode, "bad event");
    }
  }
}

function applyEvent(state, event, spec) {
  const indentCode = spec.indent_error_code || "E_BAD_INDENT";
  const indent = event.indent;
  if (indent < 0) fail(indentCode, "negative indent");
  let stack = state.stack.slice();
  if (indent > stack[stack.length - 1]) {
    stack = pushIndent(stack, indent);
  } else if (indent < stack[stack.length - 1]) {
    while (stack.length > 0 && stack[stack.length - 1] > indent) stack.pop();
    if (stack.length === 0 || stack[stack.length - 1] !== indent) {
      fail(indentCode, "indent lands on no layer");
    }
  }
  state.stack = stack;
  state.depths = state.depths.concat([depthOf(stack)]);
  state.applied = state.applied.concat([event.id]);
}

function copyState(state) {
  return {
    stack: (state.stack || []).slice(),
    depths: (state.depths || []).slice(),
    ledger: (state.ledger || []).slice(),
    applied: (state.applied || []).slice()
  };
}

export function step(spec) {
  validateEvents(spec);
  const state = copyState(spec.state || {});
  const appliedSet = new Set(state.applied);
  const fresh = (spec.events || []).filter((event) => !appliedSet.has(event.id));
  const queue = state.ledger.concat(fresh);
  let budget = spec.budget || 0;
  let served = 0;
  const remaining = [];
  for (const event of queue) {
    if (budget > 0) {
      applyEvent(state, event, spec);
      budget -= 1;
      served += 1;
    } else {
      remaining.push(event);
    }
  }
  state.ledger = remaining;
  const judged = served + remaining.length;
  const judged_bound = (spec.events || []).length + (spec.state && spec.state.ledger ? spec.state.ledger.length : 0);
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map((event) => [event.kind, event.indent]),
    judged: judged,
    judged_bound: judged_bound
  };
}

export function close(spec) {
  const state = copyState(spec.state || {});
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const event of pending) {
    applyEvent(state, event, spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
