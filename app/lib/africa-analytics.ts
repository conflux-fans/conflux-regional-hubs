export const AFRICA_MEASUREMENT_ID = "G-1CYWE8YPL2";
const disableKey = "ga-disable-G-1CYWE8YPL2";
const scriptId = "africa-google-analytics";

type AnalyticsWindow = Window & {
  dataLayer?: IArguments[];
  gtag?: (...parameters: unknown[]) => void;
  [disableKey]?: boolean;
};

// Keep attribution and pagination, without forwarding arbitrary form/query data.
const publicParameters = ["region", "page", "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content", "gclid", "dclid", "gbraid", "wbraid"];

export function africaAnalyticsLocation(href: string): string | null {
  const url = new URL(href);
  if (url.origin !== "https://kudihub.xyz") return null;
  const region = url.searchParams.get("region");
  if (region && region !== "africa") return null;
  if (!["/", "/journal", "/insights", "/stake"].includes(url.pathname) && !url.pathname.startsWith("/journal/")) return null;

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (!publicParameters.includes(key)) url.searchParams.delete(key);
  }
  return url.href;
}

function publicReferrer(referrer: string): string {
  if (!referrer) return "";
  const url = new URL(referrer);
  return url.origin + url.pathname;
}

export function createAfricaPageTracker(browser: AnalyticsWindow) {
  let previousLocation: string | null = null;

  return function trackPage() {
    const location = africaAnalyticsLocation(browser.location.href);
    browser[disableKey] = !location;
    if (!location) {
      previousLocation = null;
      return;
    }

    if (!browser.document.getElementById(scriptId)) {
      browser.dataLayer ??= [];
      browser.gtag = function () {
        // Google tag's command queue expects an Arguments object.
        // eslint-disable-next-line prefer-rest-params
        browser.dataLayer!.push(arguments);
      };
      browser.gtag("js", new Date());
      browser.gtag("config", AFRICA_MEASUREMENT_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: location,
        page_referrer: publicReferrer(browser.document.referrer),
      });
      const script = browser.document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${AFRICA_MEASUREMENT_ID}`;
      browser.document.head.appendChild(script);
    }

    // Effects can run twice in StrictMode; count each navigation once.
    if (location === previousLocation) return;
    browser.gtag?.("event", "page_view", {
      send_to: AFRICA_MEASUREMENT_ID,
      page_location: location,
      page_title: browser.document.title,
      page_referrer: previousLocation ?? publicReferrer(browser.document.referrer),
    });
    previousLocation = location;
  };
}
