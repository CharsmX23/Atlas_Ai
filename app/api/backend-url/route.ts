export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  return Response.json({
    backendUrl: backendUrl ?? null,
    configured: !!backendUrl,
  })
}
