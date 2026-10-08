/**
 * Monotonic integer id allocator.
 *
 * Ids are owned entirely by the server and are never reused, not even after a
 * task is deleted. Allocation starts above the highest id in the seed so new
 * tasks never collide with seeded ones.
 */
export function createIdAllocator(startAt = 0) {
  let current = startAt;
  return {
    /** @returns {number} the next free id and advances the cursor. */
    next() {
      current += 1;
      return current;
    },
    /** @returns {number} the most recently allocated id without advancing. */
    peek() {
      return current;
    },
  };
}
