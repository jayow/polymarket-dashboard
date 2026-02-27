'use client'

import Script from 'next/script'

interface GoogleAnalyticsProps {
  measurementId?: string
}

const GA_ID_RE = /^G-[A-Z0-9]+$/

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  if (!measurementId || !GA_ID_RE.test(measurementId)) {
    return null
  }

  return (
    <>
      {/* Google Analytics */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

