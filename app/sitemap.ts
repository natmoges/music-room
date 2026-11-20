import type { MetadataRoute } from "next";
import { BEATS } from "@/lib/beats";
import { SITE } from "@/lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE }, ...BEATS.map((b) => ({ url: `${SITE}/beat/${b.id}` }))];
}
