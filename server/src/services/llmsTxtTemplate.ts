export function buildSampleLlmsTxtTemplate(siteUrl: string): string {
	const rootUrl = new URL(siteUrl);
	const origin = rootUrl.origin;
	const siteName = rootUrl.hostname.replace(/^www\./, "");
	
	return `# ${ siteName }

Brief description of the business/site.

## Key Pages

- [About](${ origin }/about)
- [Services](${ origin }/services)
- [Contact](${ origin }/contact)

## Important Resources

- [Blog](${ origin }/blog)
- [Sitemap](${ origin }/sitemap.xml)`;
}
