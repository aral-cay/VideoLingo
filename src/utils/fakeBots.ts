/**
 * Fake Bot Data for Leaderboard
 * These bots populate the leaderboard to ensure there are always enough participants
 */

export interface FakeBot {
  username: string;
  participantId: string; // Fake ID for identification
  dailyXP: number[]; // XP gained per day [Day 1, Day 2, Day 3, ...]
}

export const FAKE_BOTS: FakeBot[] = [
  {
    username: 'Turbomoth',
    participantId: 'fake-bot-1',
    dailyXP: [35, 40, 30], // XP per day in 3-day cycle (repeats for days 4-6)
  },
  {
    username: 'Batman',
    participantId: 'fake-bot-2',
    dailyXP: [25, 70, 20], // XP per day in 3-day cycle
  },
  {
    username: 'Tyler the creator',
    participantId: 'fake-bot-3',
    dailyXP: [40, 25, 35], // XP per day in 3-day cycle
  },
  {
    username: 'DrakeMaye-O',
    participantId: 'fake-bot-4',
    dailyXP: [15, 45, 25], // XP per day in 3-day cycle
  },
  {
    username: 'Lil Asparagus',
    participantId: 'fake-bot-5',
    dailyXP: [50, 40, 50], // XP per day in 3-day cycle
  },
];

/**
 * Calculate total XP for a fake bot based on the current day
 * XP resets every 3 days (matching the condition switch in the study)
 * Uses modulo to cycle through the dailyXP array
 */
export function getFakeBotXP(bot: FakeBot, dayNumber: number): number {
  // Ensure dayNumber is at least 1
  const currentDay = Math.max(1, dayNumber || 1);
  
  // Calculate position within current 3-day cycle (0, 1, or 2)
  const dayInCycle = (currentDay - 1) % 3;
  
  // Accumulate XP from start of current cycle up to current day
  let totalXP = 0;
  for (let i = 0; i <= dayInCycle; i++) {
    totalXP += bot.dailyXP[i] || 0;
  }
  
  return totalXP;
}

/**
 * Get all fake bots with their current XP based on day number
 */
export function getFakeBotsWithXP(dayNumber: number): Array<{ username: string; xp: number; participantId: string }> {
  return FAKE_BOTS.map(bot => ({
    username: bot.username,
    xp: getFakeBotXP(bot, dayNumber),
    participantId: bot.participantId,
  }));
}

