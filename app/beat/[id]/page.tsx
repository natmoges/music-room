import type { Metadata } from "next";
import Room from "@/components/Room";
import { BEATS, artUrl, findBeat, readTitle } from "@/lib/catalog";

// Every beat answers at two addresses: /beat/<id> (the YouTube links) and
// /beat/<slug>-<id> (the BeatStars links). Both are written out at build time.
export function generateStaticParams() {
  return BEATS.flatMap((b) => [{ id: b.id }, { id: `${b.slug}-${b.id}` }]);
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const beat = findBeat((await params).id);
  if (!beat) return { title: "Lost signal" };
  const { name, after } = readTitle(beat.title);
  return {
    title: name,
    description: `${name}${after ? ` · ${after}` : ""}. ${beat.free ? "Free download" : "Lease it"} from NatFromThisPlanet, Philadelphia 215.`,
    alternates: { canonical: `/beat/${beat.id}` },
    openGraph: { images: beat.art ? [artUrl(beat)] : [] },
  };
}

export default async function BeatPage({ params }: { params: Promise<{ id: string }> }) {
  const beat = findBeat((await params).id) ?? null;
  return <Room beats={BEATS} entry="beat" initial={beat} lost={!beat} />;
}
