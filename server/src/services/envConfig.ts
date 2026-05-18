import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve project root from this file's location
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");

export function loadEnv(): void {
	const envPath = path.join(projectRoot, ".env");
	if (!existsSync(envPath)) return;

	const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim();
		const value = trimmed.slice(eqIndex + 1).trim();
		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

export function getCooldownSeconds(): number {
	const value = process.env.AUDIT_SPAM_PROTECTION;
	if (!value || value === "null") return 5;
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;
}

export function getMaxHttpSockets(): number {
	const value = process.env.HTTP_MAX_SOCKETS;
	if (!value) return 25;
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

export function getMaxFreeHttpSockets(): number {
	const value = process.env.HTTP_MAX_FREE_SOCKETS;
	if (!value) return 10;
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export function getMaxBrowsers(): number {
	const value = process.env.PLAYWRIGHT_MAX_BROWSERS;
	if (!value) return 3;
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export function getBrowserIdleTimeout(): number {
	const value = process.env.PLAYWRIGHT_IDLE_TIMEOUT;
	if (!value) return 5 * 60 * 1000; // 5 minutes default
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
}
