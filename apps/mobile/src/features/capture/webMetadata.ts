/**
 * Web Metadata Utility
 *
 * Extracts page title and OpenGraph metadata from a public URL.
 */

export interface WebMetadata {
  title: string | null;
  description: string | null;
  hostname: string;
}

export function extractHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function parseHtmlMetadata(html: string, fallbackUrl: string): WebMetadata {
  const hostname = extractHostname(fallbackUrl);

  // Extract <meta property="og:title" content="..."> or name="twitter:title"
  const ogTitleMatch =
    html.match(/<meta\s+[^>]*property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    html.match(/<meta\s+[^>]*name=["']twitter:title["']\s+content=["']([^"']+)["']/i);

  // Extract <title>...</title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  // Extract <meta property="og:description" content="..."> or name="description"
  const ogDescMatch =
    html.match(/<meta\s+[^>]*property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
    html.match(/<meta\s+[^>]*name=["']description["']\s+content=["']([^"']+)["']/i);

  const rawTitle = ogTitleMatch?.[1] || titleMatch?.[1] || null;
  const rawDescription = ogDescMatch?.[1] || null;

  // Clean HTML entities if any
  const cleanTitle = rawTitle
    ? rawTitle
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    : null;

  const cleanDesc = rawDescription
    ? rawDescription
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    : null;

  return {
    title: cleanTitle || hostname,
    description: cleanDesc,
    hostname,
  };
}

export async function fetchWebMetadata(url: string): Promise<WebMetadata | null> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        title: extractHostname(trimmed),
        description: null,
        hostname: extractHostname(trimmed),
      };
    }

    const html = await response.text();
    return parseHtmlMetadata(html, trimmed);
  } catch {
    return {
      title: extractHostname(trimmed),
      description: null,
      hostname: extractHostname(trimmed),
    };
  }
}
