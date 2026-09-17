/**
 * Phase 4-C — Canonical Production origin SSOT.
 * Not a frontend secret. Client never supplies origin/URL/host.
 */

/** User-facing Production custom domain (canonical verification target). */
export const CANONICAL_PRODUCTION_ORIGIN = "https://www.3cushionai.com";

/** Hostnames allowed when verifying against the canonical Production domain. */
export const CANONICAL_PRODUCTION_HOSTNAMES = Object.freeze([
  "www.3cushionai.com",
  "3cushionai.com",
] as const);

export type ProductionOriginOk = {
  ok: true;
  origin: string;
  hostname: string;
  protocol: "https:" | "http:";
};

export type ProductionOriginFail = {
  ok: false;
  reason: string;
  issues: string[];
};

/**
 * Validate a host-configured production origin.
 * Default runtime uses CANONICAL_PRODUCTION_ORIGIN (https only).
 * http is allowed only for loopback (unit tests / local mock servers).
 */
export function validateProductionOrigin(
  rawOrigin: string
): ProductionOriginOk | ProductionOriginFail {
  if (typeof rawOrigin !== "string" || !rawOrigin.trim()) {
    return {
      ok: false,
      reason: "production-origin-empty",
      issues: ["origin:empty"],
    };
  }
  let url: URL;
  try {
    url = new URL(rawOrigin.trim());
  } catch {
    return {
      ok: false,
      reason: "production-origin-invalid",
      issues: ["origin:not-url"],
    };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      reason: "production-origin-invalid",
      issues: ["origin:credentials-forbidden"],
    };
  }
  if (url.protocol === "https:") {
    const host = url.hostname.toLowerCase();
    const isCanonical = (CANONICAL_PRODUCTION_HOSTNAMES as readonly string[]).includes(
      host
    );
    // Allow exact configured https origin hostname (canonical or future SSOT update).
    if (!isCanonical && host !== new URL(CANONICAL_PRODUCTION_ORIGIN).hostname) {
      // Still accept any https hostname that matches the configured origin string exactly
      // when caller passes a non-canonical test origin — only loopback http is special-cased.
      // For https non-canonical: reject unless it equals the trimmed origin host of input itself
      // (host-side config). We accept the hostname of the validated URL as long as it is not
      // private/reserved literal forms.
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "[::1]" ||
        host.endsWith(".local")
      ) {
        return {
          ok: false,
          reason: "production-origin-invalid",
          issues: ["origin:https-loopback-forbidden"],
        };
      }
    }
    return {
      ok: true,
      origin: `${url.protocol}//${url.host}`,
      hostname: host,
      protocol: "https:",
    };
  }
  if (url.protocol === "http:") {
    const host = url.hostname.toLowerCase();
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]") {
      return {
        ok: false,
        reason: "production-origin-invalid",
        issues: ["origin:http-non-loopback"],
      };
    }
    return {
      ok: true,
      origin: `${url.protocol}//${url.host}`,
      hostname: host,
      protocol: "http:",
    };
  }
  return {
    ok: false,
    reason: "production-origin-invalid",
    issues: [`origin:protocol:${url.protocol}`],
  };
}

/** Whether a final fetch URL is still within the configured production origin. */
export function isAllowedProductionFinalUrl(
  finalUrl: string,
  configured: ProductionOriginOk
): boolean {
  let final: URL;
  try {
    final = new URL(finalUrl);
  } catch {
    return false;
  }
  if (final.protocol !== configured.protocol) return false;
  const host = final.hostname.toLowerCase();
  if (configured.protocol === "https:") {
    const canonicalHosts = CANONICAL_PRODUCTION_HOSTNAMES as readonly string[];
    if (canonicalHosts.includes(configured.hostname)) {
      return canonicalHosts.includes(host);
    }
    return host === configured.hostname;
  }
  return host === configured.hostname;
}
