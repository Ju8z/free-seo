import { utilityClient } from "./httpClients.js";
import { fetchTextWithRedirects } from "./fetchText.js";
import type { RobotsAccessResult, RobotsRule, RobotsTxtResult, } from "../types.js";

export async function fetchRobotsTxt(
	finalUrl: string,
): Promise<RobotsTxtResult> {
	const url = new URL("/robots.txt", finalUrl);
	
	try {
		const response = await fetchTextWithRedirects(url.href, utilityClient, {
			label: "robots.txt URL",
			maxRedirects: 3,
		});
		
		return {
			url: response.url,
			statusCode: response.statusCode,
			found: response.statusCode >= 200 && response.statusCode < 300,
			content:
				response.statusCode >= 200 && response.statusCode < 300
					? response.text
					: "",
			error: null,
		};
	} catch (error) {
		return {
			url: url.href,
			statusCode: null,
			found: false,
			content: "",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export function getSitemapUrlsFromRobots(content: string): string[] {
	return String(content ?? "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => /^sitemap\s*:/i.test(line))
		.map((line) => line.replace(/^sitemap\s*:/i, "").trim())
		.filter(Boolean);
}

export function evaluateRobotsAccess(
	content: string | null | undefined,
	targetUrl: string,
): RobotsAccessResult {
	if (!content) {
		return {
			allowed: true,
			matchingRule: null,
			userAgent: null,
		};
	}
	
	const sections = parseRobotsSections(content);
	const googlebotRules = getRulesForAgent(sections, "googlebot");
	const wildcardRules = getRulesForAgent(sections, "*");
	const selectedAgent =
		googlebotRules.length > 0 ? "googlebot" : "*";
	const selectedRules =
		googlebotRules.length > 0 ? googlebotRules : wildcardRules;
	const path = buildRobotsPath(targetUrl);
	const matchingRule = findBestRule(selectedRules, path);
	
	if (!matchingRule) {
		return {
			allowed: true,
			matchingRule: null,
			userAgent: selectedAgent,
		};
	}
	
	return {
		allowed: matchingRule.directive !== "disallow",
		matchingRule,
		userAgent: selectedAgent,
	};
}

interface RobotsSection {
	agents: string[];
	rules: RobotsRule[];
}

interface RobotsRuleWithLength extends RobotsRule {
	matchLength: number;
}

function parseRobotsSections(content: string): RobotsSection[] {
	const sections: RobotsSection[] = [];
	let currentSection: RobotsSection | null = null;
	
	for (const rawLine of String(content).split(/\r?\n/)) {
		const line = rawLine.replace(/#.*/, "").trim();
		if (!line.includes(":")) {
			continue;
		}
		
		const colonIndex = line.indexOf(":");
		const key = line.slice(0, colonIndex).trim().toLowerCase();
		const value = line.slice(colonIndex + 1).trim();
		
		if (key === "user-agent") {
			if (!currentSection || currentSection.rules.length > 0) {
				currentSection = { agents: [], rules: [] };
				sections.push(currentSection);
			}
			
			currentSection.agents.push(value.toLowerCase());
			continue;
		}
		
		if (!currentSection || !["allow", "disallow"].includes(key)) {
			continue;
		}
		
		currentSection.rules.push({
			directive: key as "allow" | "disallow",
			path: value,
			raw: `${ key }: ${ value }`,
		});
	}
	
	return sections;
}

function getRulesForAgent(
	sections: RobotsSection[],
	agent: string,
): RobotsRule[] {
	return sections
		.filter((section) => section.agents.includes(agent))
		.flatMap((section) => section.rules);
}

function buildRobotsPath(targetUrl: string): string {
	const url = new URL(targetUrl);
	return `${ url.pathname || "/" }${ url.search || "" }`;
}

function findBestRule(
	rules: RobotsRule[],
	path: string,
): RobotsRule | null {
	const matchingRules: RobotsRuleWithLength[] = rules
		.filter((rule) => rule.path !== "")
		.map((rule) => ({
			...rule,
			matchLength: getRuleMatchLength(rule.path, path),
		}))
		.filter((rule) => rule.matchLength >= 0)
		.sort((left, right) => {
			if (right.matchLength !== left.matchLength) {
				return right.matchLength - left.matchLength;
			}
			
			if (left.directive === right.directive) {
				return 0;
			}
			
			return left.directive === "allow" ? -1 : 1;
		});
	
	return matchingRules[0] || null;
}

function getRuleMatchLength(
	rulePath: string,
	targetPath: string,
): number {
	if (!rulePath.includes("*") && !rulePath.endsWith("$")) {
		return targetPath.startsWith(rulePath) ? rulePath.length : -1;
	}
	
	const escaped = rulePath
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\\\$$/, "$");
	const pattern = new RegExp(`^${ escaped }`);
	
	return pattern.test(targetPath)
		? rulePath.replace(/[*$]/g, "").length
		: -1;
}
