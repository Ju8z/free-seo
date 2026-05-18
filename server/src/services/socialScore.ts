import type { AuditContext, SocialCheckItem, SocialResultsReport } from "../types.js";
import {
	detectAllSocialLinks,
	detectOpenGraphTags,
	detectFacebookPixel,
	detectXCardTags,
} from "./socialDetect.js";
import { utilityClient } from "./httpClients.js";

export function calculateSocialScore(items: SocialCheckItem[]): {
	score: number;
	availableWeight: number;
	passedChecks: number;
	totalChecks: number;
} {
	const totalChecks = items.length;
	const available = items.filter(
		(item) =>
			item.status !== "unavailable" && item.weight > 0,
	);
	const availableWeight = available.reduce(
		(total, item) => total + item.weight,
		0,
	);

	if (availableWeight === 0) {
		return {
			score: 100,
			availableWeight: 0,
			passedChecks: 0,
			totalChecks,
		};
	}

	const earnedWeight = available.reduce(
		(total, item) =>
			total +
			item.weight *
				(item.status === "pass"
					? 1
					: item.status === "warning"
						? 0.6
						: 0),
		0,
	);

	const passedChecks = available.filter(
		(item) => item.status !== "fail",
	).length;

	return {
		score: Math.round((earnedWeight / availableWeight) * 100),
		availableWeight,
		passedChecks,
		totalChecks,
	};
}

