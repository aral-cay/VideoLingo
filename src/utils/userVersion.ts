/**
 * User Version Detection
 * Determines if a participant should see the gamified or control version
 * based on their condition
 */

import { Condition } from './studyCondition';

export function isGamifiedVersion(condition: Condition | null): boolean {
  return condition === 'experimental';
}

export function isControlVersion(condition: Condition | null): boolean {
  return condition === 'control';
}

export function getUserVersion(condition: Condition | null): 'gamified' | 'control' {
  return isGamifiedVersion(condition) ? 'gamified' : 'control';
}

