const measurementId = import.meta.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __gaInitialized?: boolean;
  }
}

export const isGoogleAnalyticsEnabled = Boolean(measurementId);

function canTrackAnalytics() {
  return Boolean(measurementId && typeof window !== 'undefined' && window.gtag);
}

export function initGoogleAnalytics() {
  if (!measurementId || typeof window === 'undefined' || window.__gaInitialized) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-ga-loader="true"]');
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.gaLoader = 'true';
    document.head.appendChild(script);
  }

  // In an SPA we send page views explicitly so analytics only records them when the app is mounted.
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
  window.__gaInitialized = true;
}

export function trackPageView(params: AnalyticsParams = {}) {
  if (!canTrackAnalytics()) {
    return;
  }

  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`,
    ...params,
  });
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (!canTrackAnalytics()) {
    return;
  }

  window.gtag?.('event', eventName, params);
}
