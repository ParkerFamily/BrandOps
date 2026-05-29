const KEY = "brandops_onboarded";
const COOKIE = "brandops_ob";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setCookie(value: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

function getCookieValue(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface OnboardingData {
  accountType: string;
  goal: string;
  platforms: string[];
  budget: string;
  niches: string[];
  teamSize: string;
  turnaround: string;
  completedAt?: string;
  [key: string]: unknown;
}

export function setOnboarded(data: OnboardingData) {
  const json = JSON.stringify(data);
  try { localStorage.setItem(KEY, json); } catch { /* quota */ }
  setCookie(json);
}

export function getOnboarded(): OnboardingData | null {
  try {
    const ls = localStorage.getItem(KEY);
    if (ls) {
      const parsed = JSON.parse(ls);
      // backfill cookie in case it was missing
      setCookie(ls);
      return parsed;
    }
  } catch { /* parse error */ }
  // fallback to cookie
  try {
    const ck = getCookieValue();
    if (ck) {
      const parsed = JSON.parse(ck);
      // restore localStorage while we're at it
      try { localStorage.setItem(KEY, ck); } catch { /* quota */ }
      return parsed;
    }
  } catch { /* parse error */ }
  return null;
}

export function clearOnboarded() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
}
