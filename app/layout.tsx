import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = 'https://demosim.tsilva.eu/';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}#website`,
    name: 'Portugal 2100 Simulator',
    url: siteUrl,
    description: 'Interactive demographic and economic simulator for Portugal\'s future population structure from 2026 to 2100.',
    inLanguage: 'en',
    image: `${siteUrl}og-image.png`,
    author: {
      '@type': 'Person',
      name: 'Tiago Silva',
      url: 'https://www.tsilva.eu',
    },
    publisher: {
      '@type': 'Person',
      name: 'Tiago Silva',
      url: 'https://www.tsilva.eu',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${siteUrl}#webapp`,
    name: 'Portugal 2100 Simulator',
    url: siteUrl,
    description: 'Run Eurostat-based simulations for Portugal\'s population, aging, fertility, migration, social security, and healthcare burden through 2100.',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    image: `${siteUrl}og-image.png`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    creator: {
      '@type': 'Person',
      name: 'Tiago Silva',
      url: 'https://www.tsilva.eu',
    },
    sameAs: ['https://github.com/tsilva/demosim'],
    featureList: [
      'Population pyramid projection from 2026 to 2100',
      'Scenario presets for fertility, migration, and mortality',
      'Economic outputs for social security and healthcare burden',
      'Interactive year-by-year simulation controls',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${siteUrl}#dataset`,
    name: 'Portugal demographic simulation baseline inputs',
    url: siteUrl,
    description: 'INE revised 2026 population stock, Eurostat demographic rates, and EUROPOP2025 projection assumptions used by the simulator.',
    creator: {
      '@type': 'Person',
      name: 'Tiago Silva',
      url: 'https://www.tsilva.eu',
    },
    license: 'https://opensource.org/licenses/MIT',
    isBasedOn: [
      {
        '@type': 'Dataset',
        name: 'Eurostat demographic and population statistics',
      },
    ],
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Portugal 2100 Simulator | Demographics, Aging, Migration, and Economic Pressure',
  description: 'What happens to Portugal if births stay low, migration rises, or retirement shifts later? Run INE- and Eurostat-based 2026-2100 population and economic projections in one interactive simulator.',
  applicationName: 'Portugal 2100 Simulator',
  authors: [{ name: 'Tiago Silva' }],
  keywords: [
    'Portugal demographics',
    'Portugal population projection',
    'Portugal 2100',
    'population simulator',
    'demographic projection',
    'Eurostat',
    'aging population',
    'fertility rates',
    'migration scenarios',
    'dependency ratio',
    'social security',
    'healthcare costs',
  ],
  referrer: 'strict-origin-when-cross-origin',
  alternates: {
    canonical: '/',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    title: 'Portugal 2100 Simulator',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Can Portugal Avoid Demographic Decline by 2100?',
    description: 'Adjust fertility, migration, and retirement age to see Portugal\'s population pyramid and fiscal pressure change in real time.',
    siteName: 'Portugal 2100 Simulator',
    locale: 'en_GB',
    alternateLocale: 'pt_PT',
    images: [
      {
        url: `${siteUrl}og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Portugal 2100 Simulator preview with demographic and economic projection branding.',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Can Portugal Avoid Demographic Decline by 2100?',
    description: 'Run Eurostat-based simulations for Portugal\'s population, aging, migration, and economic sustainability through 2100.',
    images: [`${siteUrl}og-image.png`],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020617',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
