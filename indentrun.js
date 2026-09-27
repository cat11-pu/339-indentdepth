// indentrun.js：按处理预算处理事件，用尽的部分压账，收尾不限预算清账
import { pushIndent, depthOf } from "./indent.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function eventCode(spec) { return spec.event_error_code || "E_BAD_EVENT"; }
function indentCode(spec) { return spec.indent_error_code || "E_BAD_INDENT"; }

// 结构校验先做，与预算无关：缩进必须是非负整数之外的结构性问题都报 E_BAD_EVENT。
function validateEvents(spec, events) {
  for (const event of events) {
    const ok = event !== null && typeof event === "object"
      && event.kind === "line"
      && typeof event.indent === "number"
      && Number.isInteger(event.indent);
    if (!ok) fail(eventCode(spec), "bad event");
  }
}

// 把一条事件落到当前缩进栈上：同层留下、更深开层、变浅逐层退回；
// 退不到任何一层或缩进为负，按当前栈报 E_BAD_INDENT。
function settle(spec, stack, indent) {
  if (indent < 0) fail(indentCode(spec), "negative indent");
  const top = stack[stack.length - 1];
  if (indent > top) return pushIndent(stack, indent);
  if (indent === top) return stack;
  const next = stack.slice();
  while (next.length > 0 && next[next.length - 1] > indent) next.pop();
  if (next.length === 0 || next[next.length - 1] !== indent) {
    fail(indentCode(spec), "indent lands on no level");
  }
  return next;
}

export function step(spec) {
  const state = spec.state;
  const events = spec.events || [];
  let remaining = spec.budget || 0;
  validateEvents(spec, events);

  let stack = state.stack.slice();
  const depths = state.depths.slice();
  const applied = state.applied.slice();
  let served = 0;

  // 先还旧账：上一轮压账的事件排在本次新事件之前处理。
  const ledger = [];
  for (const entry of state.ledger) {
    if (remaining > 0) {
      stack = settle(spec, stack, entry[1]);
      depths.push(depthOf(stack));
      applied.push(entry.length > 2 ? entry[2] : entry);
      remaining -= 1;
      served += 1;
    } else {
      ledger.push(entry);
    }
  }

  for (const event of events) {
    if (event.id !== undefined && applied.indexOf(event.id) !== -1) continue;
    if (remaining > 0) {
      stack = settle(spec, stack, event.indent);
      depths.push(depthOf(stack));
      applied.push(event.id !== undefined ? event.id : event);
      remaining -= 1;
      served += 1;
    } else {
      ledger.push(event.id !== undefined
        ? [event.kind, event.indent, event.id]
        : [event.kind, event.indent]);
    }
  }

  return {
    state: { stack: stack, depths: depths, ledger: ledger, applied: applied },
    served: served,
    ledger_before: ledger.length,
    ledger: ledger.map(function (entry) { return [entry[0], entry[1]]; }),
    judged: served,
    judged_bound: state.ledger.length + events.length
  };
}

export function close(spec) {
  const state = spec.state;
  let stack = state.stack.slice();
  const depths = state.depths.slice();
  const applied = state.applied.slice();
  let catchup = 0;
  for (const entry of state.ledger) {
    stack = settle(spec, stack, entry[1]);
    depths.push(depthOf(stack));
    applied.push(entry.length > 2 ? entry[2] : entry);
    catchup += 1;
  }
  return { state: { stack: stack, depths: depths, ledger: [], applied: applied }, catchup: catchup };
}
