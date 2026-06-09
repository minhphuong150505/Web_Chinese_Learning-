import type { HskLevelData } from '../types';
import { hsk1 } from './hsk1';
import { hsk2 } from './hsk2';
import { hsk3 } from './hsk3';
import { hsk4 } from './hsk4';

export const HSK_LEVELS: HskLevelData[] = [hsk1, hsk2, hsk3, hsk4];

export function getLevel(level: number): HskLevelData {
  return HSK_LEVELS.find((entry) => entry.level === level) ?? hsk1;
}
