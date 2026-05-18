import { redirectProbeClient } from "../services/httpClients.js";
import { assertPublicHttpUrl } from "../services/urlSafety.js";
import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export async function checkHttpsRedirect(
	context: AuditContext,
) {
	const testedUrl = new URL(context.testedUrl);
	testedUrl.protocol = "http:";
	
	try {
		await assertPublicHttpUrl(
			testedUrl,
			"HTTP redirect probe URL",
		);
		const response = await redirectProbeClient.get(
			testedUrl.href,
		);
		const location =
			(response.headers["location"] as string) || "";
		const redirectsToHttps = location
			? new URL(location, testedUrl.href).protocol ===
			"https:"
			: false;
		
		if (
			[301, 308].includes(response.status) &&
			redirectsToHttps
		) {
			return createCheckResult({
				id: "https-redirect",
				label: "HTTPS Redirect",
				category: "Technical",
				status: "pass",
				summary: `HTTP redirects to HTTPS with status ${ response.status }. Recommended 301 or 308.`,
				explanation: `Location header: ${ location }`,
				recommendation:
					"Keep the permanent HTTP to HTTPS redirect in place. Google explicitly uses HTTPS as a Page Experience ranking signal.",
			});
		}
		
		if (
			[302, 307].includes(response.status) &&
			redirectsToHttps
		) {
			return createCheckResult({
				id: "https-redirect",
				label: "HTTPS Redirect",
				category: "Technical",
				status: "warning",
				summary: `HTTP redirects to HTTPS with status ${ response.status }. Recommended 301 or 308.`,
				explanation: `Location header: ${ location }`,
				recommendation:
					"Change the temporary redirect (302/307) to a permanent 301 or 308 redirect from HTTP to HTTPS, passing full link equity to the secure URL.",
			});
		}
		
		return createCheckResult({
			id: "https-redirect",
			label: "HTTPS Redirect",
			category: "Technical",
			status: "fail",
			summary: `HTTP did not redirect to HTTPS with a permanent redirect. Status found: ${ response.status }.`,
			explanation: location
				? `Location header: ${ location }`
				: "No Location header was returned.",
			recommendation:
				"Redirect all HTTP requests to the equivalent HTTPS URL with a 301 permanent redirect. Google prioritizes secure sites and browsers flag HTTP as 'Not Secure'.",
			codeExample: "Apache (.htaccess):\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]\n\nNginx:\nreturn 301 https://$host$request_uri;",
			aiPrompt: `HTTP is not redirecting to HTTPS properly (current status: ${ response.status }). Configure your server to return a 301 permanent redirect from HTTP to HTTPS URLs.`,
		});
	} catch (error) {
		return createCheckResult({
			id: "https-redirect",
			label: "HTTPS Redirect",
			category: "Technical",
			status: "fail",
			summary:
				"The HTTP URL could not be checked for an HTTPS redirect.",
			explanation: `Tested HTTP URL: ${ testedUrl.href }.`,
			recommendation:
				"Ensure your server successfully responds to HTTP requests with a permanent redirect to the HTTPS version of the page.",
			codeExample: "Apache (.htaccess):\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]",
			aiPrompt: "Unable to verify HTTP to HTTPS redirect. Configure your server to redirect all HTTP requests to HTTPS with a 301 permanent redirect.",
		});
	}
}
