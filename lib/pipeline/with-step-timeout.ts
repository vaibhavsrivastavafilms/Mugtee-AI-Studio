export class StepTimeoutError extends Error {
  readonly stepName: string
  readonly timeoutMs: number

  constructor(stepName: string, timeoutMs: number) {
    super(`[TIMEOUT] ${stepName}`)
    this.name = 'StepTimeoutError'
    this.stepName = stepName
    this.timeoutMs = timeoutMs
  }
}

/** Reject with `[TIMEOUT] stepName` if the promise does not settle in time. */
export function withStepTimeout<T>(
  stepName: string,
  promise: Promise<T>,
  timeoutMs = 60_000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new StepTimeoutError(stepName, timeoutMs)),
      timeoutMs
    )
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}
