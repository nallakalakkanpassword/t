export interface User {
  username: string;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
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

export interface Message {
  id: string;
  sender: string;
  recipient?: string;
  groupId?: string;
  content: string;
  timestamp: string;
  attachedCoins: { [username: string]: number };
  twoLetters: { [username: string]: string };
  likes: string[];
  dislikes: string[];
  timer: number; // in minutes - main timer
  timerStarted: string;
  likeDislikeTimer: number; // in minutes - like/dislike timer
  likeDislikeTimerStarted: string;
  percentage?: number;
  reviewers: string[]; // Multiple reviewers (up to 10)
  reviewerActions: { [username: string]: ReviewerAction }; // Track reviewer actions
  reviewerTimer?: number; // Timer between reviewer phases (mandatory if multiple reviewers)
  currentReviewerIndex: number; // Which reviewer is currently active (0-based)
  reviewerTimers: ReviewerTimer[]; // Track each reviewer's timer
  isTimerExpired: boolean;
  isLikeDislikeTimerExpired: boolean;
  coinAttachmentMode: 'same' | 'different';
  gameResult?: {
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
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
}