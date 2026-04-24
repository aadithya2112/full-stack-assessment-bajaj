import { getIdentityFromEnv, processBfhlData } from "@/lib/bfhl";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!isDataRequest(body)) {
    return Response.json(
      { error: 'Request body must be an object with a "data" array.' },
      { status: 400, headers: corsHeaders },
    );
  }

  return Response.json(processBfhlData(body.data, getIdentityFromEnv()), {
    headers: corsHeaders,
  });
}

function isDataRequest(body: unknown): body is { data: unknown[] } {
  return (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    Array.isArray((body as { data?: unknown }).data)
  );
}
