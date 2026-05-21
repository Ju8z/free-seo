# Free SEO

> **🚀 [Try it live at free-seo.click](https://free-seo.click)**

A compact, stateless full-stack SEO auditing tool. Enter a domain or URL and get a scored report covering on-page SEO, indexing, technical signals, generative engine optimization (GEO), and social presence — all in one request.

The app is intentionally stateless: no database, no authentication, no saved history, and no Docker requirement. Results live only in the current browser session and are gone after refresh.

The "Recommendations" are taken from Google SEO Documentation.

**Privacy-First:** No cookies and fully compliant with GDPR, CCPA and PECR.

## Features

- **25 SEO checks** across 7 categories with calibrated weighted scoring
- **Interactive status filtering** — click on any status badge (Pass, Warning, Fail, Info) to view matching checks grouped by category in a scrollable panel
- **Interactive category toggling** — hide or show categories to dynamically recalculate the overall score
- **Generative Engine Optimization (GEO)** — identity schema detection, JS-dependent content analysis via Playwright, and llms.txt validation
- **Social presence detection** — Facebook, X, Instagram, LinkedIn, YouTube links, Open Graph / X Card tags, Facebook Pixel
- **SERP snippet preview** — simulated Google search result display
- **Real-time audit counter** via Server-Sent Events
- **IP-based rate limiting** with configurable cooldown
- **Dark / light theme** with smooth CSS gradients
- **⚡ Performance optimized** — Handles 50+ concurrent users with browser pooling and HTTP connection reuse

## Requirements

- [Node.js](https://nodejs.org/) 18.11.0 or later
- npm (included with Node.js)
- Playwright for GEO rendered content analysis (see [Setup](#setup))

Runs natively on Windows, macOS, and Linux.

## Quick Start

```bash
git clone https://github.com/Ju8z/free-seo.git
cd free-seo
npm install
npm run dev
```

Open `http://localhost:5173`.

The root `npm install` uses npm workspaces to install dependencies for both the server and client. The root `npm run dev` starts only the Vite dev server, which runs the audit API in-process via the Vite plugin — no separate API server needed in development.

## Setup

### Install dependencies

```bash
npm install
```

### Install Playwright browsers

The GEO "Rendered Content" check uses Playwright to render pages in a headless browser. Install the Chromium browser binary:

```bash
npx playwright install chromium
```

If you skip this step, the GEO rendered content check will simply report that it could not run — all other checks still work.

### Environment variables

Create a `.env` file at the project root (copy from the example below):

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUDIT_SPAM_PROTECTION` | No | `5` | Cooldown in seconds between audits per IP |
| `PORT` | No | `80` | Server port (production mode) |
| `HTTP_MAX_SOCKETS` | No | `25` | Maximum concurrent HTTP connections per host |
| `HTTP_MAX_FREE_SOCKETS` | No | `10` | Maximum idle HTTP connections to keep alive |
| `PLAYWRIGHT_MAX_BROWSERS` | No | `3` | Maximum Playwright browser instances (GEO capacity = value × 15) |
| `PLAYWRIGHT_IDLE_TIMEOUT` | No | `300000` | Browser idle timeout in milliseconds (5 minutes) |

Example:

```env
# Rate limiting
AUDIT_SPAM_PROTECTION=5

# Server
PORT=80

# HTTP Performance (50 concurrent users)
HTTP_MAX_SOCKETS=25
HTTP_MAX_FREE_SOCKETS=10

# Playwright Browser Pool (45 concurrent GEO checks)
PLAYWRIGHT_MAX_BROWSERS=3
PLAYWRIGHT_IDLE_TIMEOUT=300000
```

**Scaling Guidelines:**

- **Low traffic (1-10 users):** Use defaults or reduce to `HTTP_MAX_SOCKETS=10`, `PLAYWRIGHT_MAX_BROWSERS=1`
- **Medium traffic (10-50 users):** Use defaults (`HTTP_MAX_SOCKETS=25`, `PLAYWRIGHT_MAX_BROWSERS=3`)
- **High traffic (50-100 users):** Increase to `HTTP_MAX_SOCKETS=50`, `PLAYWRIGHT_MAX_BROWSERS=5`
- **100+ users:** Consider multiple server instances behind load balancer

## Development

#### Option 1 — Vite only (recommended)

```bash
npm run dev
```

The Vite dev server runs the audit API in-process. No separate backend needed. Open `http://localhost:5173`.

#### Option 2 — Two terminals

```bash
# Terminal 1 — Express API server (port 80)
npm run dev -w server

# Terminal 2 — Vite dev server (port 5173, proxies /api to 80)
npm run dev -w client
```

Open `http://localhost:5173`.

> When the Express server is detected on port 80, the Vite plugin automatically defers to it instead of running the audit logic in-process.

## Production

```bash
# Build the client (also automatically increments version and updates version.ts)
npm run build

# Start the server (serves API + built client on port 80)
npm start
```

Open `http://localhost:80`.

The Express server serves the API endpoints and the built client from `client/dist/` with an SPA fallback.

### Versioning

The build process automatically increments the project version in `package.json` and generates `client/src/version.ts` with the new version and current git commit hash (e.g. `0.8-b84d724`). This version is displayed in the client UI. A Git pre-commit hook is also configured to update the versioning information automatically before commits.

### Docker Deployment

```bash
# First time setup
chmod +x deploy.sh
./deploy.sh
```

The `deploy.sh` script handles everything:
1. Pulls latest code from git
2. Builds the Docker image
3. Stops and removes the old container
4. Starts a new container with a persistent volume for the audit counter

**Manual Docker commands:**

```bash
# Build
docker build -t free-seo .

# Run (with persistent audit counter)
docker run -d \
  --name free-seo \
  -p 80:80 \
  --env-file .env \
  -v free-seo-data:/app/server/data \
  --restart unless-stopped \
  free-seo
```

**Update after code changes:**

```bash
./deploy.sh
```

The named volume `free-seo-data` persists the audit counter across rebuilds. The counter file is created automatically if it doesn't exist.

### Deployment notes

- Set `PORT` to your preferred port (defaults to `80`)
- The server is a single Node.js process with no external dependencies (no database, no Redis, no queue)
- Run behind a reverse proxy (nginx, Caddy) for TLS termination and additional rate limiting
- The in-memory IP cooldown map is per-process — behind a load balancer, set `AUDIT_SPAM_PROTECTION=0` and use your reverse proxy for rate limiting instead
- For continuous uptime, use a process manager like `pm2` or `systemd`

## How It Works

### Request flow

1. User submits a domain or URL in the React frontend
2. Client sends `POST /api/audit` with `{ "input": "example.com" }`
3. Server normalizes the URL, fetches the page HTML and robots.txt in parallel, then runs all checks

### Audit pipeline

```
URL normalization → parallel fetch (HTML + robots.txt) → HTML parsing (Cheerio)
→ structured data parsing → 20 sync checks → 5 parallel async checks
→ category scoring → SERP preview → JSON response
```

1. **URL normalization** — strips fragments, adds `https://` if no scheme, lowercases hostname, rejects private/unsafe URLs
2. **Parallel fetch** — page HTML and robots.txt fetched concurrently
3. **HTML parsing** — Cheerio loads the HTML and extracts text, title, meta description, canonical, H1s
4. **Structured data** — parses JSON-LD, microdata, and RDFa once for reuse across multiple checks
5. **Synchronous checks** — runs 20 checks that only need the parsed HTML context
6. **Async checks** — SSL validity, HTTPS redirect, XML sitemaps, GEO report, and Social report run in parallel
7. **Scoring** — checks grouped into 7 categories, weighted and scored, then aggregated into an overall score (0–100)
8. **SERP preview** — builds a simulated Google search result snippet

### Scoring

- Each check has a **weight** representing its relative SEO importance (e.g., SSL = 10, Title Tag = 9, Mobile Page Speed = 7, Meta Description = 6, Structured Data = 5, Analytics = 0)
- Each status has a **multiplier**: pass = 1.0, warning = 0.5, fail = 0.0, info = 1.0
- Category score = `(earned / possible) × 100`
- Overall score = weighted average of category scores, clamped to 0–100

## Audit Coverage

### Metadata (weight 0.20)
| Check | What it does |
|---|---|
| Title Tag | Presence and length (recommended 50–60 characters) |
| Meta Description | Presence and length (recommended 120–160 characters) |
| Hreflang Tags | Presence and validity of alternate language/region links |
| HTML Language | Declared `lang` attribute on `<html>` |
| Detected Language | Actual language detected from page text via franc-min |
| Canonical URL | Presence of the canonical link tag |
| Search Favicon | Presence of a `<link rel="icon">` tag for Google Search display |

### Structure (weight 0.15)
| Check | What it does |
|---|---|
| H1 | Exactly one H1 heading |
| Heading Hierarchy | No skipped heading levels (H1 → H2 → H3, etc.) |
| Structured Data | JSON-LD, microdata, and RDFa presence and parsing |

### Content (weight 0.20)
| Check | What it does |
|---|---|
| Keyword Consistency | Primary keyword presence in title, headings, and body text |
| Content Amount | Minimum word count threshold |
| Image Alt Text | Missing alt attributes on images |
| Crawlable Links | Detects uncrawlable links (`javascript:`, empty hrefs) and generic anchor text |
| Image Dimensions | Missing `width`/`height` attributes that cause Cumulative Layout Shift (CLS) |

### Indexing (weight 0.20)
| Check | What it does |
|---|---|
| Noindex (Meta) | `<meta name="robots" content="noindex">` directive |
| Noindex (Header) | `X-Robots-Tag: noindex` response header |
| Robots.txt | Presence, fetchability, and parsing |
| Blocked by Robots.txt | Whether the page path is blocked from crawling |
| XML Sitemaps | Discovery via robots.txt and sitemap index validation |

### Technical (weight 0.15)
| Check | What it does |
|---|---|
| SSL Enabled | Valid TLS certificate on the final URL |
| HTTPS Redirect | HTTP → HTTPS redirect from the non-secure origin |
| Analytics | GA4, Google Tag Manager, or Universal Analytics detection |
| Mobile Viewport | Presence and correctness of the `<meta name="viewport">` tag |
| PageSpeed Desktop | Performance audit score and core diagnostics for desktop devices |
| PageSpeed Mobile | Performance audit score and core diagnostics for mobile devices |

### Generative Engine Optimization (weight 0.10)
| Check | What it does |
|---|---|
| Identity Schema | Organization / LocalBusiness / Person schema (JSON-LD, microdata, RDFa) |
| Rendered Content | Compares raw HTML vs. Playwright-rendered content to measure JS dependency |
| llms.txt | Presence of `/llms.txt`, link validation, and template generation |

### Social (weight 0.0 — excluded from score)
| Check | What it does |
|---|---|
| Social Links | Facebook, X (Twitter), Instagram, LinkedIn, YouTube link detection |
| Open Graph Tags | `og:title`, `og:description`, `og:image`, `og:url`, `og:type` |
| X Card Tags | `twitter:card` and related meta tags |
| Facebook Pixel | Presence of the Facebook Pixel tracking code |
| YouTube Activity | Channel subscriber and view counts (when a YouTube link is found) |

Each check returns `status` (pass / warning / fail / info), `summary`, `explanation`, `recommendation`, `codeExample`, and `aiPrompt`.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, TypeScript |
| Backend | Express 5 |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite 8 |
| HTML parsing | Cheerio |
| XML parsing | fast-xml-parser |
| HTTP client | Axios |
| Language detection | franc-min |
| IP validation | ipaddr.js |
| Browser rendering | Playwright (headless Chromium — GEO only) |
| Package manager | npm workspaces |

## Safety

The backend performs remote fetching, not the browser. Input and redirect targets are validated before every request:

- Only `http://` and `https://` URLs are accepted
- Localhost, private/internal IPs, and reserved hostnames are blocked (uses `ipaddr.js` + DNS resolution)
- Redirect destinations are validated at each hop
- Remote requests use short timeouts (8–10s) with no automatic retries
- Request bodies are limited to 32 KB

This is POC-level protection. Harden before exposing in a production, public-facing environment.

## Limitations

- Reads raw HTML, response headers, robots.txt, and XML sitemaps. JavaScript-heavy sites may show incomplete results for **content-based checks** (text, headings, images, keywords).
- The GEO **Rendered Content** check does use Playwright to render the page, but only for comparison — the main SEO checks still operate on raw HTML.
- No JavaScript rendering for the primary SEO analysis pipeline.
- Live results depend on the target site's current state (redirects, TLS, robots.txt, sitemaps can change at any time).
- The score is a heuristic summary, not a search-engine ranking prediction.
- Stateless design means no history, no trends, no comparison across audits.


## License

This project is licensed under the [Polyform Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).

### What this means:

- ✅ **Free for personal use** - Use it for learning, personal projects, and non-commercial purposes
- ✅ **Free for evaluation** - Test it, study it, modify it for your own use
- ✅ **Open source** - Full source code available on GitHub
- ❌ **No commercial use** - Cannot be used for commercial purposes without permission
- ❌ **No SaaS** - Cannot offer this as a paid service

For commercial licensing inquiries, please open an issue on GitHub.

### Full License Text

The complete license text is available at: https://polyformproject.org/licenses/noncommercial/1.0.0
