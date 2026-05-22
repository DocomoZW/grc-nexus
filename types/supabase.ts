// PLACEHOLDER — replaced by `supabase gen types typescript --local > types/supabase.ts` after migration push
// Provides minimal Database type structure so imports don't break before T-05.
export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string
          name: string
          type: 'ministry' | 'department' | 'agency' | 'soe'
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'ministry' | 'department' | 'agency' | 'soe'
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'ministry' | 'department' | 'agency' | 'soe'
          logo_url?: string | null
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          institution_id: string | null
          dept_id: string | null
          first_name: string | null
          last_name: string | null
          status: 'pending' | 'approved' | 'suspended'
          active_role: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          institution_id?: string | null
          dept_id?: string | null
          first_name?: string | null
          last_name?: string | null
          status?: 'pending' | 'approved' | 'suspended'
          active_role?: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          institution_id?: string | null
          dept_id?: string | null
          first_name?: string | null
          last_name?: string | null
          status?: 'pending' | 'approved' | 'suspended'
          active_role?: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head' | null
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: number
          user_id: string
          institution_id: string
          role_name: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head'
          assigned_by: string | null
          assigned_at: string
        }
        Insert: {
          user_id: string
          institution_id: string
          role_name: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head'
          assigned_by?: string | null
          assigned_at?: string
        }
        Update: {
          role_name?: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head'
          assigned_by?: string | null
        }
      }
      mfa_device_trust: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          expires_at: string
          created_at?: string
        }
        Update: {
          expires_at?: string
        }
      }
      mfa_backup_codes: {
        Row: {
          id: number
          user_id: string
          code_hash: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          code_hash: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          used_at?: string | null
        }
      }
      mfa_otp_challenges: {
        Row: {
          id: string
          user_id: string
          code_hash: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code_hash: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          used_at?: string | null
        }
      }
      audit_events: {
        Row: {
          id: number
          actor_id: string | null
          action: 'INSERT' | 'UPDATE' | 'DELETE' | 'AUTH'
          table_name: string
          record_id: string
          before_state: Record<string, unknown> | null
          after_state: Record<string, unknown> | null
          occurred_at: string
          event_type: string | null
          metadata: Record<string, unknown> | null
        }
        Insert: {
          actor_id?: string | null
          action: 'INSERT' | 'UPDATE' | 'DELETE' | 'AUTH'
          table_name: string
          record_id: string
          before_state?: Record<string, unknown> | null
          after_state?: Record<string, unknown> | null
          occurred_at?: string
          event_type?: string | null
          metadata?: Record<string, unknown> | null
        }
        Update: never
      }
    }
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
    Enums: {
      app_role: 'admin' | 'board-member' | 'ceo' | 'risk-officer' | 'audit-officer' | 'dept-head'
      user_status: 'pending' | 'approved' | 'suspended'
      institution_type: 'ministry' | 'department' | 'agency' | 'soe'
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE' | 'AUTH'
    }
  }
}
