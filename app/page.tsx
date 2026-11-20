import Room from "@/components/Room";
import { BEATS } from "@/lib/beats";

export default function Home() {
  return <Room beats={BEATS} entry="home" initial={null} />;
}
