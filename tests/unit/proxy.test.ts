import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createServerClientMock = vi.hoisted(() => vi.fn());

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));

import proxy from '@/proxy';

const authHeaders = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
};

function mockRefresh(claims: object | null) {
  createServerClientMock.mockImplementation(
    (
      _url: string,
      _key: string,
      options: {
        cookies: {
          setAll: (
            cookies: { name: string; value: string; options: { path: string } }[],
            headers: Record<string, string>,
          ) => void;
        };
      },
    ) => ({
      auth: {
        getClaims: async () => {
          options.cookies.setAll(
            [{ name: 'sb-session', value: 'refreshed', options: { path: '/' } }],
            authHeaders,
          );
          return { data: { claims } };
        },
      },
    }),
  );
}

function expectRefreshState(response: Response) {
  expect(response.headers.get('cache-control')).toBe(authHeaders['Cache-Control']);
  expect(response.headers.get('expires')).toBe(authHeaders.Expires);
  expect(response.headers.get('pragma')).toBe(authHeaders.Pragma);
  expect(response.headers.get('set-cookie')).toContain('sb-session=refreshed');
}

afterEach(() => {
  createServerClientMock.mockReset();
  vi.unstubAllEnvs();
});

describe('Supabase session refresh responses', () => {
  it('applies the supplied anti-cache headers to a continued response', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    mockRefresh({ sub: 'user-id' });

    const response = await proxy(new NextRequest('https://credit-count.test/dashboard'));

    expectRefreshState(response);
    expect(response.headers.get('location')).toBeNull();
  });

  it('preserves the supplied anti-cache headers on a redirect', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    mockRefresh(null);

    const response = await proxy(new NextRequest('https://credit-count.test/dashboard'));

    expectRefreshState(response);
    expect(response.headers.get('location')).toBe(
      'https://credit-count.test/sign-in?next=%2Fdashboard',
    );
  });
});
