import { seoCategoryConfigs } from "./seoCategoryConfig.js";
import { getCheckScore, getCheckWeight, statusMultipliers } from "./score.js";
import type {
	BaseCheckStatus,
	CheckId,
	CheckResult,
	GeoReport,
	SeoCategoriesReport,
	SeoCategoryCheck,
	SeoCategoryResult,
	SeoCategoryStatus,
	SocialCheckItem,
	SocialResultsReport,
} from "../types.js";
import { getAuditStatus } from "../types.js";

type SocialFixGuidance = Pick<
  SeoCategoryCheck,
  "recommendations" | "prompts" | "codeExamples"
>;

const SOCIAL_PROFILE_LABELS: Record<string, string> = {
  "facebook-page-linked": "Facebook page",
  "x-account-linked": "X profile",
  "instagram-linked": "Instagram profile",
  "linkedin-page-linked": "LinkedIn page",
  "youtube-channel-linked": "YouTube channel",
};

const SOCIAL_EXPLANATIONS: Record<string, string> = {
  "facebook-page-linked":
    "A visible Facebook link lets users follow your brand and signals social authority to search engines via entity corroboration.",
  "facebook-open-graph":
    "Without Open Graph tags, Facebook auto-generates share previews that may use the wrong title, image, or description.",
  "facebook-pixel":
    "Without the Meta Pixel you cannot retarget site visitors or measure ad conversions if you run Meta Ads campaigns.",
  "x-account-linked":
    "A visible X profile link lets users follow your brand and helps search engines confirm your entity across platforms.",
  "x-cards":
    "Without X Card tags, shared links render as plain URLs without a preview image, title, or description on X.",
  "instagram-linked":
    "A visible Instagram link lets users engage with your visual content and strengthens your cross-platform brand presence.",
  "linkedin-page-linked":
    "A visible LinkedIn link lets users connect professionally and reinforces your brand's entity across business platforms.",
  "youtube-channel-linked":
    "A visible YouTube link lets users find your video content and reinforces your brand's cross-platform presence.",
  "youtube-channel-activity":
    "Active YouTube channels with subscribers and views indicate an engaged audience and consistent content production.",
};

const SOCIAL_TAG_GUIDANCE: Record<string, SocialFixGuidance> = {
  "facebook-open-graph": {
    recommendations: [
      "Add complete Open Graph tags in the page head so Facebook can build a reliable share preview with the correct title, description, image, canonical URL, and content type.",
    ],
    prompts: [
      "Generate the missing Open Graph meta tags for this page and insert them into the <head>: og:title, og:description, og:image, og:url, and og:type. Reuse the page's canonical URL and a crawlable absolute image URL.",
    ],
    codeExamples: [
      `<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Short social sharing description." />
<meta property="og:image" content="https://www.example.com/images/social-share.jpg" />
<meta property="og:url" content="https://www.example.com/page" />
<meta property="og:type" content="website" />`,
    ],
  },
  "x-cards": {
    recommendations: [
      "Add a complete X Card tag set in the page head so shared links render with the intended card type, title, description, image, and brand attribution.",
    ],
    prompts: [
      "Generate the missing X Card meta tags for this page and insert them into the <head>: twitter:card, twitter:title, twitter:description, twitter:image, and twitter:site. Use absolute asset URLs and the correct brand handle.",
    ],
    codeExamples: [
      `<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Page Title" />
<meta name="twitter:description" content="Short social sharing description." />
<meta name="twitter:image" content="https://www.example.com/images/social-share.jpg" />
<meta name="twitter:site" content="@yourbrand" />`,
    ],
  },
  "facebook-pixel": {
    recommendations: [
      "Install the Meta Pixel only if you plan to run Meta Ads or retargeting, and place it in a global layout or tag manager so it loads consistently across the site.",
    ],
    prompts: [
      "Add the Meta Pixel base snippet to the global layout or tag manager so it loads on every page, and replace the placeholder pixel ID with the real production value.",
    ],
    codeExamples: [
      `<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
<noscript>
  <img
    height="1"
    width="1"
    style="display:none"
    src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"
  />
</noscript>
<!-- End Meta Pixel Code -->`,
    ],
  },
};

