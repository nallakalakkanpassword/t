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
  reviewer?: string;
  isTimerExpired: boolean;
  isLikeDislikeTimerExpired: boolean;
  coinAttachmentMode: 'same' | 'different'; // New: coin attachment mode
  gameResult?: {
    distributionType: 'unanimous_likes' | 'reviewer_decision';
    winners: string[];
    losers: string[];
    coinsDistributed: { [username: string]: number };
    coinsReturned: { [username: string]: number };
    reviewerBonus?: number; // New: reviewer bonus from penalty coins
  };
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
}