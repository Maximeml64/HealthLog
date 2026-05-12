// src/utils/asyncMutex.ts

/**
 * Minimal promise-chain mutex. Ensures async tasks queued via `run()`
 * execute strictly one after the other. Used to serialize AsyncStorage
 * writes so concurrent upserts can't read-modify-write each other into
 * data loss.
 *
 * Each task waits for the previous chain link to resolve (whether it
 * succeeded or failed), runs, then becomes the new tail.
 */
export class AsyncMutex {
  private chain: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.chain.then(task, task);
    // Swallow errors so a failing task doesn't poison the chain for the
    // next caller; the original `next` promise still surfaces the error
    // to its caller.
    this.chain = next.catch(() => undefined);
    return next;
  }
}
