export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          balance: number
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          balance?: number
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          members: string[]
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          members: string[]
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          members?: string[]
          created_by?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender: string
          recipient: string | null
          group_id: string | null
          content: string
          timestamp: string
          attached_coins: Json
          two_letters: Json
          likes: string[]
          dislikes: string[]
          timer: number
          timer_started: string
          like_dislike_timer: number
          like_dislike_timer_started: string
          percentage: number | null
          reviewers: string[]
          reviewer_actions: Json
          reviewer_timer: number | null
          current_reviewer_index: number
          reviewer_timers: Json
          is_timer_expired: boolean
          is_like_dislike_timer_expired: boolean
          coin_attachment_mode: string
          game_result: Json | null
          user_percentages: Json
          reviewer_permissions: Json
          is_public: boolean
          forwarded_from: string | null
        }
        Insert: {
          id?: string
          sender: string
          recipient?: string | null
          group_id?: string | null
          content: string
          timestamp?: string
          attached_coins?: Json
          two_letters?: Json
          likes?: string[]
          dislikes?: string[]
          timer?: number
          timer_started?: string
          like_dislike_timer?: number
          like_dislike_timer_started?: string
          percentage?: number | null
          reviewers?: string[]
          reviewer_actions?: Json
          reviewer_timer?: number | null
          current_reviewer_index?: number
          reviewer_timers?: Json
          is_timer_expired?: boolean
          is_like_dislike_timer_expired?: boolean
          coin_attachment_mode?: string
          game_result?: Json | null
          user_percentages?: Json
          reviewer_permissions?: Json
          is_public?: boolean
          forwarded_from?: string | null
        }
        Update: {
          id?: string
          sender?: string
          recipient?: string | null
          group_id?: string | null
          content?: string
          timestamp?: string
          attached_coins?: Json
          two_letters?: Json
          likes?: string[]
          dislikes?: string[]
          timer?: number
          timer_started?: string
          like_dislike_timer?: number
          like_dislike_timer_started?: string
          percentage?: number | null
          reviewers?: string[]
          reviewer_actions?: Json
          reviewer_timer?: number | null
          current_reviewer_index?: number
          reviewer_timers?: Json
          is_timer_expired?: boolean
          is_like_dislike_timer_expired?: boolean
          coin_attachment_mode?: string
          game_result?: Json | null
          user_percentages?: Json
          reviewer_permissions?: Json
          is_public?: boolean
          forwarded_from?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          from_user: string
          to_user: string
          amount: number
          timestamp: string
          type: string
        }
        Insert: {
          id?: string
          from_user: string
          to_user: string
          amount: number
          timestamp?: string
          type: string
        }
        Update: {
          id?: string
          from_user?: string
          to_user?: string
          amount?: number
          timestamp?: string
          type?: string
        }
      }
      public_messages: {
        Row: {
          id: string
          message_id: string
          made_public_by: string
          made_public_at: string
        }
        Insert: {
          id?: string
          message_id: string
          made_public_by: string
          made_public_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          made_public_by?: string
          made_public_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_config: {
        Args: {
          setting_name: string
          setting_value: string
          is_local: boolean
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}