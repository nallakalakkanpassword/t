import { User, Transaction, Message, Group } from '../types';

const STORAGE_KEYS = {
  USERS: 'royal_cats_users',
  TRANSACTIONS: 'royal_cats_transactions',
  MESSAGES: 'royal_cats_messages',
  GROUPS: 'royal_cats_groups',
  CURRENT_USER: 'royal_cats_current_user'
};

export const StorageUtils = {
  // User management
  getUsers(): User[] {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
  },

  saveUser(user: User): void {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.username === user.username);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getUserByUsername(username: string): User | null {
    const users = this.getUsers();
    return users.find(u => u.username === username) || null;
  },

  updateUserBalance(username: string, newBalance: number): void {
    const user = this.getUserByUsername(username);
    if (user) {
      user.balance = newBalance;
      this.saveUser(user);
    }
  },

  // Current user session
  setCurrentUser(username: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, username);
  },

  getCurrentUser(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // Transactions
  getTransactions(): Transaction[] {
    const transactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return transactions ? JSON.parse(transactions) : [];
  },

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getUserTransactions(username: string): Transaction[] {
    const transactions = this.getTransactions();
    return transactions.filter(t => t.from === username || t.to === username);
  },

  // Messages
  getMessages(): Message[] {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return messages ? JSON.parse(messages) : [];
  },

  saveMessage(message: Message): void {
    const messages = this.getMessages();
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  getUserMessages(username: string): Message[] {
    const messages = this.getMessages();
    return messages.filter(m => 
      m.sender === username || 
      m.recipient === username ||
      (m.groupId && this.getGroups().find(g => g.id === m.groupId)?.members.includes(username))
    );
  },

  // Groups
  getGroups(): Group[] {
    const groups = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return groups ? JSON.parse(groups) : [];
  },

  saveGroup(group: Group): void {
    const groups = this.getGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  },

  getUserGroups(username: string): Group[] {
    const groups = this.getGroups();
    return groups.filter(g => g.members.includes(username));
  }
};