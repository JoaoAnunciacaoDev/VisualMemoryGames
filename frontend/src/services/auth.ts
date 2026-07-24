const LOGGED_IN_KEY = 'logged_in';

export const getToken = (): string | null => {
  const loggedIn = localStorage.getItem(LOGGED_IN_KEY) === 'true' || sessionStorage.getItem(LOGGED_IN_KEY) === 'true';
  return loggedIn ? 'session' : null;
};

export const setToken = (token: string, rememberMe = false): void => {
  if (rememberMe) {
    localStorage.setItem(LOGGED_IN_KEY, 'true');
  } else {
    sessionStorage.setItem(LOGGED_IN_KEY, 'true');
  }
};

export const clearToken = (): void => {
  localStorage.removeItem(LOGGED_IN_KEY);
  sessionStorage.removeItem(LOGGED_IN_KEY);
};

export const isAuthenticated = (): boolean => !!getToken();