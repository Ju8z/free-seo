import { pageFetchClient } from "../services/httpClients.js";
import { fetchTextWithRedirects } from "../services/fetchText.js";
import { createCheckResult } from "../utils/checkResult.js";
import type { AuditContext } from "../types.js";

export async function checkSslEnabled(
	context: AuditContext,
) {
	const finalUrl = new URL(context.finalUrl);
	const httpsUrl = new URL(context.finalUrl);
	httpsUrl.protocol = "https:";
	
	if (finalUrl.protocol === "https:") {
		return createCheckResult({
			id: "ssl-enabled",
			label: "SSL Enabled",
			category: "Technical",
			status: "pass",
			summary:
				"The audited page was reached over HTTPS.",
			explanation: `Final URL: ${ context.finalUrl }`,
			recommendation:
				"Keep HTTPS enabled with a valid certificate. Google explicitly rewards HTTPS sites as part of its Page Experience ranking signals.",
		});
	}
	
	try {
		const response = await fetchTextWithRedirects(
			httpsUrl.href,
			pageFetchClient,
			{
				label: "HTTPS URL",
				maxRedirects: 2,
			},
		);
		
		return createCheckResult({
			id: "ssl-enabled",
			label: "SSL Enabled",
			category: "Technical",
			status: "pass",
			summary:
				"HTTPS responded with a valid TLS connection.",
			explanation: `Tested HTTPS URL: ${ httpsUrl.href }. Response status: ${ response.statusCode }.`,
			recommendation:
				"Redirect users strictly to the HTTPS version so the secure URL is the default, ensuring the site benefits from Google's HTTPS ranking boost.",
		});
	} catch (error) {
		return createCheckResult({
			id: "ssl-enabled",
			label: "SSL Enabled",
			category: "Technical",
			status: "fail",
			summary:
				"HTTPS did not respond with a valid TLS connection.",
			explanation: `Tested HTTPS URL: ${ httpsUrl.href }.`,
			recommendation:
				"Enable HTTPS with a valid, trusted SSL/TLS certificate for this host. Browsers will block users from entering insecure HTTP sites.",
			codeExample: "Server Configuration:\n# Apache: enable mod_ssl\n# Nginx: configure ssl_certificate and ssl_certificate_key",
			aiPrompt: "This site does not support HTTPS with a valid TLS certificate. Install an SSL/TLS certificate (preferably Let's Encrypt) and configure your web server to redirect HTTP to HTTPS.",
		});
	}
}
