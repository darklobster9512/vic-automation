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
      admin_permissions: {
        Row: {
          allowed_path: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          allowed_path: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          allowed_path?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          branding_id: string | null
          city: string | null
          created_at: string
          email: string | null
          employment_type: string | null
          first_name: string
          id: string
          is_indeed: boolean
          last_name: string
          phone: string | null
          resume_url: string | null
          status: string
          street: string | null
          zip_code: string | null
        }
        Insert: {
          branding_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          employment_type?: string | null
          first_name: string
          id?: string
          is_indeed?: boolean
          last_name: string
          phone?: string | null
          resume_url?: string | null
          status?: string
          street?: string | null
          zip_code?: string | null
        }
        Update: {
          branding_id?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          employment_type?: string | null
          first_name?: string
          id?: string
          is_indeed?: boolean
          last_name?: string
          phone?: string | null
          resume_url?: string | null
          status?: string
          street?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_schedule_settings: {
        Row: {
          available_days: number[]
          branding_id: string
          created_at: string
          end_time: string
          id: string
          slot_interval_minutes: number
          start_time: string
        }
        Insert: {
          available_days?: number[]
          branding_id: string
          created_at?: string
          end_time?: string
          id?: string
          slot_interval_minutes?: number
          start_time?: string
        }
        Update: {
          available_days?: number[]
          branding_id?: string
          created_at?: string
          end_time?: string
          id?: string
          slot_interval_minutes?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_schedule_settings_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: true
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      brandings: {
        Row: {
          brand_color: string | null
          city: string | null
          company_name: string
          created_at: string
          domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          managing_director: string | null
          phone: string | null
          register_court: string | null
          resend_api_key: string | null
          resend_from_email: string | null
          resend_from_name: string | null
          sms_sender_name: string | null
          street: string | null
          trade_register: string | null
          vat_id: string | null
          zip_code: string | null
        }
        Insert: {
          brand_color?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          managing_director?: string | null
          phone?: string | null
          register_court?: string | null
          resend_api_key?: string | null
          resend_from_email?: string | null
          resend_from_name?: string | null
          sms_sender_name?: string | null
          street?: string | null
          trade_register?: string | null
          vat_id?: string | null
          zip_code?: string | null
        }
        Update: {
          brand_color?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          managing_director?: string | null
          phone?: string | null
          register_court?: string | null
          resend_api_key?: string | null
          resend_from_email?: string | null
          resend_from_name?: string | null
          sms_sender_name?: string | null
          street?: string | null
          trade_register?: string | null
          vat_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          content: string
          contract_id: string
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          contract_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          contract_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          shortcode: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          shortcode: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          shortcode?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          branding_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          status: string
          subject: string
        }
        Insert: {
          branding_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          status?: string
          subject: string
        }
        Update: {
          branding_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_contracts: {
        Row: {
          application_id: string
          balance: number
          bank_name: string | null
          bic: string | null
          birth_date: string | null
          birth_place: string | null
          city: string | null
          contract_pdf_url: string | null
          created_at: string
          desired_start_date: string | null
          email: string | null
          employment_type: string | null
          first_name: string | null
          health_insurance: string | null
          iban: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          is_suspended: boolean
          last_name: string | null
          marital_status: string | null
          nationality: string | null
          phone: string | null
          signature_data: string | null
          signed_contract_pdf_url: string | null
          social_security_number: string | null
          status: string
          street: string | null
          submitted_at: string | null
          tax_id: string | null
          temp_password: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          application_id: string
          balance?: number
          bank_name?: string | null
          bic?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          contract_pdf_url?: string | null
          created_at?: string
          desired_start_date?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          health_insurance?: string | null
          iban?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          is_suspended?: boolean
          last_name?: string | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          signature_data?: string | null
          signed_contract_pdf_url?: string | null
          social_security_number?: string | null
          status?: string
          street?: string | null
          submitted_at?: string | null
          tax_id?: string | null
          temp_password?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          application_id?: string
          balance?: number
          bank_name?: string | null
          bic?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          contract_pdf_url?: string | null
          created_at?: string
          desired_start_date?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          health_insurance?: string | null
          iban?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          is_suspended?: boolean
          last_name?: string | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          signature_data?: string | null
          signed_contract_pdf_url?: string | null
          social_security_number?: string | null
          status?: string
          street?: string | null
          submitted_at?: string | null
          tax_id?: string | null
          temp_password?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_appointments: {
        Row: {
          application_id: string
          appointment_date: string
          appointment_time: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          application_id: string
          appointment_date: string
          appointment_time: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          application_id?: string
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_appointments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      order_appointment_blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string
          branding_id: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          branding_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          branding_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_appointment_blocked_slots_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          contract_id: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          contract_id: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          contract_id?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_appointments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          assigned_at: string
          contract_id: string
          id: string
          order_id: string
          review_unlocked: boolean
          status: string
        }
        Insert: {
          assigned_at?: string
          contract_id: string
          id?: string
          order_id: string
          review_unlocked?: boolean
          status?: string
        }
        Update: {
          assigned_at?: string
          contract_id?: string
          id?: string
          order_id?: string
          review_unlocked?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reviews: {
        Row: {
          comment: string
          contract_id: string
          created_at: string
          id: string
          order_id: string
          question: string
          rating: number
        }
        Insert: {
          comment: string
          contract_id: string
          created_at?: string
          id?: string
          order_id: string
          question: string
          rating: number
        }
        Update: {
          comment?: string
          contract_id?: string
          created_at?: string
          id?: string
          order_id?: string
          question?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          appstore_url: string | null
          created_at: string
          id: string
          is_placeholder: boolean
          order_number: string
          playstore_url: string | null
          project_goal: string | null
          provider: string
          review_questions: Json | null
          reward: string
          title: string
        }
        Insert: {
          appstore_url?: string | null
          created_at?: string
          id?: string
          is_placeholder?: boolean
          order_number: string
          playstore_url?: string | null
          project_goal?: string | null
          provider: string
          review_questions?: Json | null
          reward: string
          title: string
        }
        Update: {
          appstore_url?: string | null
          created_at?: string
          id?: string
          is_placeholder?: boolean
          order_number?: string
          playstore_url?: string | null
          project_goal?: string | null
          provider?: string
          review_questions?: Json | null
          reward?: string
          title?: string
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          api_url: string
          created_at: string
          id: string
        }
        Insert: {
          api_url: string
          created_at?: string
          id?: string
        }
        Update: {
          api_url?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      schedule_blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string
          branding_id: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          branding_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          branding_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocked_slots_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_settings: {
        Row: {
          available_days: number[]
          created_at: string
          end_time: string
          id: string
          interval_change_date: string | null
          new_slot_interval_minutes: number | null
          slot_interval_minutes: number
          start_time: string
        }
        Insert: {
          available_days?: number[]
          created_at?: string
          end_time?: string
          id?: string
          interval_change_date?: string | null
          new_slot_interval_minutes?: number | null
          slot_interval_minutes?: number
          start_time?: string
        }
        Update: {
          available_days?: number[]
          created_at?: string
          end_time?: string
          id?: string
          interval_change_date?: string | null
          new_slot_interval_minutes?: number | null
          slot_interval_minutes?: number
          start_time?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          code: string
          created_at: string
          id: string
          target_url: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          target_url: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          target_url?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          message: string
          recipient_name: string | null
          recipient_phone: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          message: string
          recipient_name?: string | null
          recipient_phone: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          message?: string
          recipient_name?: string | null
          recipient_phone?: string
          status?: string
        }
        Relationships: []
      }
      sms_spoof_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          recipient_name: string | null
          recipient_phone: string
          sender_name: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          recipient_name?: string | null
          recipient_phone: string
          sender_name: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          recipient_name?: string | null
          recipient_phone?: string
          sender_name?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_spoof_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_spoof_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_spoof_templates: {
        Row: {
          created_at: string
          id: string
          label: string
          message: string
          sender_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          message: string
          sender_name: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          message?: string
          sender_name?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          event_type: string
          id: string
          label: string
          message: string
          updated_at: string
        }
        Insert: {
          event_type: string
          id?: string
          label: string
          message: string
          updated_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          label?: string
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_chats: {
        Row: {
          branding_ids: string[]
          chat_id: string
          created_at: string
          events: string[]
          id: string
          label: string
        }
        Insert: {
          branding_ids?: string[]
          chat_id: string
          created_at?: string
          events?: string[]
          id?: string
          label?: string
        }
        Update: {
          branding_ids?: string[]
          chat_id?: string
          created_at?: string
          events?: string[]
          id?: string
          label?: string
        }
        Relationships: []
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
      approve_employment_contract: {
        Args: { _contract_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_employment_contract: {
        Args: {
          _bank_name: string
          _bic: string
          _birth_date: string
          _birth_place: string
          _city: string
          _contract_id: string
          _desired_start_date: string
          _email: string
          _employment_type: string
          _first_name: string
          _health_insurance: string
          _iban: string
          _id_back_url: string
          _id_front_url: string
          _last_name: string
          _marital_status: string
          _nationality: string
          _phone: string
          _social_security_number: string
          _street: string
          _tax_id: string
          _zip_code: string
        }
        Returns: undefined
      }
      update_application_phone: {
        Args: { _application_id: string; _phone: string }
        Returns: undefined
      }
      update_application_status: {
        Args: { _application_id: string; _status: string }
        Returns: undefined
      }
      update_interview_status: {
        Args: { _appointment_id: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "kunde"
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
      app_role: ["admin", "user", "kunde"],
    },
  },
} as const
