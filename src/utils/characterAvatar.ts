/**
 * Character Avatar Utility
 * Maps usernames to their character avatars
 */

// Import character images
import BlueGuyStanding from '../assets/characters/Blue_guy_standing.png';
import BlueGuyNeutral from '../assets/characters/Blue_guy_neutral.png';
import BlueGuyHappy from '../assets/characters/Blue_guy_happy.png';
import BlueGuySad from '../assets/characters/Blue_guy_sad.png';
import BlueGuyProfile from '../assets/characters/Blue_guy_profile.png';

import PurpleGuyStanding from '../assets/characters/Purple_guy_standing.png';
import PurpleGuyNeutral from '../assets/characters/Purple_guy_neutral.png';
import PurpleGuyHappy from '../assets/characters/Purple_guy_happy.png';
import PurpleGuySad from '../assets/characters/Purple_guy_sad.png';
import PurpleGuyProfile from '../assets/characters/Purple_guy_profile.png';

import GoldWomanStanding from '../assets/characters/Gold_woman_standing.png';
import GoldWomanNeutral from '../assets/characters/Gold_woman_neutral.png';
import GoldWomanHappy from '../assets/characters/Gold_woman_happy.png';
import GoldWomanSad from '../assets/characters/Gold_woman_sad.png';
import GoldWomanProfile from '../assets/characters/Gold_woman_profile.png';

import GreenWomanStanding from '../assets/characters/Green_woman_standing.png';
import GreenWomanNeutral from '../assets/characters/Green_woman_neutral.png';
import GreenWomanHappy from '../assets/characters/Green_woman_happy.png';
import GreenWomanSad from '../assets/characters/Green_woman_sad.png';
import GreenWomanProfile from '../assets/characters/Green_woman_profile.png';

export type CharacterEmotion = 'standing' | 'neutral' | 'happy' | 'sad' | 'profile';

export type CharacterType = 'blue' | 'gold' | 'green' | 'purple';

export interface CharacterImages {
  standing: string;
  neutral: string;
  happy: string;
  sad: string;
  profile: string;
}

const CHARACTER_MAP: Record<CharacterType, CharacterImages> = {
  'purple': {
    standing: PurpleGuyStanding,
    neutral: PurpleGuyNeutral,
    happy: PurpleGuyHappy,
    sad: PurpleGuySad,
    profile: PurpleGuyProfile,
  },
  'blue': {
    standing: BlueGuyStanding,
    neutral: BlueGuyNeutral,
    happy: BlueGuyHappy,
    sad: BlueGuySad,
    profile: BlueGuyProfile,
  },
  'green': {
    standing: GreenWomanStanding,
    neutral: GreenWomanNeutral,
    happy: GreenWomanHappy,
    sad: GreenWomanSad,
    profile: GreenWomanProfile,
  },
  'gold': {
    standing: GoldWomanStanding,
    neutral: GoldWomanNeutral,
    happy: GoldWomanHappy,
    sad: GoldWomanSad,
    profile: GoldWomanProfile,
  },
};

/**
 * Get character images by character type
 */
export function getCharacterImagesByType(character: CharacterType | string | null): CharacterImages {
  if (!character || !(character in CHARACTER_MAP)) {
    return CHARACTER_MAP['gold']; // Default to gold
  }
  return CHARACTER_MAP[character as CharacterType];
}

/**
 * Get character images for a given username (deprecated - use getCharacterImagesByType)
 * @deprecated Use getCharacterImagesByType with character field instead
 */
export function getCharacterImages(_username: string | null): CharacterImages {
  // Fallback for backward compatibility
  return CHARACTER_MAP['gold'];
}

/**
 * Get a specific character image by emotion
 */
export function getCharacterImage(character: string | null, emotion: CharacterEmotion): string {
  const images = getCharacterImagesByType(character);
  return images[emotion];
}

