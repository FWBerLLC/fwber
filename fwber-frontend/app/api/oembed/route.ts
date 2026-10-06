import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  return NextResponse.json({
    version: '1.0',
    type: 'rich',
    title: 'fwber.site - Social Network',
    provider_name: 'fwber.site',
    provider_url: process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.site',
    width: 600,
    height: 400,
    html: `<iframe src="${url}" width="600" height="400" frameborder="0"></iframe>`,
  });
}
