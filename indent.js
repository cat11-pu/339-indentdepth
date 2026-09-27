// indent.js：缩进栈操作（基线：一律原样返回）
export function pushIndent(stack, indent) {
  if (indent > stack[stack.length - 1]) return stack.concat([indent]);
  return stack;
}

export function depthOf(stack) {
  return stack.length - 1;
}
