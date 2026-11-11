import { currentUser } from "@/lib/auth";
import { readState, demo } from "@/lib/store";
import { view } from "@/lib/domain";
import App from "./peerprobe";
export default async function Page({
  screen = "discover",
  id,
}: {
  screen?: string;
  id?: string;
}) {
  return (
    <App
      initial={view(await readState(), await currentUser(), demo)}
      screen={screen}
      id={id}
    />
  );
}
