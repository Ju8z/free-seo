import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react(), apiPlugin()],
	build: {
		minify: 'esbuild',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
						return 'react-vendor';
					}
					if (id.includes('ResultsView')) {
						return 'results';
					}
				}
			}
		},
		cssCodeSplit: true,
		chunkSizeWarningLimit: 500
	}
});

function getClientIp(req: IncomingMessage): string {
	return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
		req.socket.remoteAddress ||
		"unknown";
}

const lastAuditByIp = new Map<string, number>();

function apiPlugin() {
	return {
		name: "api",
		configureServer(server: ViteDevServer) {
			server.middlewares.use("/api/audit", async (req: IncomingMessage, res: ServerResponse) => {
				const { getCooldownSeconds, loadEnv } = await import("../server/src/services/envConfig.js");
				loadEnv();
				const cooldown = getCooldownSeconds();

				// SSE stream for real-time audit count
				if (req.method === "GET" && (req.url === "/count/stream" || req.url === "/count/stream/")) {
					const { getAuditCount, subscribeToCountUpdates } = await import("../server/src/services/auditCounter.js");
					res.writeHead(200, {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
					});
					res.write(`data: ${JSON.stringify({ count: getAuditCount() })}\n\n`);
					subscribeToCountUpdates(res);
					const keepAlive = setInterval(() => {
						try {
							res.write(":ping\n\n");
						} catch {
							clearInterval(keepAlive);
						}
					}, 30000);
					req.on("close", () => clearInterval(keepAlive));
					return;
				}

				if (req.method === "GET" && (req.url === "/count" || req.url === "/count/")) {
					const { getAuditCount } = await import("../server/src/services/auditCounter.js");
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ count: getAuditCount(), cooldownSeconds: cooldown }));
					return;
				}

				if (req.method === "POST") {
					// Rate limiting check
					if (cooldown > 0) {
						const ip = getClientIp(req);
						const lastTime = lastAuditByIp.get(ip);
						if (lastTime) {
							const elapsed = (Date.now() - lastTime) / 1000;
							if (elapsed < cooldown) {
								const retryAfter = Math.ceil(cooldown - elapsed);
								res.statusCode = 429;
								res.setHeader("X-Retry-After", String(retryAfter));
								res.setHeader("Content-Type", "application/json");
								res.end(JSON.stringify({
									error: `Please wait ${retryAfter} seconds before running another audit.`,
									retryAfter,
								}));
								return;
							}
						}
					}

					let body = "";
					for await (const chunk of req) body += chunk;
					try {
						const { runAudit } = await import("../server/src/services/runAudit.js");
						const { incrementAuditCount } = await import("../server/src/services/auditCounter.js");
						const { normalizeAuditCategoryIds } = await import("../server/src/types.js");
						const payload = JSON.parse(body);
						const categories = normalizeAuditCategoryIds(payload.categories);
						if (categories.length === 0) {
							res.statusCode = 400;
							res.setHeader("Content-Type", "application/json");
							res.end(JSON.stringify({ error: "Select at least one test category." }));
							return;
						}
						const result = await runAudit(payload.input, categories);
						if (cooldown > 0) {
							lastAuditByIp.set(getClientIp(req), Date.now());
						}
						incrementAuditCount();
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify(result));
					} catch (err) {
						const message = err instanceof Error
							? err.message
							: "The audit could not be completed.";
						res.statusCode = 500;
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ error: message }));
					}
				}
			});
		},
	};
}
