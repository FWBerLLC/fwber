import { NextRequest, NextResponse } from 'next/server';

// oEmbed discovery (advertised via <link rel="alternate"
// type="application/json+oembed"> in the root metadata). Only fwber's own
// URLs are embeddable: an arbitrary `url` would otherwise be reflected
// into the iframe HTML we hand to third-party consumers.
const ALLOWED_HOSTS = new Set(['fwber.online', 'www.fwber.online']);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'URL not found' }, { status: 404 });
  }

  const providerUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.online';
  const safeUrl = parsed.toString();

  return NextResponse.json({
    version: '1.0',
    type: 'rich',
    title: 'fwber.online - Social Network',
    provider_name: 'fwber.online',
    provider_url: providerUrl,
    width: 600,
    height: 400,
    html: `<iframe src="${safeUrl}" width="600" height="400" frameborder="0" allowfullscreen></iframe>`,
  });
}