export function buildSeoCategoriesReport(
  checks: CheckResult[],
  geo: GeoReport | null,
  socialResults: SocialResultsReport | null,
  finalUrl: string,
): SeoCategoriesReport {
  const checkMap = new Map<CheckId, CheckResult>(
    checks.map((check) => [check.id, check]),
  );
  const categories = Object.fromEntries(
    seoCategoryConfigs.map((config) => {
      const category =
        config.id === "geo"
          ? buildGeoCategory(config, geo, finalUrl)
          : config.id === "social"
            ? buildSocialCategory(config, socialResults, finalUrl)
            : buildCheckCategory(config, checkMap);
      return [config.id, category];
    }),
  ) as SeoCategoriesReport["categories"];
  const overallScore = calculateOverallCategoryScore(Object.values(categories));
  const overallStatus = getSeoCategoryStatus(overallScore);

  return {
    overallScore,
    overallStatus,
    summary: buildOverallSummary(overallScore),
    categories,
  };
}

export function getSeoCategoryStatus(score: number): SeoCategoryStatus {
  return getAuditStatus(score);
}

export function calculateOverallCategoryScore(
  categories: SeoCategoryResult[],
): number {
  const includedCategories = categories.filter(
	  (category) => !category.excludedFromOverall && category.id !== "social",
  );
  const totalWeight = includedCategories.reduce(
    (total, category) => total + category.weight,
    0,
  );
  if (totalWeight <= 0) {
    return 100;
  }

  return Math.round(
    includedCategories.reduce(
      (total, category) =>
        total + category.score * (category.weight / totalWeight),
      0,
    ),
  );
}

function buildCheckCategory(
  config: (typeof seoCategoryConfigs)[number],
  checkMap: Map<CheckId, CheckResult>,
): SeoCategoryResult {
  const categoryChecks: SeoCategoryCheck[] = [
    ...config.checks.map((checkId) => {
      const check = checkMap.get(checkId);
      if (!check) {
        return {
          id: checkId,
          name: checkId,
          status: "not_applicable",
          score: 0,
          issues: [],
          recommendations: [],
          prompts: [],
          codeExamples: [],
          explanation: "",
        } satisfies SeoCategoryCheck;
      }

      return buildSeoCheck(check);
    }),
    ...(config.displayChecks || []).map((displayCheck) => ({
      id: displayCheck.id,
      name: displayCheck.name,
      status: "not_applicable" as const,
      score: 0,
      issues: [],
      recommendations: [],
      prompts: [],
      codeExamples: [],
      explanation: "",
    })),
  ];
  const score = calculateCheckCategoryScore(config.checks, checkMap);
  const excludedFromOverall = score === null;
  const categoryScore = score ?? 0;

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    weight: config.weight,
    score: categoryScore,
    status: getSeoCategoryStatus(categoryScore),
    summary: buildCategorySummary(config.label, categoryScore, categoryChecks),
    checks: categoryChecks,
    statusSummary: summarizeCategoryChecks(categoryChecks),
    issues: categoryChecks.flatMap((check) => check.issues),
    recommendations: unique(
      categoryChecks.flatMap((check) => check.recommendations),
    ),
    prompts: unique(categoryChecks.flatMap((check) => check.prompts)),
    excludedFromOverall,
  };
}

