/**
 * Study Types
 * Simple type definitions for the study
 */

export type Cohort = 'A' | 'B';
export type Condition = 'experimental' | 'control';

/**
 * Determine if a condition should show gamified features
 */
export function isGamifiedCondition(condition: Condition): boolean {
  return condition === 'experimental';
}

