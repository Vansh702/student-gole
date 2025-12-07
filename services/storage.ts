import { AppState, UserProfile, Goal, DailyRecord } from '../types';

const STORAGE_KEY = 'goalkeeper_data_v1';

const DEFAULT_USER: UserProfile = {
  name: 'Student User',
  bio: 'Aspiring Achiever',
  avatarUrl: '', // Will fallback to default in UI
  credits: 0,
};

const DEFAULT_STATE: AppState = {
  user: DEFAULT_USER,
  currentGoals: [],
  history: [],
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state', error);
  }
};

export const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (error) {
    console.error('Failed to load state', error);
    return DEFAULT_STATE;
  }
};