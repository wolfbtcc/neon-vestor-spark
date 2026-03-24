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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      commissions: {
        Row: {
          amount: number
          created_at: string
          deposit_id: string | null
          from_user_id: string
          from_user_name: string | null
          id: string
          level: number
          percentage: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deposit_id?: string | null
          from_user_id: string
          from_user_name?: string | null
          id?: string
          level: number
          percentage?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deposit_id?: string | null
          from_user_id?: string
          from_user_name?: string | null
          id?: string
          level?: number
          percentage?: number
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          pix_code: string | null
          status: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          pix_code?: string | null
          status?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          pix_code?: string | null
          status?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          cycle_number: number
          duration_days: number
          end_date: string
          id: string
          profit: number
          return_percent: number
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          cycle_number?: number
          duration_days: number
          end_date: string
          id?: string
          profit?: number
          return_percent: number
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          cycle_number?: number
          duration_days?: number
          end_date?: string
          id?: string
          profit?: number
          return_percent?: number
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string
          id: string
          invested: number
          is_admin: boolean | null
          name: string
          phone: string | null
          phone_country: string | null
          profits: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          invested?: number
          is_admin?: boolean | null
          name?: string
          phone?: string | null
          phone_country?: string | null
          profits?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          invested?: number
          is_admin?: boolean | null
          name?: string
          phone?: string | null
          phone_country?: string | null
          profits?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profit_history: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          investment_id: string | null
          net: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          investment_id?: string | null
          net?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          investment_id?: string | null
          net?: number
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          pix_key: string | null
          pix_name: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pix_key?: string | null
          pix_name?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pix_key?: string | null
          pix_name?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_balance: {
        Args: { p_amount: number; p_target_user_id: string }
        Returns: undefined
      }
      auto_confirm_withdrawals: { Args: never; Returns: undefined }
      ensure_profile_for_current_user: {
        Args: {
          p_name?: string
          p_phone?: string
          p_phone_country?: string
          p_referred_by_code?: string
        }
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          invested: number
          is_admin: boolean | null
          name: string
          phone: string | null
          phone_country: string | null
          profits: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_all_profiles_admin: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          invested: number
          is_admin: boolean | null
          name: string
          phone: string | null
          phone_country: string | null
          profits: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_latest_profit_times: {
        Args: { p_investment_ids: string[] }
        Returns: {
          investment_id: string
          last_created_at: string
        }[]
      }
      get_team_members: {
        Args: never
        Returns: {
          member_created_at: string
          member_email: string
          member_level: number
          member_name: string
          member_phone: string
          member_referral_code: string
          member_user_id: string
        }[]
      }
      process_deposit: {
        Args: {
          p_amount: number
          p_method: string
          p_pix_code?: string
          p_user_id: string
          p_wallet_address?: string
        }
        Returns: string
      }
      process_early_redeem: {
        Args: {
          p_investment_id: string
          p_pix_key?: string
          p_pix_name?: string
          p_user_id: string
        }
        Returns: string
      }
      process_invest: {
        Args: {
          p_amount: number
          p_duration_days: number
          p_return_percent: number
          p_user_id: string
        }
        Returns: string
      }
      process_redeem: {
        Args: { p_investment_id: string; p_user_id: string }
        Returns: undefined
      }
      process_withdraw: {
        Args: {
          p_amount: number
          p_pix_key?: string
          p_pix_name?: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
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
