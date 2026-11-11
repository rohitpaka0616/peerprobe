import Page from "@/components/page";
export const dynamic = "force-dynamic";
export default async function Screen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Page screen="workspace" id={(await params).id} />;
}
