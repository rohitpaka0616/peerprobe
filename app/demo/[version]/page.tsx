import Apartment from "./sample";
import { notFound } from "next/navigation";
export default async function Demo({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!["v1", "v2"].includes(version)) notFound();
  return <Apartment fixed={version === "v2"} />;
}
