/*
  The funnel, one name per step, so every tag tells the same story:
  view_item (tuned a beat) → preview_start → preview_progress 50 / 100 (listened) →
  license_terms_view (opened a license's terms) → store_exit (left for BeatStars with that
  license). These are not called add_to_cart or begin_checkout on purpose: no cart exists
  here, and commerce events stay reserved for BeatStars, where the real cart and order are.
  The store link is opened as a real link so the GA linker can carry the session across.
  Search and filters are logged too, so it shows what people look for and don't find.
*/
type Params = Record<string, string | number | undefined>;
type W = { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; ttq?: { track: (...a: unknown[]) => void } };

const META: Record<string, string> = { view_item: "ViewContent" };
const META_CUSTOM: Record<string, string> = { view_terms: "LicenseTermsView", begin_checkout: "StoreExit", preview_start: "PreviewStart" };
const TIKTOK: Record<string, string> = { view_item: "ViewContent", begin_checkout: "ClickButton" };
const GA: Record<string, string> = { view_terms: "license_terms_view", begin_checkout: "store_exit" };

export function track(event: string, p: Params = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as W;
  const money = typeof p.value === "number" ? { value: p.value, currency: "USD" } : {};
  const item = p.item_id ? { items: [{ item_id: p.item_id, item_name: p.item_name, item_variant: p.license, price: p.value }] } : {};
  try {
    w.gtag?.("event", GA[event] ?? event, { ...p, ...money, ...item });
    if (META_CUSTOM[event]) w.fbq?.("trackCustom", META_CUSTOM[event], { content_ids: p.item_id ? [p.item_id] : undefined, license: p.license, ...money });
    if (META[event]) w.fbq?.("track", META[event], { content_ids: p.item_id ? [p.item_id] : undefined, content_name: p.item_name, content_type: "product", ...money });
    if (TIKTOK[event]) w.ttq?.track(TIKTOK[event], { content_id: p.item_id, content_name: p.item_name, content_type: "product", ...money });
  } catch { /* analytics never breaks the room */ }
}
