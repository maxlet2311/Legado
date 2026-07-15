// Generado desde el esquema real de Supabase (mcp: generate_typescript_types).
// No editar a mano — regenerar tras cada migración.
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
          created_at: string
          embedding: string | null
          id: string
          is_favorite: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_favorite?: boolean
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_favorite?: boolean
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
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
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
          detected_risks: string | null
          executive_summary: string | null
          expected_result: string | null
          final_message: string | null
          id: string
          objectives: string | null
          opportunities: string | null
          proposal_id: string | null
          recommended_strategy: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_situation?: string | null
          detected_risks?: string | null
          executive_summary?: string | null
          expected_result?: string | null
          final_message?: string | null
          id?: string
          objectives?: string | null
          opportunities?: string | null
          proposal_id?: string | null
          recommended_strategy?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_situation?: string | null
          detected_risks?: string | null
          executive_summary?: string | null
          expected_result?: string | null
          final_message?: string | null
          id?: string
          objectives?: string | null
          opportunities?: string | null
          proposal_id?: string | null
          recommended_strategy?: string | null
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
      proposal_versions: {
        Row: {
          content_json: Json
          created_at: string
          created_by: string | null
          id: string
          proposal_id: string | null
          render_json: Json
          user_id: string
          version_number: number
        }
        Insert: {
          content_json: Json
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string | null
          render_json: Json
          user_id: string
          version_number: number
        }
        Update: {
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string | null
          render_json?: Json
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
          expires_at: string | null
          font_family: string
          id: string
          last_exported_at: string | null
          last_opened_at: string
          margin_size: string
          orientation: string
          pdf_format: string
          primary_color_override: string | null
          primary_objective: string
          proposal_number: string
          proposal_type: string
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
          expires_at?: string | null
          font_family?: string
          id?: string
          last_exported_at?: string | null
          last_opened_at?: string
          margin_size?: string
          orientation?: string
          pdf_format?: string
          primary_color_override?: string | null
          primary_objective: string
          proposal_number: string
          proposal_type: string
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
          expires_at?: string | null
          font_family?: string
          id?: string
          last_exported_at?: string | null
          last_opened_at?: string
          margin_size?: string
          orientation?: string
          pdf_format?: string
          primary_color_override?: string | null
          primary_objective?: string
          proposal_number?: string
          proposal_type?: string
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
      create_draft_proposal: {
        Args: {
          p_client_id: string
          p_currency: string
          p_primary_objective: string
          p_proposal_type: string
          p_title: string
        }
        Returns: {
          id: string
          proposal_number: string
        }[]
      }
      generate_proposal_number: { Args: Record<PropertyKey, never>; Returns: string }
      update_proposal_meta: {
        Args: { p_id: string; p_title: string }
        Returns: {
          id: string
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
