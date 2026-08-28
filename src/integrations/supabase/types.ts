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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          admin_name: string | null
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["customer_approval"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_balance: number
          id: string
          name: string
          opening_balance: number
          opening_balance_date: string | null
          opening_balance_notes: string | null
          phone: string | null
          rejection_reason: string | null
          reminder_enabled: boolean
          status: string
          updated_at: string
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["customer_approval"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          name: string
          opening_balance?: number
          opening_balance_date?: string | null
          opening_balance_notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reminder_enabled?: boolean
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["customer_approval"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          name?: string
          opening_balance?: number
          opening_balance_date?: string | null
          opening_balance_notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reminder_enabled?: boolean
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_gateway: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_gateway?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_gateway?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_customer_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          balance: number
          created_at: string
          customer_id: string
          id: string
          message: string
          reminder_date: string
          sent_at: string | null
          status: string
          whatsapp_number: string | null
          whatsapp_url: string
        }
        Insert: {
          balance: number
          created_at?: string
          customer_id: string
          id?: string
          message: string
          reminder_date?: string
          sent_at?: string | null
          status?: string
          whatsapp_number?: string | null
          whatsapp_url: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          message?: string
          reminder_date?: string
          sent_at?: string | null
          status?: string
          whatsapp_number?: string | null
          whatsapp_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          enabled: boolean
          id: boolean
          message_template: string
          send_hour: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          message_template?: string
          send_hour?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: boolean
          message_template?: string
          send_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          quantity_of_broilers: number | null
          rate_per_kg: number
          sale_date: string
          total_amount: number
          weight_kg: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          quantity_of_broilers?: number | null
          rate_per_kg: number
          sale_date?: string
          total_amount: number
          weight_kg: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          quantity_of_broilers?: number | null
          rate_per_kg?: number
          sale_date?: string
          total_amount?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_daily_reminders: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "customer"
      customer_approval: "pending" | "approved" | "rejected"
      payment_mode: "cash" | "upi" | "bank_transfer"
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
    Enums: {
      app_role: ["admin", "customer"],
      customer_approval: ["pending", "approved", "rejected"],
      payment_mode: ["cash", "upi", "bank_transfer"],
    },
  },
} as const
