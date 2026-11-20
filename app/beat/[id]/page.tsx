import type { Metadata } from "next";
import Room from "@/components/Room";
import { ALL_BEATS, BEATS, findBeat } from "@/lib/beats";
import { artUrl, readTitle, storeUrl } from "@/lib/catalog";
import { licensesFor } from "@/lib/licenses";
import { SITE } from "@/lib/site";

// Every beat answers at two addresses: /beat/<id> (the YouTube links) and
// /beat/<slug>-<id> (the BeatStars links). Both are written for every beat BeatStars has,
// so an unlisted video's link still opens the room; a beat that isn't up shows lost signal.
export function generateStaticParams() {
  return ALL_BEATS.flatMap((b) => [{ id: b.id }, { id: `${b.slug}-${b.id}` }]);
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const beat = findBeat((await params).id);
  // An address that isn't a beat in the room: say so to search engines too.
  if (!beat) return { title: "Lost signal", robots: { index: false, follow: true } };
  const { name, after } = readTitle(beat.title);
  return {
    title: name,
    description: `${name}${after ? ` · ${after}` : ""}. ${beat.free ? "Free download" : "Lease it"} from NatFromThisPlanet, Philadelphia 215.`,
    alternates: { canonical: `/beat/${beat.id}` },
    openGraph: { type: "music.song", images: beat.art ? [artUrl(beat)] : [], audio: beat.preview ? [new URL(beat.preview, SITE).toString()] : undefined },
    twitter: { card: "summary_large_image", images: beat.art ? [artUrl(beat)] : [] },
  };
}

export default async function BeatPage({ params }: { params: Promise<{ id: string }> }) {
  const beat = findBeat((await params).id) ?? null;
  if (!beat) return <Room beats={BEATS} entry="beat" initial={null} lost />;
  const { name, after } = readTitle(beat.title);
  // What search engines read: the beat as a recording, with its leases as offers.
  const ld = {
    "@context": "https://schema.org", "@type": "MusicRecording", name, description: after || undefined,
    url: `${SITE}/beat/${beat.id}`, image: beat.art ? artUrl(beat) : undefined,
    byArtist: { "@type": "MusicGroup", name: "NatFromThisPlanet", url: SITE },
    audio: beat.preview ? { "@type": "AudioObject", contentUrl: new URL(beat.preview, SITE).toString(), encodingFormat: "audio/mpeg" } : undefined,
    offers: beat.free ? { "@type": "Offer", price: 0, priceCurrency: "USD", url: storeUrl(beat) }
      : licensesFor(beat.licenses).filter((l) => l.price !== null).map((l) => ({ "@type": "Offer", name: l.name, price: l.price, priceCurrency: "USD", url: storeUrl(beat) })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Room beats={BEATS} entry="beat" initial={beat} lost={false} />
    </>
  );
}
