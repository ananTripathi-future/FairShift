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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      fs_corrections: {
        Row: {
          created_at: string
          id: string
          proposed_in: string
          proposed_out: string
          reason: string
          reply: string | null
          shift_id: string
          site_id: string
          status: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_in: string
          proposed_out: string
          reason: string
          reply?: string | null
          shift_id: string
          site_id: string
          status?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_in?: string
          proposed_out?: string
          reason?: string
          reply?: string | null
          shift_id?: string
          site_id?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_corrections_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "fs_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_disputes: {
        Row: {
          created_at: string
          id: string
          line: string
          period: string
          reply: string | null
          site_id: string
          status: string
          text: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line: string
          period: string
          reply?: string | null
          site_id: string
          status?: string
          text: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line?: string
          period?: string
          reply?: string | null
          site_id?: string
          status?: string
          text?: string
          worker_id?: string
        }
        Relationships: []
      }
      fs_events: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json
          entity_id: string
          id: string
          site_id: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          details?: Json
          entity_id: string
          id?: string
          site_id: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json
          entity_id?: string
          id?: string
          site_id?: string
        }
        Relationships: []
      }
      fs_notifications: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          kind: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          kind: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          kind?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      fs_payroll: {
        Row: {
          allowance_paise: number
          approved_at: string | null
          approved_by: string | null
          approved_month: string | null
          deduction_paise: number
          rate_paise: number
          site_id: string
          worker_id: string
        }
        Insert: {
          allowance_paise?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_month?: string | null
          deduction_paise?: number
          rate_paise?: number
          site_id: string
          worker_id: string
        }
        Update: {
          allowance_paise?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_month?: string | null
          deduction_paise?: number
          rate_paise?: number
          site_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_payroll_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "fs_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_qr: {
        Row: {
          expires_at: string
          site_id: string
          token: string
        }
        Insert: {
          expires_at?: string
          site_id: string
          token?: string
        }
        Update: {
          expires_at?: string
          site_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_qr_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "fs_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_report_owners: {
        Row: {
          report_id: string
          user_id: string
        }
        Insert: {
          report_id: string
          user_id: string
        }
        Update: {
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_report_owners_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "fs_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_reports: {
        Row: {
          category: string
          created_at: string
          due_at: string
          escalated_at: string | null
          id: string
          language: string
          location: string
          manager_id: string
          note: string | null
          reference: string
          reporter_name: string | null
          severity: string
          site_id: string
          status: string
          text: string
        }
        Insert: {
          category: string
          created_at?: string
          due_at: string
          escalated_at?: string | null
          id?: string
          language: string
          location: string
          manager_id: string
          note?: string | null
          reference?: string
          reporter_name?: string | null
          severity: string
          site_id: string
          status?: string
          text?: string
        }
        Update: {
          category?: string
          created_at?: string
          due_at?: string
          escalated_at?: string | null
          id?: string
          language?: string
          location?: string
          manager_id?: string
          note?: string | null
          reference?: string
          reporter_name?: string | null
          severity?: string
          site_id?: string
          status?: string
          text?: string
        }
        Relationships: []
      }
      fs_shifts: {
        Row: {
          check_in: string | null
          check_out: string | null
          id: string
          scheduled_end: string
          scheduled_start: string
          site_id: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          id?: string
          scheduled_end: string
          scheduled_start: string
          site_id: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          id?: string
          scheduled_end?: string
          scheduled_start?: string
          site_id?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "fs_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_sites: {
        Row: {
          daily_regular_minutes: number
          high_hours: number
          id: string
          join_code: string
          latitude: number | null
          location_required: boolean
          longitude: number | null
          low_hours: number
          manager_id: string | null
          medium_hours: number
          name: string
          overtime_multiplier_pct: number
          radius_m: number
          supervisor_id: string
        }
        Insert: {
          daily_regular_minutes?: number
          high_hours?: number
          id?: string
          join_code?: string
          latitude?: number | null
          location_required?: boolean
          longitude?: number | null
          low_hours?: number
          manager_id?: string | null
          medium_hours?: number
          name: string
          overtime_multiplier_pct?: number
          radius_m?: number
          supervisor_id: string
        }
        Update: {
          daily_regular_minutes?: number
          high_hours?: number
          id?: string
          join_code?: string
          latitude?: number | null
          location_required?: boolean
          longitude?: number | null
          low_hours?: number
          manager_id?: string | null
          medium_hours?: number
          name?: string
          overtime_multiplier_pct?: number
          radius_m?: number
          supervisor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          language: string
          name: string
          skills: string[]
        }
        Insert: {
          id: string
          language?: string
          name?: string
          skills?: string[]
        }
        Update: {
          id?: string
          language?: string
          name?: string
          skills?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["fs_role"]
          site_id: string
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["fs_role"]
          site_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["fs_role"]
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "fs_sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fs_command: { Args: { p_action: string; p_data: Json }; Returns: Json }
      fs_dashboard: { Args: never; Returns: Json }
      fs_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      fs_event: {
        Args: { a: string; d?: Json; e: string; s: string; who?: string }
        Returns: undefined
      }
      fs_event_visible: {
        Args: { a: string; e: string; s: string }
        Returns: boolean
      }
      fs_manager: { Args: { s: string }; Returns: boolean }
      fs_member: { Args: { s: string }; Returns: boolean }
      fs_owns_report: { Args: { r: string }; Returns: boolean }
      fs_skill_input: { Args: { v: string[] }; Returns: boolean }
      fs_staff: { Args: { s: string }; Returns: boolean }
      fs_time_actions: { Args: never; Returns: undefined }
    }
    Enums: {
      fs_role: "worker" | "manager" | "supervisor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      fs_role: ["worker", "manager", "supervisor"],
    },
  },
} as const
