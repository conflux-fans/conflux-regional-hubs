import { redirect } from "next/navigation";
import { resolveRegion } from "../regional";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  redirect(`/journal?region=${resolveRegion(params.region)}`);
}
