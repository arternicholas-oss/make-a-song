// Shim module declarations for packages that don't ship types or where we
// want to keep compile-time coupling loose (e.g. optional server-side deps).
// When the real packages are installed with their types, those take precedence.

declare module 'posthog-js' {
  interface PostHogJS {
    init: (apiKey: string, options?: Record<string, unknown>) => void
    capture: (event: string, properties?: Record<string, unknown>) => void
    identify: (distinctId: string, properties?: Record<string, unknown>) => void
    __loaded?: boolean
  }
  const posthog: PostHogJS
  export default posthog
}

declare module 'posthog-node' {
  export class PostHog {
    constructor(apiKey: string, options?: Record<string, unknown>)
    capture(payload: { distinctId: string; event: string; properties?: Record<string, unknown> }): void
    flush(): Promise<void>
  }
}

declare module 'fluent-ffmpeg' {
  const ffmpeg: any
  export = ffmpeg
}

declare module 'ffmpeg-static' {
  const path: string | null
  export = path
}
