# Configuration Guide

## Table of Contents
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Configuration Presets](#configuration-presets)
- [Configuration Formulas](#configuration-formulas)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Default Configuration (Medium Traffic: 10-50 users) ⭐ **Recommended**

```env
# Rate limiting
AUDIT_SPAM_PROTECTION=5

# Server
PORT=80

# HTTP Performance
HTTP_MAX_SOCKETS=25
HTTP_MAX_FREE_SOCKETS=10

# Playwright Browser Pool
PLAYWRIGHT_MAX_BROWSERS=3
PLAYWRIGHT_IDLE_TIMEOUT=300000
```

**Capacity:**
- Regular audits: 50+ concurrent
- GEO checks: 45 concurrent (3 browsers × 15 pages)
- Memory usage: ~1.5-2.5GB

---

## Environment Variables

All configuration is done via the `.env` file in the project root.

### Rate Limiting & Security

#### `AUDIT_SPAM_PROTECTION`
- **Type:** Number (seconds)
- **Default:** `5`
- **Description:** Cooldown period between audits per IP address
- **Recommendations:**
  - `5` - Public-facing sites (recommended) ⭐
  - `0` - Behind reverse proxy with rate limiting
  - `10` - High-security environments
  - `1` - Development/testing

**Example:**
```env
AUDIT_SPAM_PROTECTION=5
```

---

### Server Configuration

#### `PORT`
- **Type:** Number
- **Default:** `80`
- **Description:** Server port for production mode
- **Recommendations:**
  - `80` - Production with root access
  - `3000` - Development
  - `8080` - Production without root access
  - `443` - HTTPS (requires SSL setup)

**Example:**
```env
PORT=80
```

---

### HTTP Client Performance

#### `HTTP_MAX_SOCKETS`
- **Type:** Number
- **Default:** `25`
- **Description:** Maximum number of concurrent HTTP connections per host
- **Impact:** Higher values = more concurrent requests but more memory usage
- **File:** `server/src/services/httpClients.ts`
- **Recommendations:**
  - `10` - Low traffic (1-10 concurrent users)
  - `25` - Medium traffic (10-50 concurrent users) ⭐ **Recommended**
  - `50` - High traffic (50-100 concurrent users)
  - `100` - Very high traffic (100+ concurrent users)

**Memory Impact:** ~1-2MB per socket

**Example:**
```env
HTTP_MAX_SOCKETS=25
```

#### `HTTP_MAX_FREE_SOCKETS`
- **Type:** Number
- **Default:** `10`
- **Description:** Maximum number of idle HTTP connections to keep alive
- **Impact:** Faster subsequent requests to same host
- **File:** `server/src/services/httpClients.ts`
- **Recommendations:**
  - Should be ~40% of `HTTP_MAX_SOCKETS`
  - `5` - Low traffic
  - `10` - Medium traffic ⭐ **Recommended**
  - `20` - High traffic

**Example:**
```env
HTTP_MAX_FREE_SOCKETS=10
```

---

### Playwright Browser Pool (GEO Checks)

#### `PLAYWRIGHT_MAX_BROWSERS`
- **Type:** Number
- **Default:** `3`
- **Description:** Maximum number of Playwright browser instances to pool
- **Capacity:** Each browser handles ~15 concurrent pages
- **Total GEO Capacity:** `PLAYWRIGHT_MAX_BROWSERS × 15`
- **File:** `server/src/services/geoRenderedContent.ts`
- **Recommendations:**
  - `1` - Low traffic (1-15 concurrent GEO checks)
  - `3` - Medium traffic (15-45 concurrent GEO checks) ⭐ **Recommended**
  - `5` - High traffic (45-75 concurrent GEO checks)
  - `10` - Very high traffic (75-150 concurrent GEO checks)

**Memory Impact:** ~300-500MB per browser instance

**Example:**
```env
PLAYWRIGHT_MAX_BROWSERS=3
```

#### `PLAYWRIGHT_IDLE_TIMEOUT`
- **Type:** Number (milliseconds)
- **Default:** `300000` (5 minutes)
- **Description:** Time before idle browsers are automatically closed
- **Impact:** Lower values = less memory, higher values = faster subsequent GEO checks
- **File:** `server/src/services/geoRenderedContent.ts`
- **Recommendations:**
  - `60000` (1 minute) - Development
  - `300000` (5 minutes) - Production ⭐ **Recommended**
  - `600000` (10 minutes) - High-traffic production
  - `0` - Never close (not recommended)

**Example:**
```env
PLAYWRIGHT_IDLE_TIMEOUT=300000
```

---

## Configuration Presets

### Low Traffic (1-10 concurrent users)

```env
# Rate limiting
AUDIT_SPAM_PROTECTION=5

# Server
PORT=80

# HTTP Performance
HTTP_MAX_SOCKETS=10
HTTP_MAX_FREE_SOCKETS=5

# Playwright Browser Pool
PLAYWRIGHT_MAX_BROWSERS=1
PLAYWRIGHT_IDLE_TIMEOUT=60000
```

**Capacity:**
- Regular audits: 10+ concurrent
- GEO checks: 15 concurrent
- Memory usage: ~500MB-1GB

---

### Medium Traffic (10-50 concurrent users) ⭐ **Recommended**

```env
# Rate limiting
AUDIT_SPAM_PROTECTION=5

# Server
PORT=80

# HTTP Performance
HTTP_MAX_SOCKETS=25
HTTP_MAX_FREE_SOCKETS=10

# Playwright Browser Pool
PLAYWRIGHT_MAX_BROWSERS=3
PLAYWRIGHT_IDLE_TIMEOUT=300000
```

**Capacity:**
- Regular audits: 50+ concurrent
- GEO checks: 45 concurrent
- Memory usage: ~1.5-2.5GB

---

### High Traffic (50-100 concurrent users)

```env
# Rate limiting
AUDIT_SPAM_PROTECTION=0  # Use reverse proxy rate limiting

# Server
PORT=80

# HTTP Performance
HTTP_MAX_SOCKETS=50
HTTP_MAX_FREE_SOCKETS=20

# Playwright Browser Pool
PLAYWRIGHT_MAX_BROWSERS=5
PLAYWRIGHT_IDLE_TIMEOUT=600000
```

**Capacity:**
- Regular audits: 100+ concurrent
- GEO checks: 75 concurrent
- Memory usage: ~2.5-4GB

---

### Very High Traffic (100+ concurrent users)

```env
# Rate limiting
AUDIT_SPAM_PROTECTION=0  # Use reverse proxy rate limiting

# Server
PORT=80

# HTTP Performance
HTTP_MAX_SOCKETS=100
HTTP_MAX_FREE_SOCKETS=40

# Playwright Browser Pool
PLAYWRIGHT_MAX_BROWSERS=10
PLAYWRIGHT_IDLE_TIMEOUT=600000
```

**Capacity:**
- Regular audits: 200+ concurrent
- GEO checks: 150 concurrent
- Memory usage: ~4-6GB

**Note:** For 100+ users, consider deploying multiple server instances behind a load balancer.

---

## Configuration Formulas

### Calculate HTTP_MAX_SOCKETS
```
HTTP_MAX_SOCKETS = Expected Concurrent Users × 0.5
```
**Example:** 50 users → 25 sockets

### Calculate HTTP_MAX_FREE_SOCKETS
```
HTTP_MAX_FREE_SOCKETS = HTTP_MAX_SOCKETS × 0.4
```
**Example:** 25 sockets → 10 free sockets

### Calculate PLAYWRIGHT_MAX_BROWSERS
```
PLAYWRIGHT_MAX_BROWSERS = Expected Concurrent GEO Checks ÷ 15
```
**Example:** 45 GEO checks → 3 browsers

### Calculate PLAYWRIGHT_IDLE_TIMEOUT
```
Low traffic: 60000 (1 minute)
Medium traffic: 300000 (5 minutes)
High traffic: 600000 (10 minutes)
```

---

## Performance Tuning

### Optimizing for Speed

Focus on reducing latency for individual audits:

```env
HTTP_MAX_SOCKETS=50          # More concurrent connections
HTTP_MAX_FREE_SOCKETS=20     # More keep-alive connections
PLAYWRIGHT_MAX_BROWSERS=5    # More browser instances
PLAYWRIGHT_IDLE_TIMEOUT=600000  # Keep browsers alive longer
```

### Optimizing for Memory

Focus on reducing memory footprint:

```env
HTTP_MAX_SOCKETS=10          # Fewer connections
HTTP_MAX_FREE_SOCKETS=3      # Fewer idle connections
PLAYWRIGHT_MAX_BROWSERS=1    # Single browser instance
PLAYWRIGHT_IDLE_TIMEOUT=60000   # Close browsers quickly
```

### Optimizing for Cost (Cloud Hosting)

Balance performance and resource usage:

```env
HTTP_MAX_SOCKETS=25
HTTP_MAX_FREE_SOCKETS=10
PLAYWRIGHT_MAX_BROWSERS=2
PLAYWRIGHT_IDLE_TIMEOUT=180000  # 3 minutes
```

---

## Troubleshooting

### Configuration not taking effect
1. Verify `.env` file is in project root
2. Restart the server after changing `.env`
3. Check for typos in variable names
4. Verify values are numbers (no quotes needed)

### Memory usage too high
**Possible causes:**
- `PLAYWRIGHT_MAX_BROWSERS` too high
- `PLAYWRIGHT_IDLE_TIMEOUT` too long
- Memory leak

**Solutions:**
1. Reduce `PLAYWRIGHT_MAX_BROWSERS` to 2
2. Reduce `PLAYWRIGHT_IDLE_TIMEOUT` to 180000 (3 minutes)
3. Monitor for memory leaks

### Audits are slow
**Possible causes:**
- `HTTP_MAX_SOCKETS` too low
- `PLAYWRIGHT_MAX_BROWSERS` too low
- Network latency

**Solutions:**
1. Increase `HTTP_MAX_SOCKETS` to 50
2. Increase `PLAYWRIGHT_MAX_BROWSERS` to 5
3. Check network connectivity

### GEO checks timing out
**Possible causes:**
- Too many concurrent GEO checks
- `PLAYWRIGHT_MAX_BROWSERS` too low
- Target sites are slow

**Solutions:**
1. Increase `PLAYWRIGHT_MAX_BROWSERS` to 5
2. Increase Playwright timeout in code
3. Consider making GEO checks optional

### Connection errors
**Possible causes:**
- `HTTP_MAX_SOCKETS` too low
- Network issues
- Target sites blocking requests

**Solutions:**
1. Increase `HTTP_MAX_SOCKETS` to 50
2. Check network connectivity
3. Verify User-Agent is not blocked
