/**
 * Helper function; true if title is non-empty string, else false.
 * @param {string} title - task title to validate
 * @returns {boolean}
 */
export function isValidTitle(title) {
  if (typeof title == "string" && title.trim() !== "") return true;
  return false;
}

/**
 * Helper function; true if done is boolean, else false.
 * @param {boolean} done - task done flag to validate
 * @returns {boolean}
 */
export function isValidDone(done) {
  if (typeof done == "boolean") return true;
  return false;
}
