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

export interface CharacterImages {
  standing: string;
  neutral: string;
  happy: string;
  sad: string;
  profile: string;
}

const CHARACTER_MAP: Record<string, CharacterImages> = {
  'Nikhil': {
    standing: PurpleGuyStanding,
    neutral: PurpleGuyNeutral,
    happy: PurpleGuyHappy,
    sad: PurpleGuySad,
    profile: PurpleGuyProfile,
  },
  'Aral': {
    standing: BlueGuyStanding,
    neutral: BlueGuyNeutral,
    happy: BlueGuyHappy,
    sad: BlueGuySad,
    profile: BlueGuyProfile,
  },
  'Test': {
    standing: GreenWomanStanding,
    neutral: GreenWomanNeutral,
    happy: GreenWomanHappy,
    sad: GreenWomanSad,
    profile: GreenWomanProfile,
  },
  // Default to Gold Woman for any other gamified users
  'default': {
    standing: GoldWomanStanding,
    neutral: GoldWomanNeutral,
    happy: GoldWomanHappy,
    sad: GoldWomanSad,
    profile: GoldWomanProfile,
  },
};

/**
 * Get character images for a given username
 */
export function getCharacterImages(username: string | null): CharacterImages {
  if (!username) {
    return CHARACTER_MAP['default'];
  }
  return CHARACTER_MAP[username] || CHARACTER_MAP['default'];
}

/**
 * Get a specific character image by emotion
 */
export function getCharacterImage(username: string | null, emotion: CharacterEmotion): string {
  const images = getCharacterImages(username);
  return images[emotion];
}

