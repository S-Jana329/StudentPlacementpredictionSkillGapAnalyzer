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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      career_roadmaps: {
        Row: {
          created_at: string
          current_skills: string | null
          error: string | null
          id: string
          roadmap: Json | null
          status: string
          target_role: string
          time_horizon_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_skills?: string | null
          error?: string | null
          id?: string
          roadmap?: Json | null
          status?: string
          target_role: string
          time_horizon_months?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_skills?: string | null
          error?: string | null
          id?: string
          roadmap?: Json | null
          status?: string
          target_role?: string
          time_horizon_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          created_at: string
          from_local_part: string
          from_name: string
          notify_interview_feedback: boolean
          notify_resume_complete: boolean
          notify_roadmap_ready: boolean
          sender_domain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_local_part?: string
          from_name?: string
          notify_interview_feedback?: boolean
          notify_resume_complete?: boolean
          notify_roadmap_ready?: boolean
          sender_domain?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_local_part?: string
          from_name?: string
          notify_interview_feedback?: boolean
          notify_resume_complete?: boolean
          notify_roadmap_ready?: boolean
          sender_domain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          created_at: string
          difficulty: string
          feedback: Json | null
          id: string
          overall_score: number | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_alert_runs: {
        Row: {
          error: string | null
          id: string
          new_count: number
          ran_at: string
          status: string
          user_id: string
        }
        Insert: {
          error?: string | null
          id?: string
          new_count?: number
          ran_at?: string
          status?: string
          user_id: string
        }
        Update: {
          error?: string | null
          id?: string
          new_count?: number
          ran_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      job_preferences: {
        Row: {
          created_at: string
          email_digest: boolean
          locations: string[]
          min_match_score: number
          updated_at: string
          user_id: string
          work_mode: string
        }
        Insert: {
          created_at?: string
          email_digest?: boolean
          locations?: string[]
          min_match_score?: number
          updated_at?: string
          user_id: string
          work_mode?: string
        }
        Update: {
          created_at?: string
          email_digest?: boolean
          locations?: string[]
          min_match_score?: number
          updated_at?: string
          user_id?: string
          work_mode?: string
        }
        Relationships: []
      }
      job_recommendations: {
        Row: {
          company: string
          created_at: string
          description: string | null
          dismissed_at: string | null
          id: string
          location: string | null
          match_reasons: string[]
          match_score: number
          min_gpa: number | null
          required_skills: string[]
          seen_at: string | null
          source: string
          title: string
          user_id: string
          work_mode: string | null
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          id?: string
          location?: string | null
          match_reasons?: string[]
          match_score: number
          min_gpa?: number | null
          required_skills?: string[]
          seen_at?: string | null
          source?: string
          title: string
          user_id: string
          work_mode?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          id?: string
          location?: string | null
          match_reasons?: string[]
          match_score?: number
          min_gpa?: number | null
          required_skills?: string[]
          seen_at?: string | null
          source?: string
          title?: string
          user_id?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          gpa: number | null
          id: string
          updated_at: string
          year: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          gpa?: number | null
          id: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          gpa?: number | null
          id?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          created_at: string
          education_summary: string | null
          error: string | null
          experience_summary: string | null
          file_name: string
          id: string
          match_score: number | null
          raw_text: string | null
          recommendations: Json | null
          recommended_roles: Json | null
          skills: Json | null
          status: string
          storage_path: string
          strengths: Json | null
          updated_at: string
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          created_at?: string
          education_summary?: string | null
          error?: string | null
          experience_summary?: string | null
          file_name: string
          id?: string
          match_score?: number | null
          raw_text?: string | null
          recommendations?: Json | null
          recommended_roles?: Json | null
          skills?: Json | null
          status?: string
          storage_path: string
          strengths?: Json | null
          updated_at?: string
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          created_at?: string
          education_summary?: string | null
          error?: string | null
          experience_summary?: string | null
          file_name?: string
          id?: string
          match_score?: number | null
          raw_text?: string | null
          recommendations?: Json | null
          recommended_roles?: Json | null
          skills?: Json | null
          status?: string
          storage_path?: string
          strengths?: Json | null
          updated_at?: string
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "admin"
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
      app_role: ["student", "admin"],
    },
  },
} as const
