/** Exhaustive switch helper — call in default branch of discriminated unions. */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${String(value)}`)
}
