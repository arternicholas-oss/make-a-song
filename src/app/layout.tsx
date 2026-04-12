import type { Metadata } from 'next'
import './globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://make-a-song.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'Make a Song About You — Personalized AI Song Lyrics',
  description: 'Answer a few questions about someone you love. We\'ll write them a song that could only ever be about them.',
  openGraph: {
    title: 'Make a Song About You',
    description: 'A personalized song written just for them. In under 60 seconds.',
    images: [`${BASE_URL}/og-image.png`],
    url: BASE_URL,
    siteName: 'Make a Song About You',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Make a Song About You',
    description: 'A personalized song written just for them. In under 60 seconds.',
    images: [`${BASE_URL}/og-image.png`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap"
        />
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(\".\");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement(\"script\")).type=\"text/javascript\",p.crossOrigin=\"anonymous\",p.async=!0,p.src=s.api_host.replace(\".i.posthog.com\",\"-assets.i.posthog.com\")+\"/static/array.js\",(r=t.getElementsByTagName(\"script\")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a=\"posthog\",u.people=u.people||[],u.toString=function(t){var e=\"posthog\";return\"posthog\"!==a&&(e+=\".\"+a),t||(e+=\" (stub)\"),e},u.people.toString=function(){return u.toString(1)+\".people (stub)\"},o=\"init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug\".split(\" \"),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {
                  api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'}',
                  person_profiles: 'identified_only',
                });
              `,
            }}
          />
        )}
      </head>
      <body className="bg-cream min-h-screen font-sans">{children}</body>
    </html>
  )
}
