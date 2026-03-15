export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_invites: {
        Row: {
          created_at: string
          currency: string
          from_user_id: string
          game_id: string | null
          id: string
          stake_amount: number
          status: string
          time_control: number
          to_user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          from_user_id: string
          game_id?: string | null
          id?: string
          stake_amount?: number
          status?: string
          time_control?: number
          to_user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          from_user_id?: string
          game_id?: string | null
          id?: string
          stake_amount?: number
          status?: string
          time_control?: number
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_invites_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_messages: {
        Row: {
          content: string
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_games: {
        Row: {
          id: string
          creator_user_id: string
          joiner_user_id: string | null
          status: 'waiting' | 'pending_accept' | 'in_progress' | 'finished' | 'cancelled' | 'expired'
          time_control_minutes: number
          increment_seconds: number
          mode: 'bullet' | 'blitz' | 'rapid' | 'custom'
          creator_rating_snapshot: number
          creator_games_played_snapshot: number
          joiner_rating_snapshot: number | null
          joiner_games_played_snapshot: number | null
          accept_creator: boolean
          accept_joiner: boolean
          accept_deadline_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_user_id: string
          joiner_user_id?: string | null
          status?: 'waiting' | 'pending_accept' | 'in_progress' | 'finished' | 'cancelled' | 'expired'
          time_control_minutes: number
          increment_seconds?: number
          mode: 'bullet' | 'blitz' | 'rapid' | 'custom'
          creator_rating_snapshot: number
          creator_games_played_snapshot: number
          joiner_rating_snapshot?: number | null
          joiner_games_played_snapshot?: number | null
          accept_creator?: boolean
          accept_joiner?: boolean
          accept_deadline_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          joiner_user_id?: string | null
          status?: 'waiting' | 'pending_accept' | 'in_progress' | 'finished' | 'cancelled' | 'expired'
          accept_creator?: boolean
          accept_joiner?: boolean
          accept_deadline_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_games_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_games_joiner_user_id_fkey"
            columns: ["joiner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          id: string
          lobby_id: string | null
          status: 'in_progress' | 'finished' | 'cancelled'
          white_user_id: string
          black_user_id: string
          fen: string
          pgn: string | null
          moves: Json | null
          time_control_minutes: number
          increment_seconds: number
          white_time_ms: number
          black_time_ms: number
          last_move_at: string | null
          winner_user_id: string | null
          result: 'white' | 'black' | 'draw' | 'cancelled' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lobby_id?: string | null
          status?: 'in_progress' | 'finished' | 'cancelled'
          white_user_id: string
          black_user_id: string
          fen?: string
          pgn?: string | null
          moves?: Json | null
          time_control_minutes: number
          increment_seconds?: number
          white_time_ms: number
          black_time_ms: number
          last_move_at?: string | null
          winner_user_id?: string | null
          result?: 'white' | 'black' | 'draw' | 'cancelled' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'in_progress' | 'finished' | 'cancelled'
          fen?: string
          pgn?: string | null
          moves?: Json | null
          white_time_ms?: number
          black_time_ms?: number
          last_move_at?: string | null
          winner_user_id?: string | null
          result?: 'white' | 'black' | 'draw' | 'cancelled' | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_white_user_id_fkey"
            columns: ["white_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_black_user_id_fkey"
            columns: ["black_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          payload: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string | null
          country_code: string | null
          rating_rapid: number
          rating_blitz: number
          rating_bullet: number
          games_played: number
          wins: number
          losses: number
          draws: number
          settings: Json | null
          wallet_address: string | null
          preferred_wallet: string | null
          balance: number
          balance_usdt: number
          total_deposited: number
          total_withdrawn: number
          total_won: number
          total_won_usdt: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string | null
          country_code?: string | null
          rating_rapid?: number
          rating_blitz?: number
          rating_bullet?: number
          games_played?: number
          wins?: number
          losses?: number
          draws?: number
          settings?: Json | null
          wallet_address?: string | null
          preferred_wallet?: string | null
          balance?: number
          balance_usdt?: number
          total_deposited?: number
          total_withdrawn?: number
          total_won?: number
          total_won_usdt?: number
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          updated_at?: string | null
          country_code?: string | null
          rating_rapid?: number
          rating_blitz?: number
          rating_bullet?: number
          games_played?: number
          wins?: number
          losses?: number
          draws?: number
          settings?: Json | null
          wallet_address?: string | null
          preferred_wallet?: string | null
          balance?: number
          balance_usdt?: number
          total_deposited?: number
          total_withdrawn?: number
          total_won?: number
          total_won_usdt?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          tx_hash: string | null
          type: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          tx_hash?: string | null
          type: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          tx_hash?: string | null
          type?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
