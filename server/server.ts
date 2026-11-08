// NovaVid AI Studio — Standalone Production Backend HTTP Server
// Native Node.js HTTP Service with CORS, Rate Limiting, and Modular Routing.

import * as http from "node:http";
import { BackendApiRouter, type ApiRequest } from "./apiRouter";
import { InMemorySaaSCloudDatabase } from "../cloud/database";

export class NovaVidServer {
  private server: http.Server | null = null;
  private router: BackendApiRouter;
  private requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(router?: BackendApiRouter) {
    this.router = router || new BackendApiRouter(new InMemorySaaSCloudDatabase());
  }

  /**
   * Rate limiting: 100 requests per minute per IP.
   */
  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = this.requestCounts.get(ip);
    if (!entry || now > entry.resetTime) {
      this.requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
      return true;
    }
    if (entry.count >= 100) {
      return false;
    }
    entry.count++;
    return true;
  }

  public listen(port: number = 3001): Promise<http.Server> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        const clientIp = req.socket.remoteAddress || "127.0.0.1";

        // 1. CORS Headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-signature, x-billing-provider, stripe-signature, paddle-signature");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        // 2. Rate Limiting Check
        if (!this.checkRateLimit(clientIp)) {
          res.writeHead(429, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Rate limit exceeded. Maximum 100 requests per minute." }));
          return;
        }

        // 3. Body Gathering with 5 MB Limit
        let bodyBuffer = "";
        let bodySize = 0;
        const MAX_BODY_BYTES = 5 * 1024 * 1024;

        req.on("data", (chunk) => {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_BYTES) {
            res.writeHead(413, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Payload too large. Max 5 MB." }));
            req.destroy();
            return;
          }
          bodyBuffer += chunk;
        });

        req.on("end", async () => {
          let parsedBody: any = undefined;
          if (bodyBuffer) {
            try {
              parsedBody = JSON.parse(bodyBuffer);
            } catch {
              parsedBody = bodyBuffer;
            }
          }

          const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
          const apiReq: ApiRequest = {
            method: req.method || "GET",
            path: url.pathname,
            headers: req.headers as Record<string, string | undefined>,
            body: parsedBody,
          };

          try {
            const apiRes = await this.router.handleRequest(apiReq);
            res.writeHead(apiRes.status, { "Content-Type": "application/json", ...(apiRes.headers || {}) });
            res.end(JSON.stringify(apiRes.body));
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error", message: msg }));
          }
        });
      });

      this.server.listen(port, () => {
        resolve(this.server!);
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  }
}

// Runnable entry point if executed directly via Node
if (typeof process !== "undefined" && process.argv && process.argv[1]?.endsWith("server.ts")) {
  const server = new NovaVidServer();
  const port = Number(process.env.PORT) || 3001;
  server.listen(port).then(() => {
    console.log(`[NovaVid AI] Production Backend API listening on http://localhost:${port}`);
  });
}
