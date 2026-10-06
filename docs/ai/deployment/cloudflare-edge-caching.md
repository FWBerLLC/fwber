# Cloudflare Multi-Region Edge Caching Strategy

> **Version:** 1.4.1  
> **Status:** Recommended configuration for production deployment.

To achieve ultra-low latency for `fwber` users globally, we leverage Cloudflare's Global Edge Network in front of our Vercel frontend and Hetzner-hosted backend services.

## 1. Cloudflare Page Rules

The following page rules should be configured in the Cloudflare Dashboard for `fwber.site`.

### Rule 1: Static Assets Performance
*   **Match:** `fwber.site/_next/static/*`
*   **Settings:**
    *   **Cache Level:** Cache Everything
    *   **Edge Cache TTL:** 1 Month
    *   **Browser Cache TTL:** 1 Month
    *   **Origin Cache Control:** On

### Rule 2: Image Optimization Edge
*   **Match:** `fwber.site/images/*` or `api.fwber.site/storage/photos/*`
*   **Settings:**
    *   **Cache Level:** Cache Everything
    *   **Edge Cache TTL:** 7 Days
    *   **IP Geolocation:** On (to serve closest edge variant)
    *   **Image Resizing:** On (Cloudflare Pro+)

### Rule 3: API Security & Bypass
*   **Match:** `api.fwber.site/*`
*   **Settings:**
    *   **Cache Level:** Bypass (Ensure real-time match data is never stale)
    *   **Security Level:** High
    *   **Bot Fight Mode:** On

## 2. Next.js Configuration

The `next.config.js` has been updated to include immutable cache headers for:
- `/_next/static/*`
- `/static/*`
- `/fonts/*`
- `/images/*` (with revalidation)

## 3. Global Database & Geo-Screener
The Rust `fwber-geo` service is designed to be deployed as a sidecar or a globally distributed set of pods. Using the Helm chart, we can deploy `fwber-geo` instances in multiple K8s clusters across regions (e.g., US-East, US-West, EU-West) and use Cloudflare Load Balancing to route user requests to the nearest spatial index.

## 4. Cache Invalidation
When a new version is released:
1.  **Vercel:** New deployments automatically invalidate the `/_next/static` cache by using unique build IDs.
2.  **Cloudflare:** A purge of the cache for `/_next/static/*` should be triggered via CI/CD (GitHub Actions) using the Cloudflare API.
3.  **Media:** If a user updates their profile photo, the backend uses a unique UUID for the new path, ensuring the cache is bypassed for the new content while the old content eventually expires.
