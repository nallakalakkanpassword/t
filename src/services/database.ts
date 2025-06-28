import { supabase, setCurrentUser } from '../lib/supabase';
import { User, Transaction, Message, Group, PublicMessage } from '../types';

export class DatabaseService {
  // Set current user for RLS
  static async setCurrentUser(username: string) {
    await setCurrentUser(username);
  }

  // User management
  static async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async saveUser(user: User): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'username' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateUserBalance(username: string, newBalance: number): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('username', username);
    
    if (error) throw error;
  }

  // Transactions
  static async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async addTransaction(transaction: Transaction): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUserTransactions(username: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_user.eq.${username},to_user.eq.${username}`)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Messages
  static async getMessages(): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data?.map(this.transformMessageFromDB) || [];
  }

  static async saveMessage(message: Message): Promise<Message> {
    const dbMessage = this.transformMessageToDB(message);
    
    const { data, error } = await supabase
      .from('messages')
      .upsert(dbMessage)
      .select()
      .single();
    
    if (error) throw error;
    return this.transformMessageFromDB(data);
  }

  static async getUserMessages(username: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        groups!messages_group_id_fkey(*)
      `)
      .or(`sender.eq.${username},recipient.eq.${username},reviewers.cs.{${username}}`)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data?.map(this.transformMessageFromDB) || [];
  }

  // Groups
  static async getGroups(): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async saveGroup(group: Group): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .upsert(group)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUserGroups(username: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .contains('members', [username])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Public Messages
  static async getPublicMessages(): Promise<PublicMessage[]> {
    const { data, error } = await supabase
      .from('public_messages')
      .select(`
        *,
        messages(*)
      `)
      .order('made_public_at', { ascending: false });
    
    if (error) throw error;
    return data?.map(item => ({
      ...item,
      message: item.messages ? this.transformMessageFromDB(item.messages) : undefined
    })) || [];
  }

  static async makeMessagePublic(messageId: string, username: string): Promise<PublicMessage> {
    const { data, error } = await supabase
      .from('public_messages')
      .insert({
        message_id: messageId,
        made_public_by: username
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async forwardMessage(originalMessageId: string, newMessage: Message): Promise<Message> {
    const messageToSave = {
      ...newMessage,
      forwarded_from: originalMessageId
    };
    return this.saveMessage(messageToSave);
  }

  // Transform functions for database compatibility
  private static transformMessageToDB(message: Message): any {
    return {
      ...message,
      attached_coins: message.attached_coins,
      two_letters: message.two_letters,
      timer_started: message.timer_started,
      like_dislike_timer: message.like_dislike_timer,
      like_dislike_timer_started: message.like_dislike_timer_started,
      reviewer_actions: message.reviewer_actions,
      reviewer_timer: message.reviewer_timer,
      current_reviewer_index: message.current_reviewer_index,
      reviewer_timers: message.reviewer_timers,
      is_timer_expired: message.is_timer_expired,
      is_like_dislike_timer_expired: message.is_like_dislike_timer_expired,
      coin_attachment_mode: message.coin_attachment_mode,
      game_result: message.game_result,
      user_percentages: message.user_percentages,
      reviewer_permissions: message.reviewer_permissions,
      is_public: message.is_public,
      forwarded_from: message.forwarded_from
    };
  }

  private static transformMessageFromDB(dbMessage: any): Message {
    return {
      ...dbMessage,
      attached_coins: dbMessage.attached_coins || {},
      two_letters: dbMessage.two_letters || {},
      timer_started: dbMessage.timer_started,
      like_dislike_timer: dbMessage.like_dislike_timer,
      like_dislike_timer_started: dbMessage.like_dislike_timer_started,
      reviewer_actions: dbMessage.reviewer_actions || {},
      reviewer_timer: dbMessage.reviewer_timer,
      current_reviewer_index: dbMessage.current_reviewer_index || 0,
      reviewer_timers: dbMessage.reviewer_timers || [],
      is_timer_expired: dbMessage.is_timer_expired || false,
      is_like_dislike_timer_expired: dbMessage.is_like_dislike_timer_expired || false,
      coin_attachment_mode: dbMessage.coin_attachment_mode || 'different',
      game_result: dbMessage.game_result,
      user_percentages: dbMessage.user_percentages || {},
      reviewer_permissions: dbMessage.reviewer_permissions || {},
      is_public: dbMessage.is_public || false,
      forwarded_from: dbMessage.forwarded_from
    };
  }
}