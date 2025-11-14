/**
 * User Version Detection
 * Determines if a user should see the gamified or control version
 */

const GAMIFIED_USERS = ['Aral', 'Test', 'Nikhil'];
const CONTROL_USERS = ['Kabir', 'Luca'];

export function isGamifiedUser(username: string | null): boolean {
  if (!username) return false;
  return GAMIFIED_USERS.includes(username);
}

export function isControlUser(username: string | null): boolean {
  if (!username) return false;
  return CONTROL_USERS.includes(username);
}

export function getUserVersion(username: string | null): 'gamified' | 'control' {
  return isGamifiedUser(username) ? 'gamified' : 'control';
}

