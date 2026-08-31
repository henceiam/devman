import type { WayfinderTicket } from "../api/client";
import WayfinderList from "./WayfinderList";

export default function WayfinderTab({ tickets }: { tickets: WayfinderTicket[] }) {
  return <WayfinderList tickets={tickets} />;
}
