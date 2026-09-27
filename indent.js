// indent.js：缩进栈操作
export function pushIndent(stack, indent) {
  const top = stack[stack.length - 1];
  if (indent > top) return stack.concat([indent]);
  return stack;
}

export function depthOf(stack) {
  return stack.length - 1;
}
