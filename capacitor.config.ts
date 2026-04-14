import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for "Make a Song About You"
 *
 * Strategy: Remote-first WebView wrapper.
 *   - server.url points at the production site, so any Vercel deploy is
 *     instantly live in the native app with no re-submission to the stores.
 *   - A custom scheme + allowNavigation list keeps Stripe Checkout, Supabase
 *     storage, and the *.vercel.app preview domains navigable inside the shell.
 *   - androidScheme 'https' + iosScheme 'makeasong' matches what the
 *     Universal Links / App Links association files declare under /.well-known.
 *
 * If you ever want to ship an offline bundle instead, comment out `server.url`
 * and point `webDir` at the `out/` folder produced by `next build && next export`.
 */
const config: CapacitorConfig = {
  appId: 'com.makeasongaboutyou.app',
  appName: 'Make a Song About You',
  webDir: 'public', // only used when server.url is unset; kept so `cap sync` succeeds

  server: {
    // Remote-first — the native app loads the live site.
    url: 'https://makeasongaboutyou.com',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'makeasong',
    // These domains are allowed for in-app navigation.
    allowNavigation: [
      'makeasongaboutyou.com',
      '*.makeasongaboutyou.com',
      'checkout.stripe.com',
      'js.stripe.com',
      'hooks.stripe.com',
      '*.supabase.co',
      '*.vercel.app',
    ],
  },

  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#FFF6E8',
  },

  android: {
    backgroundColor: '#FFF6E8',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FFF6E8',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#EF6A60',
      overlaysWebView: false,
    },
    App: {
      // Intercept universal-link opens so deep links route inside the WebView.
      launchUrl: 'https://makeasongaboutyou.com',
    },
  },
};

export default config;
