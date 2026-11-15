import { NextResponse } from 'next/server';

function getBackendApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4003/api';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const res = await fetch(`${getBackendApiBase()}/bulletin-boards${url.search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization') as string }
          : {}),
      },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    console.error('Bulletin boards proxy error:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch boards' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const res = await fetch(`${getBackendApiBase()}/bulletin-boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization') as string }
          : {}),
      },
      body,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    console.error('Bulletin boards POST proxy error:', e);
    return NextResponse.json({ error: e.message || 'Failed to create board' }, { status: 500 });
  }
}
