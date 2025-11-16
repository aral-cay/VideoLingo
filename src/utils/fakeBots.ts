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
    dailyXP: [35, 40, 30], // Day 1: 35, Day 2: 40, Day 3: 30
  },
  {
    username: 'Batman',
    participantId: 'fake-bot-2',
    dailyXP: [25, 70, 20], // Day 1: 25, Day 2: 70, Day 3: 20
  },
  {
    username: 'Tyler the creator',
    participantId: 'fake-bot-3',
    dailyXP: [40, 25, 35], // Day 1: 40, Day 2: 25, Day 3: 35
  },
  {
    username: 'BadBunny2000',
    participantId: 'fake-bot-4',
    dailyXP: [15, 45, 25], // Day 1: 15, Day 2: 45, Day 3: 25
  },
  {
    username: 'Lil Asparagus',
    participantId: 'fake-bot-5',
    dailyXP: [50, 40, 50], // Day 1: 50, Day 2: 40, Day 3: 50
  },
];

/**
 * Calculate total XP for a fake bot based on the current day
 * XP is cumulative (total XP up to the current day)
 */
export function getFakeBotXP(bot: FakeBot, dayNumber: number): number {
  // Ensure dayNumber is at least 1
  const currentDay = Math.max(1, dayNumber || 1);
  let totalXP = 0;
  // Sum XP from day 1 up to the current day
  for (let day = 1; day <= currentDay && day <= bot.dailyXP.length; day++) {
    totalXP += bot.dailyXP[day - 1];
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

