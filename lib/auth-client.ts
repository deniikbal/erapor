import type { User } from './db';

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const userStr = localStorage.getItem('currentUser');
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}

export function removeCurrentUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
  }
}
