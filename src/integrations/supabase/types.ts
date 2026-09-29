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
      agent_challenges: {
        Row: {
          agent_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          nonce: string
          purpose: string
        }
        Insert: {
          agent_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce: string
          purpose?: string
        }
        Update: {
          agent_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_challenges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_events: {
        Row: {
          agent_id: string
          created_at: string
          detail: string
          hash: string
          id: number
          kind: string
          nonce: string
          prev_hash: string
          signature: string
          signer: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          detail?: string
          hash?: string
          id?: number
          kind: string
          nonce?: string
          prev_hash?: string
          signature?: string
          signer?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          detail?: string
          hash?: string
          id?: number
          kind?: string
          nonce?: string
          prev_hash?: string
          signature?: string
          signer?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          approval_above: number
          created_at: string
          expires_at: string
          id: string
          monthly_spend_limit: number
          name: string
          owner_id: string
          permissions: string[]
          public_id: string
          public_key: string
          source: string
          status: string
        }
        Insert: {
          approval_above?: number
          created_at?: string
          expires_at?: string
          id?: string
          monthly_spend_limit?: number
          name: string
          owner_id?: string
          permissions?: string[]
          public_id?: string
          public_key: string
          source: string
          status?: string
        }
        Update: {
          approval_above?: number
          created_at?: string
          expires_at?: string
          id?: string
          monthly_spend_limit?: number
          name?: string
          owner_id?: string
          permissions?: string[]
          public_id?: string
          public_key?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      owner_attestations: {
        Row: {
          assurance: string
          created_at: string
          expires_at: string
          id: number
          issuer: string
          method: string
          owner_id: string
          reference: string
          revoked_at: string | null
          subject_country: string
          verified_at: string
        }
        Insert: {
          assurance: string
          created_at?: string
          expires_at?: string
          id?: never
          issuer: string
          method: string
          owner_id: string
          reference?: string
          revoked_at?: string | null
          subject_country?: string
          verified_at?: string
        }
        Update: {
          assurance?: string
          created_at?: string
          expires_at?: string
          id?: never
          issuer?: string
          method?: string
          owner_id?: string
          reference?: string
          revoked_at?: string | null
          subject_country?: string
          verified_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          identity_verified: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          identity_verified?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          identity_verified?: boolean
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: number
          note: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: never
          note?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: never
          note?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_owner_attestation: {
        Args: { _owner_id: string }
        Returns: {
          assurance: string
          expires_at: string
          issuer: string
          method: string
          verified_at: string
        }[]
      }
      gen_agent_public_id: { Args: never; Returns: string }
      issue_agent_challenge: {
        Args: { _public_id: string; _purpose?: string }
        Returns: {
          expires_at: string
          nonce: string
        }[]
      }
      record_owner_attestation: {
        Args: {
          _assurance: string
          _issuer: string
          _method: string
          _owner_id: string
          _reference: string
          _subject_country: string
          _valid_months?: number
        }
        Returns: number
      }
      record_signed_action: {
        Args: {
          _detail: string
          _kind: string
          _nonce: string
          _public_id: string
          _signature: string
        }
        Returns: {
          event_id: number
          hash: string
        }[]
      }
      verify_agent: {
        Args: { _public_id: string }
        Returns: {
          approval_above: number
          created_at: string
          expires_at: string
          last_hash: string
          monthly_spend_limit: number
          name: string
          owner_attestation_assurance: string
          owner_attestation_issuer: string
          owner_attestation_method: string
          owner_attestation_verified_at: string
          owner_name: string
          owner_verified: boolean
          permissions: string[]
          public_id: string
          public_key: string
          source: string
          status: string
        }[]
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
    Enums: {},
  },
} as const
