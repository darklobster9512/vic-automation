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
          created_by: string | null
          email: string | null
          employment_type: string | null
          first_name: string
          id: string
          is_external: boolean
          is_indeed: boolean
          is_meta: boolean
          last_name: string
          notification_count: number
          notification_timestamps: Json
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
          created_by?: string | null
          email?: string | null
          employment_type?: string | null
          first_name: string
          id?: string
          is_external?: boolean
          is_indeed?: boolean
          is_meta?: boolean
          last_name: string
          notification_count?: number
          notification_timestamps?: Json
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
          created_by?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string
          id?: string
          is_external?: boolean
          is_indeed?: boolean
          is_meta?: boolean
          last_name?: string
          notification_count?: number
          notification_timestamps?: Json
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
      branding_notes: {
        Row: {
          author_email: string
          branding_id: string
          content: string
          created_at: string
          id: string
          page_context: string
        }
        Insert: {
          author_email: string
          branding_id: string
          content: string
          created_at?: string
          id?: string
          page_context: string
        }
        Update: {
          author_email?: string
          branding_id?: string
          content?: string
          created_at?: string
          id?: string
          page_context?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_notes_branding_id_fkey"
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
          created_by: string | null
          end_time: string
          id: string
          interview_slots_per_time: number
          lunch_break_enabled: boolean
          lunch_break_end: string | null
          lunch_break_start: string | null
          min_lead_time_hours: number
          schedule_type: string
          slot_index: number
          slot_interval_minutes: number
          start_time: string
          weekend_end_time: string | null
          weekend_start_time: string | null
        }
        Insert: {
          available_days?: number[]
          branding_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          interview_slots_per_time?: number
          lunch_break_enabled?: boolean
          lunch_break_end?: string | null
          lunch_break_start?: string | null
          min_lead_time_hours?: number
          schedule_type?: string
          slot_index?: number
          slot_interval_minutes?: number
          start_time?: string
          weekend_end_time?: string | null
          weekend_start_time?: string | null
        }
        Update: {
          available_days?: number[]
          branding_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          interview_slots_per_time?: number
          lunch_break_enabled?: boolean
          lunch_break_end?: string | null
          lunch_break_start?: string | null
          min_lead_time_hours?: number
          schedule_type?: string
          slot_index?: number
          slot_interval_minutes?: number
          start_time?: string
          weekend_end_time?: string | null
          weekend_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_schedule_settings_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      brandings: {
        Row: {
          brand_color: string | null
          chat_avatar_url: string | null
          chat_display_name: string | null
          chat_online: boolean
          chat_online_from: string
          chat_online_until: string
          city: string | null
          company_name: string
          created_at: string
          created_by: string | null
          custom_email_link: string | null
          custom_email_link_enabled: boolean
          domain: string | null
          elitegateway_api_key: string | null
          email: string | null
          email_logo_enabled: boolean
          email_logo_url: string | null
          estimated_salary_minijob: number | null
          estimated_salary_teilzeit: number | null
          estimated_salary_vollzeit: number | null
          favicon_url: string | null
          hourly_rate_enabled: boolean
          hourly_rate_minijob: number | null
          hourly_rate_teilzeit: number | null
          hourly_rate_vollzeit: number | null
          id: string
          logo_url: string | null
          main_job_title: string | null
          managing_director: string | null
          payment_model: string
          phone: string | null
          project_manager_image_url: string | null
          project_manager_name: string | null
          project_manager_title: string | null
          recruiter_image_url: string | null
          recruiter_name: string | null
          recruiter_title: string | null
          register_court: string | null
          resend_api_key: string | null
          resend_from_email: string | null
          resend_from_name: string | null
          salary_minijob: number | null
          salary_teilzeit: number | null
          salary_vollzeit: number | null
          seven_api_key: string | null
          signature_font: string | null
          signature_image_url: string | null
          signer_name: string | null
          signer_title: string | null
          sms_ident_disabled: boolean
          sms_sender_name: string | null
          smsbot_api_key: string | null
          smsbot_rental_id: string | null
          spoof_credits: number | null
          street: string | null
          subdomain_prefix: string
          trade_register: string | null
          vat_id: string | null
          zip_code: string | null
        }
        Insert: {
          brand_color?: string | null
          chat_avatar_url?: string | null
          chat_display_name?: string | null
          chat_online?: boolean
          chat_online_from?: string
          chat_online_until?: string
          city?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          custom_email_link?: string | null
          custom_email_link_enabled?: boolean
          domain?: string | null
          elitegateway_api_key?: string | null
          email?: string | null
          email_logo_enabled?: boolean
          email_logo_url?: string | null
          estimated_salary_minijob?: number | null
          estimated_salary_teilzeit?: number | null
          estimated_salary_vollzeit?: number | null
          favicon_url?: string | null
          hourly_rate_enabled?: boolean
          hourly_rate_minijob?: number | null
          hourly_rate_teilzeit?: number | null
          hourly_rate_vollzeit?: number | null
          id?: string
          logo_url?: string | null
          main_job_title?: string | null
          managing_director?: string | null
          payment_model?: string
          phone?: string | null
          project_manager_image_url?: string | null
          project_manager_name?: string | null
          project_manager_title?: string | null
          recruiter_image_url?: string | null
          recruiter_name?: string | null
          recruiter_title?: string | null
          register_court?: string | null
          resend_api_key?: string | null
          resend_from_email?: string | null
          resend_from_name?: string | null
          salary_minijob?: number | null
          salary_teilzeit?: number | null
          salary_vollzeit?: number | null
          seven_api_key?: string | null
          signature_font?: string | null
          signature_image_url?: string | null
          signer_name?: string | null
          signer_title?: string | null
          sms_ident_disabled?: boolean
          sms_sender_name?: string | null
          smsbot_api_key?: string | null
          smsbot_rental_id?: string | null
          spoof_credits?: number | null
          street?: string | null
          subdomain_prefix?: string
          trade_register?: string | null
          vat_id?: string | null
          zip_code?: string | null
        }
        Update: {
          brand_color?: string | null
          chat_avatar_url?: string | null
          chat_display_name?: string | null
          chat_online?: boolean
          chat_online_from?: string
          chat_online_until?: string
          city?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          custom_email_link?: string | null
          custom_email_link_enabled?: boolean
          domain?: string | null
          elitegateway_api_key?: string | null
          email?: string | null
          email_logo_enabled?: boolean
          email_logo_url?: string | null
          estimated_salary_minijob?: number | null
          estimated_salary_teilzeit?: number | null
          estimated_salary_vollzeit?: number | null
          favicon_url?: string | null
          hourly_rate_enabled?: boolean
          hourly_rate_minijob?: number | null
          hourly_rate_teilzeit?: number | null
          hourly_rate_vollzeit?: number | null
          id?: string
          logo_url?: string | null
          main_job_title?: string | null
          managing_director?: string | null
          payment_model?: string
          phone?: string | null
          project_manager_image_url?: string | null
          project_manager_name?: string | null
          project_manager_title?: string | null
          recruiter_image_url?: string | null
          recruiter_name?: string | null
          recruiter_title?: string | null
          register_court?: string | null
          resend_api_key?: string | null
          resend_from_email?: string | null
          resend_from_name?: string | null
          salary_minijob?: number | null
          salary_teilzeit?: number | null
          salary_vollzeit?: number | null
          seven_api_key?: string | null
          signature_font?: string | null
          signature_image_url?: string | null
          signer_name?: string | null
          signer_title?: string | null
          sms_ident_disabled?: boolean
          sms_sender_name?: string | null
          smsbot_api_key?: string | null
          smsbot_rental_id?: string | null
          spoof_credits?: number | null
          street?: string | null
          subdomain_prefix?: string
          trade_register?: string | null
          vat_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      caller_activity_log: {
        Row: {
          action: string
          appointment_id: string | null
          branding_id: string | null
          caller_key_id: string | null
          caller_label: string
          created_at: string
          details: Json
          id: string
        }
        Insert: {
          action: string
          appointment_id?: string | null
          branding_id?: string | null
          caller_key_id?: string | null
          caller_label: string
          created_at?: string
          details?: Json
          id?: string
        }
        Update: {
          action?: string
          appointment_id?: string | null
          branding_id?: string | null
          caller_key_id?: string | null
          caller_label?: string
          created_at?: string
          details?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caller_activity_log_caller_key_id_fkey"
            columns: ["caller_key_id"]
            isOneToOne: false
            referencedRelation: "caller_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_api_keys: {
        Row: {
          branding_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string
          last_used_at: string | null
          slots: number[]
          token_hash: string
        }
        Insert: {
          branding_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label: string
          last_used_at?: string | null
          slots?: number[]
          token_hash: string
        }
        Update: {
          branding_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          slots?: number[]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "caller_api_keys_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          content: string
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          read: boolean
          read_at: string | null
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean
          read_at?: string | null
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean
          read_at?: string | null
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
          branding_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          shortcode: string
        }
        Insert: {
          branding_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          shortcode: string
        }
        Update: {
          branding_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          shortcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_templates_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          branding_id: string
          content: string
          created_at: string
          created_by: string | null
          employment_type: string
          id: string
          is_active: boolean
          salary: number | null
          title: string
          updated_at: string
        }
        Insert: {
          branding_id: string
          content?: string
          created_at?: string
          created_by?: string | null
          employment_type: string
          id?: string
          is_active?: boolean
          salary?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          branding_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          employment_type?: string
          id?: string
          is_active?: boolean
          salary?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_cache: {
        Row: {
          expires_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          expires_at: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          expires_at?: string
          key?: string
          updated_at?: string
          value?: Json
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
      email_queue: {
        Row: {
          attempts: number
          body_lines: Json
          body_title: string
          branding_id: string | null
          button_text: string | null
          button_url: string | null
          created_at: string
          event_type: string
          footer_lines: Json | null
          id: string
          last_error: string | null
          metadata: Json
          next_attempt_at: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          body_lines?: Json
          body_title: string
          branding_id?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          event_type: string
          footer_lines?: Json | null
          id?: string
          last_error?: string | null
          metadata?: Json
          next_attempt_at?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          body_lines?: Json
          body_title?: string
          branding_id?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          event_type?: string
          footer_lines?: Json | null
          id?: string
          last_error?: string | null
          metadata?: Json
          next_attempt_at?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      employment_contracts: {
        Row: {
          admin_notes: string | null
          application_id: string | null
          balance: number
          bank_name: string | null
          bic: string | null
          birth_date: string | null
          birth_place: string | null
          branding_id: string | null
          chat_active_at: string | null
          city: string | null
          contract_dismissed: boolean
          contract_pdf_url: string | null
          created_at: string
          created_by: string | null
          desired_start_date: string | null
          email: string | null
          employment_type: string | null
          first_name: string | null
          health_insurance: string | null
          iban: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_type: string | null
          is_suspended: boolean
          last_name: string | null
          marital_status: string | null
          nationality: string | null
          phone: string | null
          proof_of_address_url: string | null
          requires_proof_of_address: boolean
          signature_data: string | null
          signed_contract_pdf_url: string | null
          social_security_number: string | null
          status: string
          street: string | null
          submitted_at: string | null
          tax_id: string | null
          temp_password: string | null
          template_id: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          admin_notes?: string | null
          application_id?: string | null
          balance?: number
          bank_name?: string | null
          bic?: string | null
          birth_date?: string | null
          birth_place?: string | null
          branding_id?: string | null
          chat_active_at?: string | null
          city?: string | null
          contract_dismissed?: boolean
          contract_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          desired_start_date?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          health_insurance?: string | null
          iban?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_type?: string | null
          is_suspended?: boolean
          last_name?: string | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          proof_of_address_url?: string | null
          requires_proof_of_address?: boolean
          signature_data?: string | null
          signed_contract_pdf_url?: string | null
          social_security_number?: string | null
          status?: string
          street?: string | null
          submitted_at?: string | null
          tax_id?: string | null
          temp_password?: string | null
          template_id?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          admin_notes?: string | null
          application_id?: string | null
          balance?: number
          bank_name?: string | null
          bic?: string | null
          birth_date?: string | null
          birth_place?: string | null
          branding_id?: string | null
          chat_active_at?: string | null
          city?: string | null
          contract_dismissed?: boolean
          contract_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          desired_start_date?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string | null
          health_insurance?: string | null
          iban?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_type?: string | null
          is_suspended?: boolean
          last_name?: string | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          proof_of_address_url?: string | null
          requires_proof_of_address?: boolean
          signature_data?: string | null
          signed_contract_pdf_url?: string | null
          social_security_number?: string | null
          status?: string
          street?: string | null
          submitted_at?: string | null
          tax_id?: string | null
          temp_password?: string | null
          template_id?: string | null
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
          {
            foreignKeyName: "employment_contracts_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      first_workday_appointments: {
        Row: {
          application_id: string | null
          appointment_date: string
          appointment_time: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          id: string
          reminder_1h_sent: boolean
          reminder_sent: boolean
          status: string
        }
        Insert: {
          application_id?: string | null
          appointment_date: string
          appointment_time: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reminder_1h_sent?: boolean
          reminder_sent?: boolean
          status?: string
        }
        Update: {
          application_id?: string | null
          appointment_date?: string
          appointment_time?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reminder_1h_sent?: boolean
          reminder_sent?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_workday_appointments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_workday_appointments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      first_workday_blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string
          branding_id: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "first_workday_blocked_slots_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      ident_info_templates: {
        Row: {
          branding_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branding_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branding_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ident_info_templates_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      ident_sessions: {
        Row: {
          assignment_id: string | null
          branding_id: string | null
          completed_at: string | null
          contract_id: string
          created_at: string
          email_tan_enabled: boolean
          email_tans: Json
          id: string
          info_notes: string | null
          order_id: string | null
          phone_api_url: string | null
          status: string
          test_data: Json | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          branding_id?: string | null
          completed_at?: string | null
          contract_id: string
          created_at?: string
          email_tan_enabled?: boolean
          email_tans?: Json
          id?: string
          info_notes?: string | null
          order_id?: string | null
          phone_api_url?: string | null
          status?: string
          test_data?: Json | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          branding_id?: string | null
          completed_at?: string | null
          contract_id?: string
          created_at?: string
          email_tan_enabled?: boolean
          email_tans?: Json
          id?: string
          info_notes?: string | null
          order_id?: string | null
          phone_api_url?: string | null
          status?: string
          test_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ident_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "order_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ident_sessions_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ident_sessions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ident_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          created_by: string | null
          id: string
          probetag_invite_count: number
          probetag_invite_timestamps: Json
          reminder_1h_sent: boolean
          reminder_count: number
          reminder_sent: boolean
          reminder_timestamps: Json
          slot_index: number | null
          status: string
        }
        Insert: {
          application_id: string
          appointment_date: string
          appointment_time: string
          created_at?: string
          created_by?: string | null
          id?: string
          probetag_invite_count?: number
          probetag_invite_timestamps?: Json
          reminder_1h_sent?: boolean
          reminder_count?: number
          reminder_sent?: boolean
          reminder_timestamps?: Json
          slot_index?: number | null
          status?: string
        }
        Update: {
          application_id?: string
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          probetag_invite_count?: number
          probetag_invite_timestamps?: Json
          reminder_1h_sent?: boolean
          reminder_count?: number
          reminder_sent?: boolean
          reminder_timestamps?: Json
          slot_index?: number | null
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
      kunde_brandings: {
        Row: {
          branding_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          branding_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          branding_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunde_brandings_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
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
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
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
          created_by: string | null
          id: string
          order_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
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
          created_by: string | null
          id: string
          order_id: string
          review_unlocked: boolean
          status: string
        }
        Insert: {
          assigned_at?: string
          contract_id: string
          created_by?: string | null
          id?: string
          order_id: string
          review_unlocked?: boolean
          status?: string
        }
        Update: {
          assigned_at?: string
          contract_id?: string
          created_by?: string | null
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
      order_attachments: {
        Row: {
          attachment_index: number
          contract_id: string
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          order_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          attachment_index: number
          contract_id: string
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          order_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          attachment_index?: number
          contract_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          order_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attachments_order_id_fkey"
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
          created_by: string | null
          id: string
          order_id: string
          question: string
          rating: number
        }
        Insert: {
          comment: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          question: string
          rating: number
        }
        Update: {
          comment?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
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
          branding_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_hours: string | null
          id: string
          is_placeholder: boolean
          is_starter_job: boolean
          is_videochat: boolean
          order_number: string | null
          order_type: string
          playstore_url: string | null
          project_goal: string | null
          provider: string | null
          required_attachments: Json | null
          review_questions: Json | null
          reward: string
          title: string
          work_steps: Json | null
        }
        Insert: {
          appstore_url?: string | null
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_hours?: string | null
          id?: string
          is_placeholder?: boolean
          is_starter_job?: boolean
          is_videochat?: boolean
          order_number?: string | null
          order_type?: string
          playstore_url?: string | null
          project_goal?: string | null
          provider?: string | null
          required_attachments?: Json | null
          review_questions?: Json | null
          reward: string
          title: string
          work_steps?: Json | null
        }
        Update: {
          appstore_url?: string | null
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_hours?: string | null
          id?: string
          is_placeholder?: boolean
          is_starter_job?: boolean
          is_videochat?: boolean
          order_number?: string | null
          order_type?: string
          playstore_url?: string | null
          project_goal?: string | null
          provider?: string | null
          required_attachments?: Json | null
          review_questions?: Json | null
          reward?: string
          title?: string
          work_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          api_url: string | null
          branding_id: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          provider: string
          rental_id: string | null
        }
        Insert: {
          api_url?: string | null
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          provider?: string
          rental_id?: string | null
        }
        Update: {
          api_url?: string | null
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          provider?: string
          rental_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branding_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_chat_online: boolean
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          branding_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_chat_online?: boolean
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          branding_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_chat_online?: boolean
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string
          branding_id: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          slot_index: number | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          slot_index?: number | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          slot_index?: number | null
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
      sms_inbox_seen: {
        Row: {
          branding_id: string | null
          created_at: string
          id: string
          message_hash: string
          phone_number: string | null
          provider: string
          received_at: string | null
          source_key: string
        }
        Insert: {
          branding_id?: string | null
          created_at?: string
          id?: string
          message_hash: string
          phone_number?: string | null
          provider: string
          received_at?: string | null
          source_key: string
        }
        Update: {
          branding_id?: string | null
          created_at?: string
          id?: string
          message_hash?: string
          phone_number?: string | null
          provider?: string
          received_at?: string | null
          source_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_inbox_seen_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          branding_id: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          event_type: string
          id: string
          message: string
          recipient_name: string | null
          recipient_phone: string
          status: string
        }
        Insert: {
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message: string
          recipient_name?: string | null
          recipient_phone: string
          status?: string
        }
        Update: {
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message?: string
          recipient_name?: string | null
          recipient_phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_spoof_logs: {
        Row: {
          branding_id: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          recipient_name: string | null
          recipient_phone: string
          sender_name: string
          source: string | null
          template_id: string | null
        }
        Insert: {
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          recipient_name?: string | null
          recipient_phone: string
          sender_name: string
          source?: string | null
          template_id?: string | null
        }
        Update: {
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          recipient_name?: string | null
          recipient_phone?: string
          sender_name?: string
          source?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_spoof_logs_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
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
          branding_id: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string
          message: string
          sender_name: string
        }
        Insert: {
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          message: string
          sender_name: string
        }
        Update: {
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          message?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_spoof_templates_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
            referencedColumns: ["id"]
          },
        ]
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
      trial_day_appointments: {
        Row: {
          application_id: string
          appointment_date: string
          appointment_time: string
          created_at: string
          created_by: string | null
          id: string
          reminder_1h_sent: boolean
          reminder_count: number
          reminder_sent: boolean
          reminder_timestamps: Json
          status: string
          success_notification_count: number | null
          success_notification_timestamps: Json | null
        }
        Insert: {
          application_id: string
          appointment_date: string
          appointment_time: string
          created_at?: string
          created_by?: string | null
          id?: string
          reminder_1h_sent?: boolean
          reminder_count?: number
          reminder_sent?: boolean
          reminder_timestamps?: Json
          status?: string
          success_notification_count?: number | null
          success_notification_timestamps?: Json | null
        }
        Update: {
          application_id?: string
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reminder_1h_sent?: boolean
          reminder_count?: number
          reminder_sent?: boolean
          reminder_timestamps?: Json
          status?: string
          success_notification_count?: number | null
          success_notification_timestamps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_day_appointments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_day_blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string
          branding_id: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string
          branding_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_day_blocked_slots_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "brandings"
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
      approve_employment_contract: {
        Args: { _contract_id: string }
        Returns: undefined
      }
      apps_for_branding_ids: { Args: { _user_id: string }; Returns: string[] }
      book_first_workday_public: {
        Args: {
          _appointment_date: string
          _appointment_time: string
          _contract_id: string
          _phone?: string
        }
        Returns: string
      }
      book_interview_public: {
        Args: {
          _application_id: string
          _appointment_date: string
          _appointment_time: string
        }
        Returns: {
          appointment_id: string
          slot_index: number
        }[]
      }
      booked_slots_for_branding: {
        Args: { _branding_id: string }
        Returns: {
          appointment_date: string
          appointment_time: string
        }[]
      }
      claim_email_batch: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          body_lines: Json
          body_title: string
          branding_id: string | null
          button_text: string | null
          button_url: string | null
          created_at: string
          event_type: string
          footer_lines: Json | null
          id: string
          last_error: string | null
          metadata: Json
          next_attempt_at: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      contracts_for_branding_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      decrement_spoof_credits: {
        Args: { _branding_id: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: {
          _body_lines: Json
          _body_title: string
          _branding_id: string
          _button_text: string
          _button_url: string
          _event_type: string
          _footer_lines: Json
          _metadata: Json
          _recipient_name: string
          _subject: string
          _to: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      interview_booked_slots_for_branding: {
        Args: { _branding_id: string }
        Returns: {
          appointment_date: string
          appointment_time: string
          slot_index: number
        }[]
      }
      interview_slots_for_branding: {
        Args: { _branding_id: string }
        Returns: {
          appointment_id: string
          slot: number
          slot_total: number
        }[]
      }
      is_caller: { Args: { _user_id: string }; Returns: boolean }
      is_kunde: { Args: { _user_id: string }; Returns: boolean }
      resolved_interview_slots_for_branding: {
        Args: { _branding_id: string }
        Returns: {
          appointment_date: string
          appointment_id: string
          appointment_time: string
          slot_index: number
        }[]
      }
      submit_employment_contract:
        | {
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
              _id_type?: string
              _last_name: string
              _marital_status: string
              _nationality: string
              _phone: string
              _proof_of_address_url?: string
              _social_security_number: string
              _street: string
              _tax_id: string
              _zip_code: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _bank_name: string
              _bic: string
              _birth_date: string
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
              _phone: string
              _social_security_number: string
              _street: string
              _tax_id: string
              _zip_code: string
            }
            Returns: undefined
          }
      trial_day_booked_slots_for_branding: {
        Args: { _branding_id: string }
        Returns: {
          appointment_date: string
          appointment_time: string
        }[]
      }
      unassign_order: {
        Args: { _contract_id: string; _order_id: string }
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
      update_contract_phone_public: {
        Args: { _contract_id: string; _phone: string }
        Returns: undefined
      }
      update_first_workday_status: {
        Args: { _appointment_id: string; _status: string }
        Returns: undefined
      }
      update_interview_status: {
        Args: { _appointment_id: string; _status: string }
        Returns: undefined
      }
      update_trial_day_status: {
        Args: { _appointment_id: string; _status: string }
        Returns: undefined
      }
      user_application_ids: { Args: { _user_id: string }; Returns: string[] }
      user_branding_ids: { Args: { _user_id: string }; Returns: string[] }
      user_can_read_branding: {
        Args: { _branding_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_any_branding: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "kunde" | "caller"
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
      app_role: ["admin", "user", "kunde", "caller"],
    },
  },
} as const
