import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../data",
);

const COUNTER_FILE = path.join(DATA_DIR, "audit-count.json");

function ensureDir() {
	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}
}

function readCount(): number {
	try {
		if (existsSync(COUNTER_FILE)) {
			const raw = readFileSync(COUNTER_FILE, "utf-8");
			const parsed = JSON.parse(raw) as { count: number };
			if (typeof parsed.count === "number") return parsed.count;
		}
	} catch {
		// corrupted file — start fresh
	}
	return 0;
}

function writeCount(count: number): void {
	ensureDir();
	writeFileSync(COUNTER_FILE, JSON.stringify({ count }), "utf-8");
}

let cachedCount: number | null = null;
const listeners = new Set<ServerResponse>();
let pendingWrite = false;

function notifyListeners(): void {
	if (cachedCount === null) return;
	const data = `data: ${JSON.stringify({ count: cachedCount })}\n\n`;
	for (const res of listeners) {
		try {
			res.write(data);
		} catch {
			listeners.delete(res);
		}
	}
}

export function subscribeToCountUpdates(res: ServerResponse): void {
	listeners.add(res);
	const cleanup = () => listeners.delete(res);
	res.on("close", cleanup);
	res.on("error", cleanup);
}

export function getAuditCount(): number {
	if (cachedCount === null) {
		cachedCount = readCount();
		// Ensure the data directory and file exist on first read
		ensureDir();
		if (!existsSync(COUNTER_FILE)) {
			writeFileSync(COUNTER_FILE, JSON.stringify({ count: cachedCount }), "utf-8");
		}
	}
	return cachedCount;
}

export function incrementAuditCount(): number {
	if (cachedCount === null) {
		cachedCount = readCount();
	}
	cachedCount++;
	
	// Batch disk writes every 5 seconds instead of on every audit
	if (!pendingWrite) {
		pendingWrite = true;
		setTimeout(() => {
			writeCount(cachedCount!);
			pendingWrite = false;
		}, 5000);
	}
	
	notifyListeners();
	return cachedCount;
}
