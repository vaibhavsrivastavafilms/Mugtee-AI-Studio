export function remotionChromeModeForExecutable(
  browserExecutable: string | null
): 'headless-shell' | 'chrome-for-testing' {
  // @sparticuz/chromium is a full Chromium build; Remotion's headless-shell
  // mode passes --headless=old which modern Chrome rejects.
  return browserExecutable ? 'chrome-for-testing' : 'headless-shell'
}
