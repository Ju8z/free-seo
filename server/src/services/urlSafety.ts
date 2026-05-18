import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { createPublicError } from "./errors.js";

interface DnsCacheEntry {
	promise: Promise<string[]>;
	timestamp: number;
}

const dnsCache = new Map<string, DnsCacheEntry>();
const DNS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Cleanup stale DNS cache entries every 15 minutes
setInterval(() => {
	const now = Date.now();
	for (const [hostname, entry] of dnsCache) {
		if (now - entry.timestamp > DNS_CACHE_TTL) {
			dnsCache.delete(hostname);
		}
	}
}, 15 * 60 * 1000).unref();

const blockedHostnames: Set<string> = new Set([
	"localhost",
	"localhost.localdomain",
]);

const blockedSuffixes: string[] = [
	".localhost",
	".local",
	".internal",
	".home",
	".lan",
	".test",
	".invalid",
];

export async function assertPublicHttpUrl(
	urlValue: string | URL,
	label = "URL",
): Promise<URL> {
	let parsedUrl: URL;
	try {
		parsedUrl =
			urlValue instanceof URL ? new URL(urlValue.href) : new URL(urlValue);
	} catch {
		throw createPublicError(400, `${ label } is not a valid URL.`);
	}
	
	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		throw createPublicError(400, `${ label } must use http or https.`);
	}
	
	if (parsedUrl.username || parsedUrl.password) {
		throw createPublicError(400, `${ label } must not contain credentials.`);
	}
	
	const hostname = parsedUrl.hostname.toLowerCase();
	if (isBlockedHostname(hostname)) {
		throw createPublicError(
			400,
			`${ label } points to a private or internal host.`,
		);
	}
	
	const addresses = await resolveHostAddresses(hostname);
	if (addresses.length === 0) {
		throw createPublicError(400, `${ label } could not be resolved.`);
	}
	
	const unsafeAddress = addresses.find(
		(address) => !isPublicIpAddress(address),
	);
	if (unsafeAddress) {
		throw createPublicError(
			400,
			`${ label } resolves to a private or internal address.`,
		);
	}
	
	return parsedUrl;
}

function isBlockedHostname(hostname: string): boolean {
	if (blockedHostnames.has(hostname)) {
		return true;
	}
	
	if (blockedSuffixes.some((suffix) => hostname.endsWith(suffix))) {
		return true;
	}
	
	if (!ipaddr.isValid(hostname) && !hostname.includes(".")) {
		return true;
	}
	
	return false;
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
	if (ipaddr.isValid(hostname)) {
		return [hostname];
	}
	
	const cached = dnsCache.get(hostname);
	if (cached && Date.now() - cached.timestamp < DNS_CACHE_TTL) {
		return cached.promise;
	}
	
	const promise = dns.lookup(hostname, { all: true, verbatim: true })
		.then((results) => results.map((result) => result.address))
		.catch((error) => {
			dnsCache.delete(hostname);
			throw createPublicError(400, "The host could not be resolved.", error);
		});
	
	dnsCache.set(hostname, { promise, timestamp: Date.now() });
	return promise;
}

function isPublicIpAddress(address: string): boolean {
	try {
		const parsedAddress = ipaddr.parse(address);
		return parsedAddress.range() === "unicast";
	} catch {
		return false;
	}
}