export async function buildSocialResultsReport(
	context: AuditContext,
): Promise<SocialResultsReport> {
	const allLinks = detectAllSocialLinks(context);
	const fbPageLink = allLinks.facebookResult;
	const ogTags = detectOpenGraphTags(context);
	const fbPixel = detectFacebookPixel(context);
	const xAccount = allLinks.xResult;
	const xCards = detectXCardTags(context);
	const instagram = allLinks.instagramResult;
	const linkedIn = allLinks.linkedinResult;
	const youtube = allLinks.youtubeResult;

	const items: SocialCheckItem[] = [];

	items.push({
		key: "facebook-page-linked",
		label: "Facebook Page Linked",
		status: fbPageLink.found ? "pass" : "fail",
		score: fbPageLink.found ? 100 : 0,
		weight: 10,
		message: fbPageLink.found
			? "Your page has a link to a Facebook Page."
			: "No associated Facebook Page found as a link on your page.",
		detectedUrl: fbPageLink.url ?? undefined,
	});

	items.push({
		key: "facebook-open-graph",
		label: "Facebook Open Graph Tags",
		status: ogTags.status,
		score: ogTags.status === "pass" ? 100 : ogTags.status === "warning" ? 60 : 0,
		weight: 20,
		message:
			ogTags.status === "pass"
				? "Facebook Open Graph Tags were found on your page."
				: ogTags.status === "warning"
					? "Some Facebook Open Graph Tags were found, but important tags are missing."
					: "We have not found Facebook Open Graph Tags on your page.",
		helpText:
			"Open Graph tags control how this page appears when shared on Facebook, including the title, description, and preview image.",
		details:
			ogTags.status !== "pass"
				? ogTags.missing.map(
						(tag) => `Missing: ${tag}`,
					)
				: undefined,
	});

	items.push({
		key: "facebook-pixel",
		label: "Facebook Pixel",
		status: fbPixel.found ? "pass" : "fail",
		score: fbPixel.found ? 100 : 0,
		weight: 10,
		message: fbPixel.found
			? "A Facebook Pixel was detected on your page."
			: "We have not detected a Facebook Pixel on your page.",
		helpText:
			"The Meta Pixel enables visitor retargeting and conversion tracking for Meta Ads campaigns.",
	});

	items.push({
		key: "x-account-linked",
		label: "X Account Linked",
		status: xAccount.found ? "pass" : "fail",
		score: xAccount.found ? 100 : 0,
		weight: 10,
		message: xAccount.found
			? "Your page links to an X profile."
			: "No associated X Profile found as a link on your page.",
		detectedUrl: xAccount.url ?? undefined,
	});

	items.push({
		key: "x-cards",
		label: "X Cards",
		status: xCards.status,
		score: xCards.status === "pass" ? 100 : xCards.status === "warning" ? 60 : 0,
		weight: 15,
		message:
			xCards.status === "pass"
				? "X Cards were detected on your page."
				: xCards.status === "warning"
					? "Some X Card tags were found, but important tags are missing."
					: "We have not detected X Cards on your page.",
		helpText:
			"X Card tags control the card type, title, description, and image shown when this page is shared on X.",
		details:
			xCards.status !== "pass"
				? xCards.missing.map((tag) => `Missing: ${tag}`)
				: undefined,
	});

	items.push({
		key: "instagram-linked",
		label: "Instagram Linked",
		status: instagram.found ? "pass" : "fail",
		score: instagram.found ? 100 : 0,
		weight: 10,
		message: instagram.found
			? "Your page links to an Instagram profile."
			: "No associated Instagram Profile found linked on your page.",
		detectedUrl: instagram.url ?? undefined,
	});

	items.push({
		key: "linkedin-page-linked",
		label: "LinkedIn Page Linked",
		status: linkedIn.found ? "pass" : "fail",
		score: linkedIn.found ? 100 : 0,
		weight: 10,
		message: linkedIn.found
			? "Your page links to a LinkedIn page."
			: "No associated LinkedIn Profile found linked on your page.",
		detectedUrl: linkedIn.url ?? undefined,
	});

	const youtubeChannel: SocialCheckItem = {
		key: "youtube-channel-linked",
		label: "YouTube Channel Linked",
		status: youtube.found ? "pass" : "fail",
		score: youtube.found ? 100 : 0,
		weight: 5,
		message: youtube.found
			? "Your page has a link to a YouTube Channel."
			: "No associated YouTube Channel found linked on your page.",
		detectedUrl: youtube.url ?? undefined,
	};
	items.push(youtubeChannel);

	if (youtube.found && youtube.url) {
		const activity = await fetchYouTubeChannelActivity(youtube.url);
		if (activity) {
			items.push({
				key: "youtube-channel-activity",
				label: "YouTube Channel Activity",
				status: "pass",
				score: 100,
				weight: 10,
				message:
					"You have a good number of YouTube Channel subscribers (Followers) and views.",
				metrics: {
					subscribers: activity.subscribers,
					views: activity.views,
				},
			});
		} else {
			items.push({
				key: "youtube-channel-activity",
				label: "YouTube Channel Activity",
				status: "unavailable",
				score: 100,
				weight: 0,
				message:
					"A YouTube Channel was found, but activity metrics could not be retrieved.",
			});
		}
	} else {
		items.push({
			key: "youtube-channel-activity",
			label: "YouTube Channel Activity",
			status: "unavailable",
			score: 100,
			weight: 0,
			message:
				"No YouTube activity could be evaluated because no YouTube Channel link was found.",
		});
	}

	const scoring = calculateSocialScore(items);
	const availableWeight = scoring.availableWeight;
	const earnedWeight = availableWeight > 0
		? Math.round((scoring.score / 100) * availableWeight)
		: 0;

	const summary = `${scoring.passedChecks} of ${scoring.totalChecks} checks passed`;

	const statusSummary = {
		pass: 0,
		warning: 0,
		fail: 0,
		unavailable: 0,
	};
	for (const item of items) {
		if (item.status === "pass") statusSummary.pass++;
		else if (item.status === "warning") statusSummary.warning++;
		else if (item.status === "fail") statusSummary.fail++;
		else if (item.status === "unavailable") statusSummary.unavailable++;
	}

	return {
		score: scoring.score,
		availableWeight,
		earnedWeight,
		passedChecks: scoring.passedChecks,
		totalChecks: scoring.totalChecks,
		summary,
		items,
		statusSummary,
	};
}

