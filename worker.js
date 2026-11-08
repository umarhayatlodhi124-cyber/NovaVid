// NovaVid AI Studio — Cloudflare Worker Reverse Proxy & Backend Gateway
// Proxies incoming requests to the live Firebase production host: https://novavid-ecfc8.web.app

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, "https://novavid-ecfc8.web.app");

    // Preserve headers while adjusting host
    const headers = new Headers(request.headers);
    headers.set("Host", "novavid-ecfc8.web.app");
    headers.set("X-Forwarded-Host", url.hostname);
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "follow",
    });

    return fetch(proxyRequest);
  },
};