function buildGeoCategory(
  config: (typeof seoCategoryConfigs)[number],
  geo: GeoReport | null,
  finalUrl: string,
): SeoCategoryResult {
  const domain = new URL(finalUrl).hostname;
  if (!geo) {
    return {
      id: config.id,
      label: config.label,
      description: config.description,
      weight: config.weight,
      score: 0,
      status: "poor",
      summary:
        "Generative Engine Optimization was not available for this audit.",
      checks: [],
      statusSummary: {
        pass: 0,
        warning: 0,
        fail: 0,
        not_applicable: 0,
        unavailable: 0,
      },
      issues: [],
      recommendations: [],
      prompts: [],
      excludedFromOverall: true,
    };
  }

  const categoryChecks: SeoCategoryCheck[] = [
    {
      id: "identitySchema",
      name: "Identity Schema",
      status: mapGeoStatus(geo.checks.identitySchema.status),
      score: geo.checks.identitySchema.score,
      issues: geo.checks.identitySchema.issues,
      recommendations: geo.checks.identitySchema.recommendations,
      explanation: "Identity schema helps AI systems and search engines understand who you are by providing structured entity data (name, URL, logo, social links) in a machine-readable format.",
      prompts: [
        "Add Organization or LocalBusiness schema to your homepage with all required fields: name, url, logo, description, and sameAs links to your social profiles and authoritative directories.",
        "Create valid JSON-LD schema markup using schema.org types. Include a primary identity entity (Organization, LocalBusiness, or Person) with name, url, description, logo, and sameAs links to verified profiles on LinkedIn, Twitter, Facebook, Google Business, and relevant industry directories.",
        "Ensure the schema name exactly matches your visible brand name. Use an absolute URL for the logo field that is crawlable. Add description field with a 50-160 character summary of your business.",
        "Place the JSON-LD schema in the <head> section of your HTML for maximum visibility to AI systems and search engines. Validate using Google's Rich Results Test or Schema.org validator.",
      ],
      codeExamples: [
        `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company Name",
  "url": "https://www.${domain}",
  "logo": "https://www.${domain}/images/logo.png",
  "description": "Brief description of your company (50-160 characters)",
  "sameAs": [
    "https://www.linkedin.com/company/yourcompany",
    "https://twitter.com/yourcompany",
    "https://www.facebook.com/yourcompany",
    "https://www.google.com/maps/yourlocation"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-123-4567",
    "contactType": "customer service"
  }
}
</script>`,
        `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Your Business Name",
  "image": "https://www.${domain}/images/business.jpg",
  "telephone": "+1-555-123-4567",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "url": "https://www.${domain}",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ]
}
</script>`,
      ],
    },
    {
      id: "renderedContent",
      name: "Rendered Content / LLM Readability",
      status: mapGeoStatus(geo.checks.renderedContent.status),
      score: geo.checks.renderedContent.score,
      issues: geo.checks.renderedContent.issues,
      recommendations: geo.checks.renderedContent.recommendations,
      explanation: "AI crawlers and some search engine bots do not execute JavaScript. Content that only appears after JS rendering may be invisible to these systems.",
      prompts: [
        "Ensure your website renders content in the initial HTML response, not just via JavaScript. Move critical content to server-rendered HTML so AI crawlers that don't execute JavaScript can still access your content.",
        "Use semantic HTML structure with headings (H1-H6), paragraphs (p), and lists (ul/ol) in the initial HTML. Important content should not depend on JavaScript frameworks to render.",
        "Place internal links in the initial HTML with proper anchor text. AI crawlers need crawlable links to discover and index your content. Avoid links that only appear after user interaction.",
        "Keep essential page elements (title tag, meta description, main heading, body content, internal links, schema markup) in the initial HTML. Use server-side rendering or static site generation for critical pages.",
      ],
      codeExamples: [
        `<!-- GOOD: Content in initial HTML -->
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Page Title - Important Keyword</title>
  <meta name="description" content="Page description with key information.">
  <script type="application/ld+json">{"@type":"WebPage",...}</script>
</head>
<body>
  <nav><!-- Links in initial HTML --></nav>
  <main>
    <h1>Main Heading with Important Keywords</h1>
    <p>Essential content is visible in initial HTML, not hidden in JavaScript.</p>
    <a href="/internal-page">Internal Link</a>
  </main>
  <footer><!-- Footer links --></footer>
</body>
</html>`,
        `<!-- BAD: Content requires JavaScript -->
<body>
  <div id="app"></div>
  <script>
    // JavaScript renders all content - AI crawlers see empty page
    ReactDOM.render(<App />, document.getElementById('app'));
  </script>
</body>`,
        `<!-- SOLUTION: Progressive Enhancement -->
<main>
  <!-- Content available immediately -->
  <h1>Service Name</h1>
  <p>Complete service description in plain HTML.</p>

  <!-- Links crawlable without JS -->
  <nav>
    <a href="/about">About Us</a>
    <a href="/services">Our Services</a>
    <a href="/contact">Contact</a>
  </nav>

  <!-- Enhanced interactivity added after page load -->
  <script src="interactions.js" defer></script>
</main>`,
      ],
    },
    {
      id: "llmsTxt",
      name: "llms.txt",
      status: mapGeoStatus(geo.checks.llmsTxt.status),
      score: geo.checks.llmsTxt.score,
      issues: geo.checks.llmsTxt.issues,
      recommendations: geo.checks.llmsTxt.recommendations,
      explanation: "llms.txt is a Markdown file at your domain root that gives AI systems a curated overview of your site structure, purpose, and key pages.",
      prompts: [
        `Create an llms.txt file at your domain root (https://${domain}/llms.txt) that provides AI systems with a clear summary of your site structure, purpose, and key pages. This file should be in Markdown format.`,
        "Allow AI crawlers to access llms.txt by checking your robots.txt file includes: Allow: /llms.txt. Also ensure the file is served with Content-Type: text/plain or text/markdown.",
        "Write your llms.txt with a brief site description, followed by links to your most important canonical pages. Prioritize: About, Services/Products, Contact, and high-value content pages. Keep it concise and avoid listing every page.",
        "Review llms.txt for broken links and remove any links that are blocked by robots.txt or require authentication. Each link should point to a stable, publicly accessible URL that AI systems can fetch.",
      ],
      codeExamples: [
        `# Your Company Name

Brief description of your company, what you do, and who you serve.

## About
- [About Us](https://www.${domain}/about) - Learn about our story, mission, and team
- [Our Services](https://www.${domain}/services) - Explore what we offer

## Key Resources
- [Contact Us](https://www.${domain}/contact) - Get in touch with our team
- [Blog](https://www.${domain}/blog) - Latest news, guides, and insights
- [Help Center](https://www.${domain}/help) - FAQs and documentation

## Legal
- [Privacy Policy](https://www.${domain}/privacy)
- [Terms of Service](https://www.${domain}/terms)`,
        `# Acme Corporation

Helping businesses succeed with innovative solutions since 2010.

## What We Do
We provide [cloud hosting](https://www.${domain}/cloud), [managed databases](https://www.${domain}/databases), and [24/7 support](https://www.${domain}/support) for businesses of all sizes.

## Popular Pages
- [Home](https://www.${domain})
- [Pricing](https://www.${domain}/pricing)
- [Case Studies](https://www.${domain}/case-studies)
- [Documentation](https://docs.${domain})

## Connect With Us
- [LinkedIn](https://linkedin.com/company/acme)
- [Twitter](https://twitter.com/acme)
- [GitHub](https://github.com/Ju8z)`,
      ],
    },
  ];

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    weight: config.weight,
    score: geo.score,
    status: geo.status,
    summary: geo.summary,
    checks: categoryChecks,
    statusSummary: summarizeCategoryChecks(categoryChecks),
    issues: categoryChecks.flatMap((check) => check.issues),
    recommendations: unique(geo.recommendations),
    prompts: [],
    excludedFromOverall: false,
  };
}

