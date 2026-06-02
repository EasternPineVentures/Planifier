import { getHeadlineTapeSnapshot } from "@/lib/news/rss";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  const snapshot = await getHeadlineTapeSnapshot();

  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
