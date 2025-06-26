export interface User {
  id?: string;
  username: string;
  balance: number;
  created_at?: string;
}

export interface Transaction {
  id?: string;
  from_user: string;
  to_user: string;
  amount: number;
  timestamp?: string;
  type: 'send' | 'receive';
}

export interface ReviewerAction {
  username: string;
  letters?: string;
  liked: boolean;
  disliked: boolean;
  hasActed: boolean;
  actionTimestamp?: string;
}

export interface ReviewerTimer {
  reviewerIndex: number;
  startTime: string;
  duration: number; // in minutes
  isActive: boolean;
  isExpired: boolean;
}

export interface UserPercentage {
  username: string;
  percentage: number;
  liked: boolean;
  disliked: boolean;
  hasActed: boolean;
}

export interface ReviewerPermission {
  username: string;
  hasPermission: boolean;
  grantedBy: string;
  grantedAt: string;
}

export interface Message {
  id?: string;
  sender: string;
  recipient?: string;
  group_id?: string;
  content: string;
  timestamp?: string;
  attached_coins: { [username: string]: number };
  two_letters: { [username: string]: string };
  likes: string[];
  dislikes: string[];
  timer: number; // in minutes - main timer
  timer_started?: string;
  like_dislike_timer: number; // in minutes - like/dislike timer
  like_dislike_timer_started?: string;
  percentage?: number;
  reviewers: string[]; // Multiple reviewers (up to 10)
  reviewer_actions: { [username: string]: ReviewerAction }; // Track reviewer actions
  reviewer_timer?: number; // Timer between reviewer phases (mandatory if multiple reviewers)
  current_reviewer_index: number; // Which reviewer is currently active (0-based)
  reviewer_timers: ReviewerTimer[]; // Track each reviewer's timer
  is_timer_expired: boolean;
  is_like_dislike_timer_expired: boolean;
  coin_attachment_mode: 'same' | 'different';
  user_percentages: { [username: string]: UserPercentage }; // User percentage settings
  reviewer_permissions: { [username: string]: ReviewerPermission }; // Reviewer access permissions
  is_public: boolean;
  forwarded_from?: string;
  game_result?: {
    distributionType: 'unanimous_likes' | 'reviewer_decision';
    reviewerIndex?: number; // Which reviewer made the final decision
    winners: string[];
    losers: string[];
    coinsDistributed: { [username: string]: number };
    coinsReturned: { [username: string]: number };
    reviewerBonus?: number;
    penaltyCoinsDistributed?: { [username: string]: number }; // Extra penalty coins from different letters
  };
}

export interface Group {
  id?: string;
  name: string;
  members: string[];
  created_by: string;
  created_at?: string;
}

export interface PublicMessage {
  id?: string;
  message_id: string;
  made_public_by: string;
  made_public_at?: string;
  message?: Message;
}