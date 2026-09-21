// Runs async tasks with only `limit` in flight at once, rather than firing
// all of them simultaneously. A quiz with several dozen wrong answers used
// to fire that many concurrent save requests at once, and a burst that
// size was enough to make some individual requests get aborted (browser
// per-origin connection limits, a flaky connection, a proxy — the exact
// cause varies, but the failure mode doesn't need to be rare to be worth
// avoiding). Each task's outcome is reported independently via
// PromiseSettledResult rather than letting one failure abort the batch.
export async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        const value = await tasks[i]();
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}
