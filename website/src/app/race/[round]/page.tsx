import RaceDetailPage from "@/components/RaceDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  return <RaceDetailPage round={parseInt(round, 10)} />;
}
