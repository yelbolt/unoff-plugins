// Unexpected errors reach the user through the existing POST_MESSAGE pattern
// (UI side shows the notification and reports to Sentry). Never swallowed,
// never thrown — a throw in a Canvas handler would crash the sandbox.
export const surfaceError = (error: unknown): void => {
  penpot.ui.sendMessage({
    type: 'POST_MESSAGE',
    data: {
      type: 'ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  })
}
