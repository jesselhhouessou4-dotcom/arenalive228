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
      lineups: {
        Row: {
          id: string
          is_captain: boolean
          match_id: string
          player_id: string
          position: string | null
          status: Database["public"]["Enums"]["lineup_status"]
          team_id: string
        }
        Insert: {
          id?: string
          is_captain?: boolean
          match_id: string
          player_id: string
          position?: string | null
          status?: Database["public"]["Enums"]["lineup_status"]
          team_id: string
        }
        Update: {
          id?: string
          is_captain?: boolean
          match_id?: string
          player_id?: string
          position?: string | null
          status?: Database["public"]["Enums"]["lineup_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          auto_generated: boolean
          created_at: string
          created_by: string | null
          id: string
          match_id: string
          minute: number | null
          period: number | null
          player_id: string | null
          related_player_id: string | null
          source_event_id: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          auto_generated?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          match_id: string
          minute?: number | null
          period?: number | null
          player_id?: string | null
          related_player_id?: string | null
          source_event_id?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          auto_generated?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          match_id?: string
          minute?: number | null
          period?: number | null
          player_id?: string | null
          related_player_id?: string | null
          source_event_id?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_related_player_id_fkey"
            columns: ["related_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          current_period: number
          ended_at: string | null
          group_name: string | null
          id: string
          period_started_at: string | null
          phase: string
          scheduled_at: string | null
          score_a: number
          score_b: number
          scorer_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string
          team_b_id: string
          tournament_id: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          current_period?: number
          ended_at?: string | null
          group_name?: string | null
          id?: string
          period_started_at?: string | null
          phase?: string
          scheduled_at?: string | null
          score_a?: number
          score_b?: number
          scorer_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id: string
          team_b_id: string
          tournament_id: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          current_period?: number
          ended_at?: string | null
          group_name?: string | null
          id?: string
          period_started_at?: string | null
          phase?: string
          scheduled_at?: string | null
          score_a?: number
          score_b?: number
          scorer_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string
          team_b_id?: string
          tournament_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          jersey_number: number | null
          name: string
          photo_url: string | null
          position: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          name: string
          photo_url?: string | null
          position?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          name?: string
          photo_url?: string | null
          position?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      sports: {
        Row: {
          id: string
          name: string
          period_label: string
          periods: number
        }
        Insert: {
          id: string
          name: string
          period_label: string
          periods: number
        }
        Update: {
          id?: string
          name?: string
          period_label?: string
          periods?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string
          created_at: string
          group_name: string | null
          id: string
          logo_url: string | null
          name: string
          short_name: string | null
          tournament_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          group_name?: string | null
          id?: string
          logo_url?: string | null
          name: string
          short_name?: string | null
          tournament_id: string
        }
        Update: {
          color?: string
          created_at?: string
          group_name?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          end_date: string | null
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          name: string
          sport_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["tournament_status"]
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name: string
          sport_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
        }
        Update: {
          created_at?: string
          end_date?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name?: string
          sport_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      is_match_scorer: { Args: { _match_id: string }; Returns: boolean }
      recompute_match: { Args: { _match_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "marqueur"
      event_type:
        | "debut_match"
        | "changement_periode"
        | "fin_match"
        | "but"
        | "passe_decisive"
        | "carton_jaune"
        | "carton_rouge"
        | "hors_jeu"
        | "remplacement"
        | "panier_1"
        | "panier_2"
        | "panier_3"
        | "faute_personnelle"
        | "faute_technique"
        | "passe"
        | "steal"
        | "block"
        | "rebond"
        | "exclusion"
      lineup_status: "titulaire" | "remplacant" | "reserve"
      match_status: "a_venir" | "en_cours" | "termine"
      tournament_format: "poules" | "elimination"
      tournament_status: "a_venir" | "en_cours" | "termine"
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
      app_role: ["admin", "marqueur"],
      event_type: [
        "debut_match",
        "changement_periode",
        "fin_match",
        "but",
        "passe_decisive",
        "carton_jaune",
        "carton_rouge",
        "hors_jeu",
        "remplacement",
        "panier_1",
        "panier_2",
        "panier_3",
        "faute_personnelle",
        "faute_technique",
        "passe",
        "steal",
        "block",
        "rebond",
        "exclusion",
      ],
      lineup_status: ["titulaire", "remplacant", "reserve"],
      match_status: ["a_venir", "en_cours", "termine"],
      tournament_format: ["poules", "elimination"],
      tournament_status: ["a_venir", "en_cours", "termine"],
    },
  },
} as const