function buildSocialCategory(
  config: (typeof seoCategoryConfigs)[number],
  socialResults: SocialResultsReport | null,
  finalUrl: string,
): SeoCategoryResult {
  if (!socialResults) {
    return {
      id: config.id,
      label: config.label,
      description: config.description,
      weight: config.weight,
      score: 0,
      status: "poor",
      summary: "Social presence was not available for this audit.",
      checks: [],
      statusSummary: {
        pass: 0,
        warning: 0,
        fail: 0,
        not_applicable: 0,
        unavailable: 0,
      },
      issues: [],
      recommendations: [],
      prompts: [],
      excludedFromOverall: true,
    };
  }

  const domain = new URL(finalUrl).hostname;

  const categoryChecks = socialResults.items.map((item) => buildSocialCategoryCheck(item, domain));

  const score = socialResults.score;
  const status = getSeoCategoryStatus(score);

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    weight: config.weight,
    score,
    status,
    summary: socialResults.summary,
    checks: categoryChecks,
    statusSummary: summarizeCategoryChecks(categoryChecks),
    issues: categoryChecks.flatMap((check) => check.issues),
    recommendations: unique(
      categoryChecks.flatMap((check) => check.recommendations),
    ),
    prompts: [],
	  excludedFromOverall: false,
  };
}

function buildSocialCategoryCheck(item: SocialCheckItem, domain: string): SeoCategoryCheck {
  const status: BaseCheckStatus | "not_applicable" | "unavailable" =
    item.status === "unavailable" ? "unavailable" : item.status;
  const hasIssue = item.status === "warning" || item.status === "fail";
  const guidance = hasIssue ? getSocialFixGuidance(item, domain) : emptyFixGuidance();

  return {
    id: item.key,
    name: item.label,
    status,
    score: item.score,
    issues: hasIssue ? [item.message] : [],
    recommendations: guidance.recommendations,
    prompts: guidance.prompts,
    codeExamples: guidance.codeExamples,
    explanation: SOCIAL_EXPLANATIONS[item.key] || "",
  };
}

