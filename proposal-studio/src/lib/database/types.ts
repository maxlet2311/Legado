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
      account_activation_invitations: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          email: string
          expires_at: string
          id: string
          membership_id: string | null
          metadata: Json
          status: string
          token_hash: string
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          email: string
          expires_at: string
          id?: string
          membership_id?: string | null
          metadata?: Json
          status?: string
          token_hash: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          membership_id?: string | null
          metadata?: Json
          status?: string
          token_hash?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_activation_invitations_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          reason: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          reason?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          accent_color: string
          address: string | null
          advisor_name: string
          commercial_name: string
          created_at: string
          email: string
          footer_text: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string
          secondary_color: string
          signature_image: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          advisor_name: string
          commercial_name: string
          created_at?: string
          email: string
          footer_text?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string
          secondary_color?: string
          signature_image?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          advisor_name?: string
          commercial_name?: string
          created_at?: string
          email?: string
          footer_text?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string
          secondary_color?: string
          signature_image?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          client_type: string
          company_name: string | null
          created_at: string
          email: string
          external_reference: string | null
          full_name: string
          id: string
          metadata: Json
          notes: string | null
          occupation: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          client_type: string
          company_name?: string | null
          created_at?: string
          email: string
          external_reference?: string | null
          full_name: string
          id?: string
          metadata?: Json
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          client_type?: string
          company_name?: string | null
          created_at?: string
          email?: string
          external_reference?: string | null
          full_name?: string
          id?: string
          metadata?: Json
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          category: string
          content: string
          content_json: Json
          created_at: string
          embedding: string | null
          id: string
          is_favorite: boolean
          product: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          content_json?: Json
          created_at?: string
          embedding?: string | null
          id?: string
          is_favorite?: boolean
          product?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          content_json?: Json
          created_at?: string
          embedding?: string | null
          id?: string
          is_favorite?: boolean
          product?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_checkout_attempts: {
        Row: {
          canceled_at: string | null
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          locked_at: string | null
          membership_id: string
          membership_plan_id: string
          metadata: Json
          payer_id: string | null
          provider: string
          provider_checkout_plan_id: string | null
          provider_event_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          locked_at?: string | null
          membership_id: string
          membership_plan_id: string
          metadata?: Json
          payer_id?: string | null
          provider: string
          provider_checkout_plan_id?: string | null
          provider_event_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          locked_at?: string | null
          membership_id?: string
          membership_plan_id?: string
          metadata?: Json
          payer_id?: string | null
          provider?: string
          provider_checkout_plan_id?: string | null
          provider_event_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_checkout_attempts_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_checkout_attempts_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          billing_interval: string
          billing_interval_count: number
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number
          provider: string | null
          provider_plan_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval: string
          billing_interval_count?: number
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price?: number
          provider?: string | null
          provider_plan_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          billing_interval_count?: number
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          provider?: string | null
          provider_plan_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      membership_status_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          external_event_id: string | null
          id: string
          membership_id: string
          metadata: Json
          new_status: string
          previous_status: string | null
          reason: string | null
          source: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          external_event_id?: string | null
          id?: string
          membership_id: string
          metadata?: Json
          new_status: string
          previous_status?: string | null
          reason?: string | null
          source: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          external_event_id?: string | null
          id?: string
          membership_id?: string
          metadata?: Json
          new_status?: string
          previous_status?: string | null
          reason?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_status_history_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_status_history_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          activated_at: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          grace_period_end: string | null
          id: string
          last_payment_at: string | null
          metadata: Json
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_status: string | null
          provider_subscription_id: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          grace_period_end?: string | null
          id?: string
          last_payment_at?: string | null
          metadata?: Json
          plan_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_status?: string | null
          provider_subscription_id?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          grace_period_end?: string | null
          id?: string
          last_payment_at?: string | null
          metadata?: Json
          plan_id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_status?: string | null
          provider_subscription_id?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_events: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string | null
          provider_resource_id: string | null
          signature_valid: boolean
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id?: string | null
          provider_resource_id?: string | null
          signature_valid?: boolean
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string | null
          provider_resource_id?: string | null
          signature_valid?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_platform_owner: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          is_platform_owner?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_platform_owner?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_alternatives: {
        Row: {
          annual_premium: number | null
          category: string
          created_at: string
          currency: string
          description: string | null
          display_order: number
          financial_details: Json
          highlight_label: string | null
          id: string
          insurance_company: string
          insured_amount: number | null
          is_recommended: boolean
          is_visible: boolean
          monthly_premium: number | null
          product_name: string
          proposal_id: string | null
          quotation_number: string | null
          recommended_reason: string | null
          revision: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_premium?: number | null
          category: string
          created_at?: string
          currency: string
          description?: string | null
          display_order: number
          financial_details?: Json
          highlight_label?: string | null
          id?: string
          insurance_company: string
          insured_amount?: number | null
          is_recommended?: boolean
          is_visible?: boolean
          monthly_premium?: number | null
          product_name: string
          proposal_id?: string | null
          quotation_number?: string | null
          recommended_reason?: string | null
          revision?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_premium?: number | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          financial_details?: Json
          highlight_label?: string | null
          id?: string
          insurance_company?: string
          insured_amount?: number | null
          is_recommended?: boolean
          is_visible?: boolean
          monthly_premium?: number | null
          product_name?: string
          proposal_id?: string | null
          quotation_number?: string | null
          recommended_reason?: string | null
          revision?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_alternatives_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_alternatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_benefits: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_enabled: boolean
          proposal_id: string | null
          revision: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          display_order: number
          icon: string
          id?: string
          is_enabled?: boolean
          proposal_id?: string | null
          revision?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_enabled?: boolean
          proposal_id?: string | null
          revision?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_benefits_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_benefits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_comparisons: {
        Row: {
          columns: Json
          created_at: string
          id: string
          proposal_id: string
          revision: number
          rows: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          id?: string
          proposal_id: string
          revision?: number
          rows?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          id?: string
          proposal_id?: string
          revision?: number
          rows?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comparisons_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_comparisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          payload: Json
          proposal_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          payload?: Json
          proposal_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          payload?: Json
          proposal_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_files: {
        Row: {
          checksum: string
          file_name: string
          file_size: number
          file_type: string
          generated_at: string
          id: string
          metadata: Json
          mime_type: string
          proposal_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          checksum: string
          file_name: string
          file_size: number
          file_type: string
          generated_at?: string
          id?: string
          metadata?: Json
          mime_type: string
          proposal_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          checksum?: string
          file_name?: string
          file_size?: number
          file_type?: string
          generated_at?: string
          id?: string
          metadata?: Json
          mime_type?: string
          proposal_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_files_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_narratives: {
        Row: {
          created_at: string
          current_situation: string | null
          detected_needs: string | null
          detected_risks: string | null
          executive_summary: string | null
          expected_result: string | null
          final_message: string | null
          id: string
          objectives: string | null
          opportunities: string | null
          proposal_id: string | null
          recommended_strategy: string | null
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_situation?: string | null
          detected_needs?: string | null
          detected_risks?: string | null
          executive_summary?: string | null
          expected_result?: string | null
          final_message?: string | null
          id?: string
          objectives?: string | null
          opportunities?: string | null
          proposal_id?: string | null
          recommended_strategy?: string | null
          revision?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_situation?: string | null
          detected_needs?: string | null
          detected_risks?: string | null
          executive_summary?: string | null
          expected_result?: string | null
          final_message?: string | null
          id?: string
          objectives?: string | null
          opportunities?: string | null
          proposal_id?: string | null
          recommended_strategy?: string | null
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_narratives_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_narratives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_sections: {
        Row: {
          created_at: string
          custom_content: string | null
          display_order: number
          id: string
          is_visible: boolean
          proposal_id: string | null
          section_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_content?: string | null
          display_order: number
          id?: string
          is_visible?: boolean
          proposal_id?: string | null
          section_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_content?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          proposal_id?: string | null
          section_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_sections_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_system: boolean
          preview_image: string | null
          proposal_type: string
          template_json: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          preview_image?: string | null
          proposal_type: string
          template_json: Json
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          preview_image?: string | null
          proposal_type?: string
          template_json?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_version_artifacts: {
        Row: {
          artifact_type: string
          byte_size: number
          checksum: string
          created_at: string
          id: string
          mime_type: string
          proposal_version_id: string
          render_engine: string
          render_engine_version: string
          storage_path: string
          user_id: string
        }
        Insert: {
          artifact_type?: string
          byte_size: number
          checksum: string
          created_at?: string
          id?: string
          mime_type?: string
          proposal_version_id: string
          render_engine: string
          render_engine_version: string
          storage_path: string
          user_id: string
        }
        Update: {
          artifact_type?: string
          byte_size?: number
          checksum?: string
          created_at?: string
          id?: string
          mime_type?: string
          proposal_version_id?: string
          render_engine?: string
          render_engine_version?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_version_artifacts_proposal_version_id_fkey"
            columns: ["proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_version_artifacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          checksum: string | null
          content_json: Json
          created_at: string
          created_by: string | null
          id: string
          proposal_id: string | null
          render_json: Json
          schema_version: number
          user_id: string
          version_number: number
        }
        Insert: {
          checksum?: string | null
          content_json: Json
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string | null
          render_json: Json
          schema_version?: number
          user_id: string
          version_number: number
        }
        Update: {
          checksum?: string | null
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string | null
          render_json?: Json
          schema_version?: number
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          brand_id: string | null
          client_id: string
          created_at: string
          currency: string
          duplicated_from_id: string | null
          duplication_reviewed: boolean
          expires_at: string | null
          font_family: string
          id: string
          internal_notes: string | null
          last_exported_at: string | null
          last_opened_at: string
          margin_size: string
          orientation: string
          pdf_format: string
          primary_color_override: string | null
          primary_objective: string
          product: string | null
          proposal_number: string
          proposal_type: string
          revision: number
          secondary_color_override: string | null
          share_token: string
          show_cover: boolean
          show_footer: boolean
          show_legal_note: boolean
          show_page_numbers: boolean
          show_summary: boolean
          show_watermark: boolean
          status: string
          theme: string
          title: string
          updated_at: string
          user_id: string
          version: number
          watermark_text: string | null
        }
        Insert: {
          brand_id?: string | null
          client_id: string
          created_at?: string
          currency: string
          duplicated_from_id?: string | null
          duplication_reviewed?: boolean
          expires_at?: string | null
          font_family?: string
          id?: string
          internal_notes?: string | null
          last_exported_at?: string | null
          last_opened_at?: string
          margin_size?: string
          orientation?: string
          pdf_format?: string
          primary_color_override?: string | null
          primary_objective: string
          product?: string | null
          proposal_number: string
          proposal_type: string
          revision?: number
          secondary_color_override?: string | null
          share_token?: string
          show_cover?: boolean
          show_footer?: boolean
          show_legal_note?: boolean
          show_page_numbers?: boolean
          show_summary?: boolean
          show_watermark?: boolean
          status?: string
          theme?: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
          watermark_text?: string | null
        }
        Update: {
          brand_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          duplicated_from_id?: string | null
          duplication_reviewed?: boolean
          expires_at?: string | null
          font_family?: string
          id?: string
          internal_notes?: string | null
          last_exported_at?: string | null
          last_opened_at?: string
          margin_size?: string
          orientation?: string
          pdf_format?: string
          primary_color_override?: string | null
          primary_objective?: string
          product?: string | null
          proposal_number?: string
          proposal_type?: string
          revision?: number
          secondary_color_override?: string | null
          share_token?: string
          show_cover?: boolean
          show_footer?: boolean
          show_legal_note?: boolean
          show_page_numbers?: boolean
          show_summary?: boolean
          show_watermark?: boolean
          status?: string
          theme?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_duplicated_from_id_fkey"
            columns: ["duplicated_from_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_user_id_fkey"
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
      archive_proposal: {
        Args: { p_id: string }
        Returns: {
          id: string
        }[]
      }
      update_proposal_orientation: {
        Args: { p_id: string; p_orientation: string }
        Returns: {
          id: string
          orientation: string
        }[]
      }
      before_user_created_check_membership: {
        Args: { event: Json }
        Returns: Json
      }
      begin_membership_checkout_attempt: {
        Args: {
          p_membership_id: string
          p_membership_plan_id: string
          p_provider: string
        }
        Returns: {
          canceled_at: string | null
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          locked_at: string | null
          membership_id: string
          membership_plan_id: string
          metadata: Json
          payer_id: string | null
          provider: string
          provider_checkout_plan_id: string | null
          provider_event_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_checkout_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_and_record_ai_usage: {
        Args: { p_feature: string; p_proposal_id: string }
        Returns: {
          allowed: boolean
        }[]
      }
      create_draft_proposal: {
        Args: {
          p_client_id: string
          p_currency: string
          p_duplicated_from_id?: string
          p_primary_objective: string
          p_proposal_type: string
          p_title: string
        }
        Returns: {
          id: string
          proposal_number: string
        }[]
      }
      create_membership: {
        Args: {
          p_actor_user_id?: string
          p_current_period_end?: string
          p_current_period_start?: string
          p_email: string
          p_id?: string
          p_metadata?: Json
          p_plan_id: string
          p_provider?: string
          p_provider_customer_id?: string
          p_provider_status?: string
          p_provider_subscription_id?: string
          p_reason?: string
          p_source: string
          p_status: string
          p_user_id?: string
        }
        Returns: {
          activated_at: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          grace_period_end: string | null
          id: string
          last_payment_at: string | null
          metadata: Json
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_status: string | null
          provider_subscription_id: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_proposal_alternative: {
        Args: { p_id: string; p_proposal_id: string }
        Returns: {
          id: string
        }[]
      }
      delete_proposal_benefit: {
        Args: { p_id: string; p_proposal_id: string }
        Returns: {
          id: string
        }[]
      }
      emit_proposal_version: {
        Args: { p_proposal_id: string }
        Returns: {
          checksum: string
          id: string
          is_new: boolean
          version_number: number
        }[]
      }
      finalize_proposal: {
        Args: { p_id: string }
        Returns: {
          id: string
          status: string
        }[]
      }
      generate_proposal_number: { Args: never; Returns: string }
      get_live_document_content: {
        Args: { p_proposal_id: string }
        Returns: Json
      }
      has_active_membership: { Args: { p_user_id: string }; Returns: boolean }
      link_membership_to_user: {
        Args: {
          p_actor_user_id?: string
          p_email: string
          p_membership_id: string
          p_source?: string
          p_user_id: string
        }
        Returns: {
          activated_at: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          grace_period_end: string | null
          id: string
          last_payment_at: string | null
          metadata: Json
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_status: string | null
          provider_subscription_id: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_duplication_reviewed: {
        Args: { p_id: string }
        Returns: {
          duplication_reviewed: boolean
          id: string
        }[]
      }
      record_proposal_version_artifact: {
        Args: {
          p_byte_size: number
          p_checksum: string
          p_mime_type: string
          p_proposal_version_id: string
          p_render_engine: string
          p_render_engine_version: string
          p_storage_path: string
        }
        Returns: {
          created_at: string
          id: string
          is_new: boolean
          storage_path: string
        }[]
      }
      reorder_proposal_alternatives: {
        Args: { p_ordered_ids: string[]; p_proposal_id: string }
        Returns: undefined
      }
      reorder_proposal_benefits: {
        Args: { p_ordered_ids: string[]; p_proposal_id: string }
        Returns: undefined
      }
      transition_membership_status: {
        Args: {
          p_activated_at?: string
          p_actor_user_id?: string
          p_cancel_at_period_end?: boolean
          p_canceled_at?: string
          p_clear_grace_period_end?: boolean
          p_current_period_end?: string
          p_current_period_start?: string
          p_expected_current_status: string
          p_external_event_id?: string
          p_grace_period_end?: string
          p_last_payment_at?: string
          p_membership_id: string
          p_metadata?: Json
          p_new_status: string
          p_provider_status?: string
          p_reason?: string
          p_source: string
          p_suspended_at?: string
        }
        Returns: {
          activated_at: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          grace_period_end: string | null
          id: string
          last_payment_at: string | null
          metadata: Json
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_status: string | null
          provider_subscription_id: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_own_profile: {
        Args: { p_full_name: string }
        Returns: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_platform_owner: boolean
          role: string
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
      update_proposal_details: {
        Args: {
          p_client_id: string
          p_currency: string
          p_expected_revision: number
          p_id: string
          p_internal_notes: string
          p_primary_objective: string
          p_product: string
          p_proposal_type: string
          p_title: string
        }
        Returns: {
          id: string
          revision: number
          updated_at: string
        }[]
      }
      update_proposal_meta: {
        Args: { p_id: string; p_title: string }
        Returns: {
          id: string
        }[]
      }
      upsert_proposal_alternative: {
        Args: {
          p_category: string
          p_currency: string
          p_description: string
          p_display_order: number
          p_expected_revision: number
          p_financial_details: Json
          p_id: string
          p_insurance_company: string
          p_monthly_premium: number
          p_product_name: string
          p_proposal_id: string
          p_title: string
        }
        Returns: {
          id: string
          revision: number
        }[]
      }
      upsert_proposal_benefit: {
        Args: {
          p_category: string
          p_description: string
          p_display_order: number
          p_expected_revision: number
          p_icon: string
          p_id: string
          p_proposal_id: string
          p_title: string
        }
        Returns: {
          id: string
          revision: number
        }[]
      }
      upsert_proposal_comparison: {
        Args: {
          p_columns: Json
          p_expected_revision: number
          p_proposal_id: string
          p_rows: Json
        }
        Returns: {
          id: string
          revision: number
          updated_at: string
        }[]
      }
      upsert_proposal_narrative: {
        Args: {
          p_current_situation: string
          p_detected_needs: string
          p_detected_risks: string
          p_expected_revision: number
          p_objectives: string
          p_opportunities: string
          p_proposal_id: string
          p_recommended_strategy: string
        }
        Returns: {
          id: string
          revision: number
          updated_at: string
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
