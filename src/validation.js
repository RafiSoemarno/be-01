export function isValidTitle(title) {
  return typeof title === 'string' && title.trim() !== '';
}

export const isBoolean = (v) => typeof v === 'boolean';

export const createRules = { title: isValidTitle };
export const updateRules = { title: isValidTitle, done: isBoolean };

export function validateBody(body, rules, { required = [], requireOne = false } = {}) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body' };
  }
  const keys = Object.keys(body);
  if (keys.some((k) => !(k in rules))) return { error: 'Invalid request body' };
  if (requireOne && keys.length === 0) return { error: 'Invalid request body' };
  if (required.some((k) => !(k in body))) return { error: 'Missing title' };
  if (required.some((k) => !rules[k](body[k]))) return { error: 'Missing title' };
  if (!keys.every((k) => rules[k](body[k]))) return { error: 'Invalid request body' };
  return { body };
}
