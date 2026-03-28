import * as Sentry from "@sentry/nextjs"

export const logger = {
  error(message: string, error?: unknown) {
    console.error(message, error)
    if (error instanceof Error) {
      Sentry.captureException(error)
    }
  },
  warn(message: string, ...args: unknown[]) {
    console.warn(message, ...args)
  },
  info(message: string, ...args: unknown[]) {
    console.info(message, ...args)
  },
}
