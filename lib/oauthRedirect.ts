export type OAuthRedirectResult =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string }
  | { kind: 'empty' };

export const parseOAuthRedirect = (url: string): OAuthRedirectResult => {
  const [beforeHash, fragment = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(fragment).forEach((value, key) => params.set(key, value));

  const error = params.get('error_description') ?? params.get('error');
  if (error) return { kind: 'error', message: error.replace(/\+/g, ' ') };

  const code = params.get('code');
  if (code) return { kind: 'code', code };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

  return { kind: 'empty' };
};
