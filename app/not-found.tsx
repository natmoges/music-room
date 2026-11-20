import Room from "@/components/Room";
import { BEATS } from "@/lib/beats";

// Dead air. The 404 is the room with lost signal, and a jump back in.
export const metadata = { title: "Lost signal", robots: { index: false } };

export default function NotFound() {
  return <Room beats={BEATS} entry="beat" initial={null} lost />;
}
