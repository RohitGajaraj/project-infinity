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
      agent_usage: {
        Row: {
          agent_id: string
          amount_usd: number
          approval_id: number | null
          created_at: string
          detail: string
          id: number
          kind: string
          reference: string
          reverses_usage_id: number | null
        }
        Insert: {
          agent_id: string
          amount_usd?: number
          approval_id?: number | null
          created_at?: string
          detail?: string
          id?: never
          kind?: string
          reference: string
          reverses_usage_id?: number | null
        }
        Update: {
          agent_id?: string
          amount_usd?: number
          approval_id?: number | null
          created_at?: string
          detail?: string
          id?: never
          kind?: string
          reference?: string
          reverses_usage_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_usage_approval_fk"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_usage_reverses_fk"
            columns: ["reverses_usage_id"]
            isOneToOne: false
            referencedRelation: "agent_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          approval_above: number | null
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
          approval_above?: number | null
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
          approval_above?: number | null
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
      approval_requests: {
        Row: {
          action: string
          agent_id: string
          amount_usd: number
          consumed_at: string | null
          decided_at: string | null
          expires_at: string
          id: number
          reference: string
          requested_at: string
          status: string
        }
        Insert: {
          action: string
          agent_id: string
          amount_usd?: number
          consumed_at?: string | null
          decided_at?: string | null
          expires_at?: string
          id?: never
          reference: string
          requested_at?: string
          status?: string
        }
        Update: {
          action?: string
          agent_id?: string
          amount_usd?: number
          consumed_at?: string | null
          decided_at?: string | null
          expires_at?: string
          id?: never
          reference?: string
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
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
      owner_identity_events: {
        Row: {
          event_id: string
          occurred_at: string
          outcome: string
          processed_at: string
          session_id: string
        }
        Insert: {
          event_id: string
          occurred_at: string
          outcome: string
          processed_at?: string
          session_id: string
        }
        Update: {
          event_id?: string
          occurred_at?: string
          outcome?: string
          processed_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_identity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "owner_identity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_identity_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          issuer: string
          last_event_at: string | null
          last_event_id: string
          owner_id: string
          provider_reference: string
          state: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issuer: string
          last_event_at?: string | null
          last_event_id?: string
          owner_id: string
          provider_reference?: string
          state?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issuer?: string
          last_event_at?: string | null
          last_event_id?: string
          owner_id?: string
          provider_reference?: string
          state?: string
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
      abandon_owner_identity_session: {
        Args: { _attempt_id: string }
        Returns: boolean
      }
      agent_allowance: {
        Args: { _public_id: string }
        Returns: {
          approval_above_usd: number
          monthly_limit_usd: number
          period_start: string
          remaining_usd: number
          spent_this_month_usd: number
          status: string
          usable: boolean
        }[]
      }
      approval_state: {
        Args: { _public_id: string; _reference: string }
        Returns: {
          action: string
          amount_usd: number
          consumed: boolean
          expires_at: string
          status: string
        }[]
      }
      begin_owner_identity_session: {
        Args: { _issuer: string }
        Returns: {
          attempt_id: string
          can_start: boolean
          expires_at: string
        }[]
      }
      bind_owner_identity_session: {
        Args: { _attempt_id: string; _provider_reference: string }
        Returns: boolean
      }
      create_approval_request: {
        Args: { _action: string; _amount_usd: number; _public_id: string }
        Returns: {
          expires_at: string
          reference: string
          status: string
        }[]
      }
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
      decide_approval: {
        Args: { _approve: boolean; _reference: string }
        Returns: {
          status: string
        }[]
      }
      finalize_owner_identity_session: {
        Args: {
          _assurance: string
          _attempt_id: string
          _event_id: string
          _issuer: string
          _method: string
          _occurred_at: string
          _outcome: string
          _provider_reference: string
          _subject_country?: string
        }
        Returns: {
          attestation_id: number
          state: string
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
      owner_identity_status: {
        Args: never
        Returns: {
          assurance: string
          attestation_expires_at: string
          issuer: string
          method: string
          state: string
          updated_at: string
          verified_at: string
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
      reserve_spend: {
        Args: {
          _amount_usd: number
          _approval_reference?: string
          _detail: string
          _public_id: string
          _reference: string
        }
        Returns: {
          allowed: boolean
          reason: string
          remaining_usd: number
          usage_id: number
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
