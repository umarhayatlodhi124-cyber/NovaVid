// NovaVid AI Studio — Cloudflare Worker Reverse Proxy & Backend Gateway
// Proxies incoming requests to the live Firebase production host: https://novavid-ecfc8.web.app

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Preflight CORS support for API calls
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Health check endpoint for Cloudflare monitoring
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          gateway: "Cloudflare Workers",
          target: "https://novavid-ecfc8.web.app",
          brand: "LODHI TECHX",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const targetUrl = new URL(url.pathname + url.search, "https://novavid-ecfc8.web.app");

    // Preserve headers while adjusting host
    const headers = new Headers(request.headers);
    headers.set("Host", "novavid-ecfc8.web.app");
    headers.set("X-Forwarded-Host", url.hostname);
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    try {
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "follow",
      });

      return await fetch(proxyRequest);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Cloud Gateway Error",
          message: err instanceof Error ? err.message : String(err),
          target: targetUrl.toString(),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  },
};