interface YouTubeChannelActivity {
	subscribers: number | null;
	views: number | null;
}

async function fetchYouTubeChannelActivity(
	channelUrl: string,
): Promise<YouTubeChannelActivity | null> {
	try {
		const response = await utilityClient.get(channelUrl, {
			timeout: 10000,
			maxRedirects: 5,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				"Accept-Language": "en-US,en;q=0.9",
			},
		});
		const html = typeof response.data === "string" ? response.data : "";

		if (!html || html.length < 1000) return null;

		let subscribers: number | null = null;
		let views: number | null = null;

		const subMatch = html.match(
			/"subscriberCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/,
		);
		if (subMatch) {
			subscribers = parseCount(subMatch[1]!);
		}

		const viewMatch = html.match(
			/"viewCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/,
		);
		if (viewMatch) {
			views = parseCount(viewMatch[1]!);
		}

		// Early return only if BOTH subscriber and view counts are already found

		const ytDataMatch = html.match(/var ytInitialData\s*=\s*(\{.+?\});/s);
		if (ytDataMatch) {
			const data = JSON.parse(ytDataMatch[1]!);
			const header =
				data?.header?.c4TabbedHeaderRenderer ||
				data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
			if (header) {
				// Try legacy subscriberCountText/viewCountText fields
				if (!subscribers) {
					const subText =
						header.subscriberCountText?.simpleText ||
						header.subscriberCountText?.runs?.[0]?.text ||
						"";
					subscribers = parseCount(subText);
				}
				if (!views) {
					const viewText =
						header.viewCountText?.simpleText ||
						header.viewCountText?.runs?.[0]?.text ||
						"";
					views = parseCount(viewText);
				}
			}
			
			// Newer YouTube structure: metadata.contentMetadataViewModel.metadataRows
			const pvm = data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
			const metadataRows =
				pvm?.metadata?.contentMetadataViewModel?.metadataRows;
			if (metadataRows) {
				for (const row of metadataRows) {
					if (row?.metadataParts) {
						for (const part of row.metadataParts) {
							const text = part?.text?.content || "";
							const label = part?.text?.accessibilityLabel || "";
							// e.g. "505K subscribers" or "505 thousand subscribers" for subscribers
							// e.g. "763,485 views" for views
							if (!subscribers && /subscriber/i.test(text + label)) {
								subscribers = parseCount(text);
							}
							if (!views && /view/i.test(text) && !/subscriber/i.test(text)) {
								views = parseCount(text);
							}
						}
					}
				}
			}
		}

		if (subscribers !== null || views !== null) {
			return { subscribers, views };
		}

		return null;
	} catch (err) {
		console.error(
			`YouTube channel activity fetch failed for ${channelUrl}:`,
			err instanceof Error ? err.message : err,
		);
		return null;
	}
}

function parseCount(text: string): number | null {
	if (!text) return null;
	const cleaned = text.replace(/,/g, "").replace(/\s/g, "");
	if (/^\d+$/.test(cleaned)) {
		return parseInt(cleaned, 10);
	}
	// Try number + K/M/B suffix (e.g. "505K", "2.5M", "505Ksubscribers")
	const multMatch = cleaned.match(/^([\d.]+)([KMB])/i);
	if (multMatch) {
		const value = parseFloat(multMatch[1]!);
		const unit = multMatch[2]!.toUpperCase();
		if (unit === "K") return Math.round(value * 1000);
		if (unit === "M") return Math.round(value * 1000000);
		if (unit === "B") return Math.round(value * 1000000000);
	}
	// Try just a leading number (e.g. "763485views")
	const justNumber = cleaned.match(/^([\d.]+)/);
	if (justNumber) {
		return parseInt(justNumber[1]!, 10);
	}
	return null;
}
