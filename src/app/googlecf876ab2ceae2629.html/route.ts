/** Google Search Console HTML-file ownership verification. */
export function GET() {
  const body = "google-site-verification: googlecf876ab2ceae2629.html\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
