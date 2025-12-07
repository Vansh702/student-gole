export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface UserProfile {
  name: string;
  bio: string;
  avatarUrl: string;
  credits: number;
}

export interface DailyRecord {
  id: string;
  date: string;
  goals: Goal[];
  score: number; // 0-100
  summary: string; // AI Generated feedback
  completionRate: number;
}

export interface AppState {
  user: UserProfile;
  currentGoals: Goal[];
  history: DailyRecord[];
}

export type ViewState = 'dashboard' | 'profile' | 'history';