function getSocialFixGuidance(
  item: SocialCheckItem,
  domain: string,
): SocialFixGuidance {
  const replaceDomain = (text: string) => text.replace(/www\.example\.com|example\.com/g, domain);

  if (item.key === "youtube-channel-activity") {
    return emptyFixGuidance();
  }

  const profileLabel = SOCIAL_PROFILE_LABELS[item.key];
  if (profileLabel) {
    return {
      ...buildSocialLinkGuidance(profileLabel),
      codeExamples: buildSocialLinkGuidance(profileLabel).codeExamples.map(replaceDomain),
    };
  }

  const tagGuidance = SOCIAL_TAG_GUIDANCE[item.key];
  if (tagGuidance) {
    return {
      recommendations: tagGuidance.recommendations,
      prompts: tagGuidance.prompts.map(replaceDomain),
      codeExamples: tagGuidance.codeExamples.map(replaceDomain),
    };
  }

  if (item.helpText) {
    return {
      recommendations: [item.helpText],
      prompts: [
        `Review the ${ item.label } integration for this page and implement the missing social setup so the check passes.`,
      ],
      codeExamples: [],
    };
  }

  return {
    recommendations: [
      `Review the ${ item.label } setup for this page and add the missing social integration so the check passes.`,
    ],
    prompts: [
      `Update the page so the ${ item.label } check passes and the social integration is available to crawlers and visitors.`,
    ],
    codeExamples: [],
  };
}

function buildSocialLinkGuidance(
  profileLabel: string,
): SocialFixGuidance {
  return {
    recommendations: [
      `Add a crawlable, visible link to the official ${ profileLabel } in the header, footer, contact section, or social navigation so users and crawlers can reach it directly.`,
    ],
    prompts: [
      `Add a visible link to the official ${ profileLabel } in the header, footer, contact section, or social navigation, and use the real production profile URL.`,
    ],
    codeExamples: [],
  };
}

function emptyFixGuidance(): SocialFixGuidance {
  return {
    recommendations: [],
    prompts: [],
    codeExamples: [],
  };
}

function buildSeoCheck(check: CheckResult): SeoCategoryCheck {
  const status = mapCheckStatus(check.status);
  const checkScore = getCheckScore(check.status);
  const hasIssue = check.status === "warning" || check.status === "fail";

  return {
    id: check.id,
    name: check.label,
    status,
    score: checkScore ?? 0,
    issues: hasIssue ? [check.summary] : [],
    recommendations:
      hasIssue && check.recommendation ? [check.recommendation] : [],
    prompts: hasIssue && check.aiPrompt ? [check.aiPrompt] : [],
    codeExamples: hasIssue && check.codeExample ? [check.codeExample] : [],
    explanation: check.explanation,
  };
}

function calculateCheckCategoryScore(
  checkIds: CheckId[],
  checkMap: Map<CheckId, CheckResult>,
): number | null {
  let possibleScore = 0;
  let earnedScore = 0;

  for (const checkId of checkIds) {
    const check = checkMap.get(checkId);
    if (!check || check.status === "info") {
      continue;
    }

    const weight = getCheckWeight(check.id);
    possibleScore += weight;
    earnedScore += weight * (statusMultipliers[check.status] ?? 0);
  }

  if (possibleScore === 0) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((earnedScore / possibleScore) * 100)),
  );
}

function mapCheckStatus(status: CheckResult["status"]): BaseCheckStatus | "not_applicable" | "unavailable" {
  return status === "info" ? "not_applicable" : status;
}

function mapGeoStatus(status: BaseCheckStatus): BaseCheckStatus | "not_applicable" | "unavailable" {
  return status;
}

function summarizeCategoryChecks(
  checks: SeoCategoryCheck[],
): SeoCategoryResult["statusSummary"] {
  return checks.reduce(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    { pass: 0, warning: 0, fail: 0, not_applicable: 0, unavailable: 0 },
  );
}

function buildCategorySummary(
  label: string,
  score: number,
  checks: SeoCategoryCheck[],
): string {
  const status = getSeoCategoryStatus(score).replace("_", " ");
  const issueCount = checks.filter(
    (check) => check.status === "warning" || check.status === "fail",
  ).length;

  if (issueCount === 0) {
    return `${label} is ${status} with no scored issues found.`;
  }

  return `${label} is ${status} with ${issueCount} issue${issueCount === 1 ? "" : "s"} to review.`;
}

function buildOverallSummary(score: number): string {
  const status = getSeoCategoryStatus(score);
  if (status === "excellent") {
    return "The audit is excellent across the main SEO categories.";
  }
  if (status === "good") {
    return "The audit is good overall, with some category-level improvements available.";
  }
  if (status === "needs_improvement") {
    return "The audit needs improvement in several SEO categories.";
  }
  return "The audit has major SEO category issues that should be addressed first.";
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
