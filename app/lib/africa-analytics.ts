export const AFRICA_MEASUREMENT_ID = "G-1CYWE8YPL2";
const scriptId = "africa-google-analytics";

type AnalyticsWindow = Window & {
  dataLayer?: IArguments[];
  gtag?: (...parameters: unknown[]) => void;
};

export function initializeAfricaAnalytics(browser: AnalyticsWindow) {
  if (browser.location.origin !== "https://kudihub.xyz") return;
  if (browser.document.getElementById(scriptId)) return;

  browser.dataLayer ??= [];
  browser.gtag = function () {
    // Google tag's command queue expects an Arguments object.
    // eslint-disable-next-line prefer-rest-params
    browser.dataLayer!.push(arguments);
  };
  browser.gtag("js", new Date());
  browser.gtag("config", AFRICA_MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = browser.document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${AFRICA_MEASUREMENT_ID}`;
  browser.document.head.appendChild(script);
}
