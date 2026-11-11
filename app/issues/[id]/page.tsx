import Page from "@/components/page";
export const dynamic = "force-dynamic";
export default async function Screen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Page screen="issue" id={(await params).id} />;
}
