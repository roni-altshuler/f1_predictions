import RaceDetailPage from "@/components/RaceDetailPage";

export function generateStaticParams() {
  return Array.from({ length: 24 }, (_, i) => ({
    round: String(i + 1),
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  return <RaceDetailPage round={parseInt(round, 10)} />;
}
