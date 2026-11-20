/*
  The funnel, one name per step, so every tag tells the same story:
  view_item (tuned a beat) → preview_start → preview_progress 50 / 100 (listened) →
  view_terms (opened a license's terms, GA add_to_cart) → begin_checkout (left for BeatStars
  with that license). The purchase itself happens on BeatStars, which carries the same GA4,
  Meta and TikTok tags; the GA linker and the utm tags on the store link join the two halves.
  Search and filters are logged too, so it shows what people look for and don't find.
*/
type Params = Record<string, string | number | undefined>;
type W = { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; ttq?: { track: (...a: unknown[]) => void } };

const META: Record<string, string> = { view_item: "ViewContent", view_terms: "AddToCart", begin_checkout: "InitiateCheckout" };
const TIKTOK: Record<string, string> = { view_item: "ViewContent", view_terms: "AddToCart", begin_checkout: "InitiateCheckout" };
const GA: Record<string, string> = { view_terms: "add_to_cart" };

export function track(event: string, p: Params = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as W;
  const money = typeof p.value === "number" ? { value: p.value, currency: "USD" } : {};
  const item = p.item_id ? { items: [{ item_id: p.item_id, item_name: p.item_name, item_variant: p.license, price: p.value }] } : {};
  try {
    w.gtag?.("event", GA[event] ?? event, { ...p, ...money, ...item });
    if (META[event]) w.fbq?.("track", META[event], { content_ids: p.item_id ? [p.item_id] : undefined, content_name: p.item_name, content_type: "product", ...money });
    if (TIKTOK[event]) w.ttq?.track(TIKTOK[event], { content_id: p.item_id, content_name: p.item_name, content_type: "product", ...money });
  } catch { /* analytics never breaks the room */ }
}
