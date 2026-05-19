import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";
import { runAudit } from "./services/runAudit.js";
import { getAuditCount, incrementAuditCount, subscribeToCountUpdates } from "./services/auditCounter.js";
import { getCooldownSeconds, loadEnv } from "./services/envConfig.js";

loadEnv();

const app = express();
const port = process.env.PORT || 4000;
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const clientDist = path.resolve(currentDirectory, "../../client/dist");

const lastAuditByIp = new Map<string, number>();
const CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes (reduced from 10)
const CLEANUP_SIZE_THRESHOLD = 5000; // Trigger aggressive cleanup if size exceeds this

// Cleanup stale IP entries periodically or when size threshold is exceeded
setInterval(() => {
	const cd = getCooldownSeconds();
	const now = Date.now();
	for (const [ip, timestamp] of lastAuditByIp) {
		if (now - timestamp > cd * 1000 * 2) {
			lastAuditByIp.delete(ip);
		}
	}
	// If size is still large after cleanup, be more aggressive
	if (lastAuditByIp.size > CLEANUP_SIZE_THRESHOLD) {
		const now = Date.now();
		for (const [ip, timestamp] of lastAuditByIp) {
			if (now - timestamp > cd * 1000) {
				lastAuditByIp.delete(ip);
			}
		}
	}
}, CLEANUP_INTERVAL).unref();

function getClientIp(req: express.Request): string {
	return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
		req.socket.remoteAddress ||
		"unknown";
}

function isCoolingDown(ip: string): { coolingDown: true; retryAfter: number } | { coolingDown: false } {
	const cd = getCooldownSeconds();
	if (cd <= 0) return { coolingDown: false };
	const lastTime = lastAuditByIp.get(ip);
	if (!lastTime) return { coolingDown: false };
	const elapsed = (Date.now() - lastTime) / 1000;
	if (elapsed >= cd) return { coolingDown: false };
	return { coolingDown: true, retryAfter: Math.ceil(cd - elapsed) };
}

app.use(express.json({ limit: "32kb" }));
app.use(compression({
	level: 6,
	filter: (req, res) => {
		// Skip compression for Server-Sent Events to avoid buffering
		if (res.getHeader("Content-Type") === "text/event-stream") {
			return false;
		}
		return compression.filter(req, res);
	},
}));

// API endpoints
app.get("/api/audit/count", (_req, res) => {
	res.json({ count: getAuditCount(), cooldownSeconds: getCooldownSeconds() });
});

app.get("/api/audit/count/stream", (req, res) => {
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		"Connection": "keep-alive",
		"X-Accel-Buffering": "no",
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

	req.on("close", () => {
		clearInterval(keepAlive);
	});
});

app.post("/api/audit", async (req, res) => {
	const ip = getClientIp(req);
	const cooldown = isCoolingDown(ip);
	if (cooldown.coolingDown) {
		res.setHeader("X-Retry-After", String(cooldown.retryAfter));
		res.status(429).json({
			error: `Please wait ${cooldown.retryAfter} seconds before running another audit.`,
			retryAfter: cooldown.retryAfter,
		});
		return;
	}

	try {
		const input = req.body?.input;
		const result = await runAudit(input);
		lastAuditByIp.set(ip, Date.now());
		incrementAuditCount();
		res.json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Audit failed";
		res.status(500).json({ error: message });
	}
});

// Static files with caching
app.use(express.static(clientDist, {
	maxAge: '1y',
	immutable: true,
	setHeaders: (res, path) => {
		if (path.endsWith('.html')) {
			res.setHeader('Cache-Control', 'no-cache');
		}
	}
}));

// SPA fallback: serve index.html for any unmatched route
app.use((_req, res) => {
	res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
