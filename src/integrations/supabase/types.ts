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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          email_sent: boolean
          id: string
          kind: string
          order_id: string | null
          payload: Json | null
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          kind?: string
          order_id?: string | null
          payload?: Json | null
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          kind?: string
          order_id?: string | null
          payload?: Json | null
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_private_settings: {
        Row: {
          body: string
          key: string
          updated_at: string
        }
        Insert: {
          body?: string
          key: string
          updated_at?: string
        }
        Update: {
          body?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          archived: boolean
          created_at: string
          featured: boolean
          id: string
          location: string | null
          product_slug: string | null
          published: boolean
          rating: number | null
          review_date: string | null
          review_text: string
          reviewer_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          featured?: boolean
          id?: string
          location?: string | null
          product_slug?: string | null
          published?: boolean
          rating?: number | null
          review_date?: string | null
          review_text: string
          reviewer_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          featured?: boolean
          id?: string
          location?: string | null
          product_slug?: string | null
          published?: boolean
          rating?: number | null
          review_date?: string | null
          review_text?: string
          reviewer_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["slug"]
          },
        ]
      }
      discount_code_events: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          before: Json | null
          code: string
          code_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          code: string
          code_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          code?: string
          code_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          code_kind: string
          combine_credit: boolean
          combine_crypto: boolean
          combine_multibuy: boolean
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          expires_at: string | null
          id: string
          max_uses: number
          milestone: number | null
          min_spend_cents: number
          note: string | null
          times_used: number
          updated_at: string
          user_id: string | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          code_kind?: string
          combine_credit?: boolean
          combine_crypto?: boolean
          combine_multibuy?: boolean
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          id?: string
          max_uses?: number
          milestone?: number | null
          min_spend_cents?: number
          note?: string | null
          times_used?: number
          updated_at?: string
          user_id?: string | null
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          code_kind?: string
          combine_credit?: boolean
          combine_crypto?: boolean
          combine_multibuy?: boolean
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          id?: string
          max_uses?: number
          milestone?: number | null
          min_spend_cents?: number
          note?: string | null
          times_used?: number
          updated_at?: string
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          line_cost_cents: number
          line_no: number
          product_id: string
          product_name: string
          product_slug: string
          quantity: number
          stock_applied: boolean
          untracked: boolean
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          line_cost_cents: number
          line_no: number
          product_id: string
          product_name: string
          product_slug: string
          quantity: number
          stock_applied?: boolean
          untracked?: boolean
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          line_cost_cents?: number
          line_no?: number
          product_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          stock_applied?: boolean
          untracked?: boolean
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          discount_cents: number
          id: string
          occurred_on: string
          other_costs_cents: number
          product_slug: string | null
          quantity: number | null
          request_hash: string | null
          request_id: string | null
          restocked: boolean
          supplier: string
          updated_at: string
          variant_label: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          discount_cents?: number
          id?: string
          occurred_on?: string
          other_costs_cents?: number
          product_slug?: string | null
          quantity?: number | null
          request_hash?: string | null
          request_id?: string | null
          restocked?: boolean
          supplier?: string
          updated_at?: string
          variant_label?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          discount_cents?: number
          id?: string
          occurred_on?: string
          other_costs_cents?: number
          product_slug?: string | null
          quantity?: number | null
          request_hash?: string | null
          request_id?: string | null
          restocked?: boolean
          supplier?: string
          updated_at?: string
          variant_label?: string | null
        }
        Relationships: []
      }
      first_purchase_claims: {
        Row: {
          created_at: string
          emails: string[]
          expires_at: string | null
          id: string
          order_id: string | null
          payment_attempt_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emails: string[]
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emails?: string[]
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_purchase_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      foundation_member_settings: {
        Row: {
          benefit_percent: number
          capacity: number
          enrolment_enabled: boolean
          id: number
          launched_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          benefit_percent?: number
          capacity?: number
          enrolment_enabled?: boolean
          id?: number
          launched_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          benefit_percent?: number
          capacity?: number
          enrolment_enabled?: boolean
          id?: number
          launched_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      foundation_members: {
        Row: {
          awarded_at: string
          granted_by: string | null
          id: string
          member_number: number
          order_id: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          granted_by?: string | null
          id?: string
          member_number: number
          order_id?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          granted_by?: string | null
          id?: string
          member_number?: number
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foundation_members_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_checkout_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          actor: string | null
          after_qty: number
          before_qty: number
          created_at: string
          delta: number
          id: string
          kind: string
          product_id: string
          product_slug: string
          reason: string
          reference: string | null
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          actor?: string | null
          after_qty: number
          before_qty: number
          created_at?: string
          delta: number
          id?: string
          kind: string
          product_id: string
          product_slug: string
          reason: string
          reference?: string | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          actor?: string | null
          after_qty?: number
          before_qty?: number
          created_at?: string
          delta?: number
          id?: string
          kind?: string
          product_id?: string
          product_slug?: string
          reason?: string
          reference?: string | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: []
      }
      inventory_reorder_settings: {
        Row: {
          product_id: string
          threshold: number
          updated_at: string
          updated_by: string | null
          variant_key: string
        }
        Insert: {
          product_id: string
          threshold: number
          updated_at?: string
          updated_by?: string | null
          variant_key: string
        }
        Update: {
          product_id?: string
          threshold?: number
          updated_at?: string
          updated_by?: string | null
          variant_key?: string
        }
        Relationships: []
      }
      member_calendar_entries: {
        Row: {
          created_at: string
          dose_label: string
          end_date: string | null
          frequency: string
          id: string
          notes: string
          product_name: string
          reminder_enabled: boolean
          start_date: string
          time_of_day: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose_label?: string
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string
          product_name: string
          reminder_enabled?: boolean
          start_date: string
          time_of_day?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose_label?: string
          end_date?: string | null
          frequency?: string
          id?: string
          notes?: string
          product_name?: string
          reminder_enabled?: boolean
          start_date?: string
          time_of_day?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_calendar_reminder_sends: {
        Row: {
          created_at: string
          entry_id: string
          occurs_on: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          occurs_on: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          occurs_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_calendar_reminder_sends_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "member_calendar_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      member_welcome_email_queue: {
        Row: {
          attempts: number
          claimed_until: string | null
          completed_at: string | null
          created_at: string
          last_error: string | null
          next_attempt_at: string
          outcome: string | null
          template_version: string
          user_id: string
        }
        Insert: {
          attempts?: number
          claimed_until?: string | null
          completed_at?: string | null
          created_at?: string
          last_error?: string | null
          next_attempt_at?: string
          outcome?: string | null
          template_version: string
          user_id: string
        }
        Update: {
          attempts?: number
          claimed_until?: string | null
          completed_at?: string | null
          created_at?: string
          last_error?: string | null
          next_attempt_at?: string
          outcome?: string | null
          template_version?: string
          user_id?: string
        }
        Relationships: []
      }
      order_acknowledgements: {
        Row: {
          accepted: boolean
          accepted_at: string
          created_at: string
          guest_session_id: string | null
          id: string
          order_id: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string
          created_at?: string
          guest_session_id?: string | null
          id?: string
          order_id?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string
          created_at?: string
          guest_session_id?: string | null
          id?: string
          order_id?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_acknowledgements_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_acknowledgements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_checkpoint_email_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          kind: string
          last_error: string | null
          next_attempt_at: string
          order_id: string
          outcome: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          kind: string
          last_error?: string | null
          next_attempt_at?: string
          order_id: string
          outcome?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          kind?: string
          last_error?: string | null
          next_attempt_at?: string
          order_id?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_checkpoint_email_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_confirmation_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          order_id: string
          outcome: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          order_id: string
          outcome?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          order_id?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_confirmation_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_name: string
          product_slug: string
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_name: string
          product_slug: string
          quantity: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_milestones: {
        Row: {
          active: boolean
          created_at: string
          discount_percent: number
          id: string
          note: string
          order_count: number
          reward_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          id?: string
          note?: string
          order_count: number
          reward_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          id?: string
          note?: string
          order_count?: number
          reward_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          code_discount_cents: number
          contact_email: string | null
          contact_email_normalized: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          credit_cents: number
          credit_reservation_id: string | null
          credit_units: number
          delivered_at: string | null
          discount_code: string | null
          discount_code_id: string | null
          discount_code_kind: string | null
          first_offer_claim_id: string | null
          first_purchase_offer: Json | null
          guest_session_id: string | null
          id: string
          notes: string | null
          order_number: number
          payment_confirmed: boolean
          payment_confirmed_at: string | null
          payment_failure_code: string | null
          payment_method: string
          payment_provider: string | null
          payment_reference: string | null
          payment_transaction_id: string | null
          pricing_snapshot: Json | null
          referral_claim_id: string | null
          referrer_user_id: string | null
          refunded_at: string | null
          shipping: number
          shipping_address: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_livemode: boolean | null
          subtotal: number
          total: number
          tracking_checked_at: string | null
          tracking_number: string | null
          tracking_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code_discount_cents?: number
          contact_email?: string | null
          contact_email_normalized?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_cents?: number
          credit_reservation_id?: string | null
          credit_units?: number
          delivered_at?: string | null
          discount_code?: string | null
          discount_code_id?: string | null
          discount_code_kind?: string | null
          first_offer_claim_id?: string | null
          first_purchase_offer?: Json | null
          guest_session_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_confirmed?: boolean
          payment_confirmed_at?: string | null
          payment_failure_code?: string | null
          payment_method?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_transaction_id?: string | null
          pricing_snapshot?: Json | null
          referral_claim_id?: string | null
          referrer_user_id?: string | null
          refunded_at?: string | null
          shipping?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_livemode?: boolean | null
          subtotal?: number
          total?: number
          tracking_checked_at?: string | null
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code_discount_cents?: number
          contact_email?: string | null
          contact_email_normalized?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_cents?: number
          credit_reservation_id?: string | null
          credit_units?: number
          delivered_at?: string | null
          discount_code?: string | null
          discount_code_id?: string | null
          discount_code_kind?: string | null
          first_offer_claim_id?: string | null
          first_purchase_offer?: Json | null
          guest_session_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_confirmed?: boolean
          payment_confirmed_at?: string | null
          payment_failure_code?: string | null
          payment_method?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_transaction_id?: string | null
          pricing_snapshot?: Json | null
          referral_claim_id?: string | null
          referrer_user_id?: string | null
          refunded_at?: string | null
          shipping?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_livemode?: boolean | null
          subtotal?: number
          total?: number
          tracking_checked_at?: string | null
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_checkout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          access_code: string | null
          acknowledgement_id: string | null
          amount_cents: number
          created_at: string
          currency: string
          error_code: string | null
          first_offer_claim_id: string | null
          first_purchase_offer: Json | null
          guest_session_id: string | null
          id: string
          order_id: string | null
          order_payload: Json
          provider: string
          referral_claim_id: string | null
          status: string
          stripe_livemode: boolean | null
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_code?: string | null
          acknowledgement_id?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          error_code?: string | null
          first_offer_claim_id?: string | null
          first_purchase_offer?: Json | null
          guest_session_id?: string | null
          id?: string
          order_id?: string | null
          order_payload: Json
          provider?: string
          referral_claim_id?: string | null
          status?: string
          stripe_livemode?: boolean | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_code?: string | null
          acknowledgement_id?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          error_code?: string | null
          first_offer_claim_id?: string | null
          first_purchase_offer?: Json | null
          guest_session_id?: string | null
          id?: string
          order_id?: string | null
          order_payload?: Json
          provider?: string
          referral_claim_id?: string | null
          status?: string
          stripe_livemode?: boolean | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_acknowledgement_id_fkey"
            columns: ["acknowledgement_id"]
            isOneToOne: false
            referencedRelation: "order_acknowledgements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          alt: string
          blurb: string
          catalogue_section: string
          categories: string[]
          coming_soon: boolean
          created_at: string
          description: string
          details: string[]
          id: string
          image_url: string
          kit_price: number | null
          name: string
          price: number
          product_links: Json
          product_variants: Json
          promo_label: string
          protocol: string
          recon_dose_mcg: number | null
          recon_dose_mg: number | null
          recon_notes: string
          recon_vial_mg: number | null
          recon_water_ml: number | null
          sale_price: number | null
          slug: string
          sort_order: number
          starter_kit_enabled: boolean
          stock_quantity: number
          unlimited_stock: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          alt?: string
          blurb?: string
          catalogue_section?: string
          categories?: string[]
          coming_soon?: boolean
          created_at?: string
          description?: string
          details?: string[]
          id?: string
          image_url?: string
          kit_price?: number | null
          name: string
          price?: number
          product_links?: Json
          product_variants?: Json
          promo_label?: string
          protocol?: string
          recon_dose_mcg?: number | null
          recon_dose_mg?: number | null
          recon_notes?: string
          recon_vial_mg?: number | null
          recon_water_ml?: number | null
          sale_price?: number | null
          slug: string
          sort_order?: number
          starter_kit_enabled?: boolean
          stock_quantity?: number
          unlimited_stock?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          alt?: string
          blurb?: string
          catalogue_section?: string
          categories?: string[]
          coming_soon?: boolean
          created_at?: string
          description?: string
          details?: string[]
          id?: string
          image_url?: string
          kit_price?: number | null
          name?: string
          price?: number
          product_links?: Json
          product_variants?: Json
          promo_label?: string
          protocol?: string
          recon_dose_mcg?: number | null
          recon_dose_mg?: number | null
          recon_notes?: string
          recon_vial_mg?: number | null
          recon_water_ml?: number | null
          sale_price?: number | null
          slug?: string
          sort_order?: number
          starter_kit_enabled?: boolean
          stock_quantity?: number
          unlimited_stock?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          postal_address: string | null
          postcode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          postal_address?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          postal_address?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_code_redemptions: {
        Row: {
          code_id: string
          created_at: string
          emails: string[]
          order_id: string
          user_id: string
        }
        Insert: {
          code_id: string
          created_at?: string
          emails?: string[]
          order_id: string
          user_id: string
        }
        Update: {
          code_id?: string
          created_at?: string
          emails?: string[]
          order_id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_code_success_history: {
        Row: {
          code_id: string
          created_at: string
          emails: string[]
          order_id: string
          user_id: string | null
        }
        Insert: {
          code_id: string
          created_at?: string
          emails?: string[]
          order_id: string
          user_id?: string | null
        }
        Update: {
          code_id?: string
          created_at?: string
          emails?: string[]
          order_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      referral_discount_rollouts: {
        Row: {
          applied_at: string
          before_rows: Json
          key: string
        }
        Insert: {
          applied_at?: string
          before_rows: Json
          key: string
        }
        Update: {
          applied_at?: string
          before_rows?: Json
          key?: string
        }
        Relationships: []
      }
      referral_milestone_awards: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          threshold: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          threshold: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_milestone_awards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_redemption_claims: {
        Row: {
          code_id: string | null
          created_at: string
          emails: string[]
          expires_at: string | null
          id: string
          order_id: string | null
          payment_attempt_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code_id?: string | null
          created_at?: string
          emails?: string[]
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code_id?: string | null
          created_at?: string
          emails?: string[]
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          allow_code_crypto: boolean
          allow_code_multibuy: boolean
          allow_credit_code: boolean
          allow_credit_discounts: boolean
          allow_multibuy_crypto: boolean
          combined_cap_percent: number
          credit_unit_cents: number
          crypto_percent: number
          first_offer_combine_code: boolean
          first_offer_combine_credit: boolean
          first_offer_combine_crypto: boolean
          first_offer_combine_multibuy: boolean
          first_offer_enabled: boolean
          first_offer_percent: number
          id: number
          max_credit_units: number
          milestone_thresholds: number[]
          multibuy_tiers: Json
          program_enabled: boolean
          referral_reward_units: number
          reward_every_referrals: number
          reward_expiry_days: number
          reward_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_code_crypto?: boolean
          allow_code_multibuy?: boolean
          allow_credit_code?: boolean
          allow_credit_discounts?: boolean
          allow_multibuy_crypto?: boolean
          combined_cap_percent?: number
          credit_unit_cents?: number
          crypto_percent?: number
          first_offer_combine_code?: boolean
          first_offer_combine_credit?: boolean
          first_offer_combine_crypto?: boolean
          first_offer_combine_multibuy?: boolean
          first_offer_enabled?: boolean
          first_offer_percent?: number
          id?: number
          max_credit_units?: number
          milestone_thresholds?: number[]
          multibuy_tiers?: Json
          program_enabled?: boolean
          referral_reward_units?: number
          reward_every_referrals?: number
          reward_expiry_days?: number
          reward_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_code_crypto?: boolean
          allow_code_multibuy?: boolean
          allow_credit_code?: boolean
          allow_credit_discounts?: boolean
          allow_multibuy_crypto?: boolean
          combined_cap_percent?: number
          credit_unit_cents?: number
          crypto_percent?: number
          first_offer_combine_code?: boolean
          first_offer_combine_credit?: boolean
          first_offer_combine_crypto?: boolean
          first_offer_combine_multibuy?: boolean
          first_offer_enabled?: boolean
          first_offer_percent?: number
          id?: number
          max_credit_units?: number
          milestone_thresholds?: number[]
          multibuy_tiers?: Json
          program_enabled?: boolean
          referral_reward_units?: number
          reward_every_referrals?: number
          reward_expiry_days?: number
          reward_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      research_entries: {
        Row: {
          at_a_glance: string
          blend_notice: boolean
          cas_number: string | null
          category: string
          claim_checks: Json
          content: Json
          created_at: string
          evidence_status: string
          id: string
          molecular_formula: string | null
          pubchem_cid: string | null
          published: boolean
          published_at: string | null
          research_findings: Json
          sequence: string | null
          slug: string
          sort_order: number
          source_references: Json
          summary: string
          synonyms: string[]
          tags: string[]
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          at_a_glance?: string
          blend_notice?: boolean
          cas_number?: string | null
          category?: string
          claim_checks?: Json
          content?: Json
          created_at?: string
          evidence_status?: string
          id?: string
          molecular_formula?: string | null
          pubchem_cid?: string | null
          published?: boolean
          published_at?: string | null
          research_findings?: Json
          sequence?: string | null
          slug: string
          sort_order?: number
          source_references?: Json
          summary?: string
          synonyms?: string[]
          tags?: string[]
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          at_a_glance?: string
          blend_notice?: boolean
          cas_number?: string | null
          category?: string
          claim_checks?: Json
          content?: Json
          created_at?: string
          evidence_status?: string
          id?: string
          molecular_formula?: string | null
          pubchem_cid?: string | null
          published?: boolean
          published_at?: string | null
          research_findings?: Json
          sequence?: string | null
          slug?: string
          sort_order?: number
          source_references?: Json
          summary?: string
          synonyms?: string[]
          tags?: string[]
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      review_photo_uploads: {
        Row: {
          byte_size: number
          cleanup_claimed: boolean
          created_at: string
          id: string
          mime_type: string
          ready: boolean
          review_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          byte_size: number
          cleanup_claimed?: boolean
          created_at?: string
          id?: string
          mime_type: string
          ready?: boolean
          review_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          byte_size?: number
          cleanup_claimed?: boolean
          created_at?: string
          id?: string
          mime_type?: string
          ready?: boolean
          review_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photo_uploads_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "customer_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          body: string
          key: string
          updated_at: string
        }
        Insert: {
          body?: string
          key: string
          updated_at?: string
        }
        Update: {
          body?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_links: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      stock_settlement_exceptions: {
        Row: {
          created_at: string
          detail: Json
          id: string
          order_id: string
          reason: string
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          order_id: string
          reason: string
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          order_id?: string
          reason?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_settlement_exceptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credit_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          kind: string
          order_id: string | null
          reason: string | null
          unit_cents: number
          units: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind: string
          order_id?: string | null
          reason?: string | null
          unit_cents: number
          units: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          order_id?: string | null
          reason?: string | null
          unit_cents?: number
          units?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credit_reservations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          payment_attempt_id: string | null
          status: string
          units: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          status?: string
          units: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          status?: string
          units?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_credit_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_reservations_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      titan_club_events: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      titan_club_members: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          benefit_type: string
          fixed_cents: number | null
          free_shipping: boolean
          max_cap_percent: number
          percent: number | null
          revoked_at: string | null
          stack_code: boolean
          stack_credit: boolean
          stack_crypto: boolean
          stack_first_offer: boolean
          stack_foundation: boolean
          stack_multibuy: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          benefit_type: string
          fixed_cents?: number | null
          free_shipping?: boolean
          max_cap_percent?: number
          percent?: number | null
          revoked_at?: string | null
          stack_code?: boolean
          stack_credit?: boolean
          stack_crypto?: boolean
          stack_first_offer?: boolean
          stack_foundation?: boolean
          stack_multibuy?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          benefit_type?: string
          fixed_cents?: number | null
          free_shipping?: boolean
          max_cap_percent?: number
          percent?: number | null
          revoked_at?: string | null
          stack_code?: boolean
          stack_credit?: boolean
          stack_crypto?: boolean
          stack_first_offer?: boolean
          stack_foundation?: boolean
          stack_multibuy?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      titan_club_notes: {
        Row: {
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "titan_club_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "titan_club_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      titan_club_settings: {
        Row: {
          enabled: boolean
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      titan_club_welcome_email_queue: {
        Row: {
          attempts: number
          claimed_until: string | null
          completed_at: string | null
          created_at: string
          last_error: string | null
          next_attempt_at: string
          outcome: string | null
          snapshot: Json
          user_id: string
          welcome_event_id: string
        }
        Insert: {
          attempts?: number
          claimed_until?: string | null
          completed_at?: string | null
          created_at?: string
          last_error?: string | null
          next_attempt_at?: string
          outcome?: string | null
          snapshot: Json
          user_id: string
          welcome_event_id?: string
        }
        Update: {
          attempts?: number
          claimed_until?: string | null
          completed_at?: string | null
          created_at?: string
          last_error?: string | null
          next_attempt_at?: string
          outcome?: string | null
          snapshot?: Json
          user_id?: string
          welcome_event_id?: string
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
      welcome_email_settings: {
        Row: {
          activated_at: string | null
          enabled: boolean
          id: number
          template_version: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activated_at?: string | null
          enabled?: boolean
          id?: number
          template_version?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activated_at?: string | null
          enabled?: boolean
          id?: number
          template_version?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory: {
        Args: {
          _expected_before: number
          _kind: string
          _product_id: string
          _quantity: number
          _reason: string
          _reference: string
          _variant_id: string
        }
        Returns: Json
      }
      admin_set_foundation_member: {
        Args: { _enable: boolean; _user_id: string }
        Returns: Json
      }
      admin_set_titan_club: {
        Args: {
          _active: boolean
          _benefit_type: string
          _fixed_cents: number
          _max_cap: number
          _note: string
          _percent: number
          _user_id: string
        }
        Returns: Json
      }
      admin_set_titan_club_enabled: {
        Args: { _enabled: boolean }
        Returns: Json
      }
      admin_set_titan_club_v2: {
        Args: {
          _active: boolean
          _benefit_type: string
          _fixed_cents: number
          _max_cap: number
          _note: string
          _percent: number
          _stack_code: boolean
          _stack_credit: boolean
          _stack_crypto: boolean
          _stack_first_offer: boolean
          _stack_foundation: boolean
          _stack_multibuy: boolean
          _user_id: string
        }
        Returns: Json
      }
      admin_set_titan_club_v3: {
        Args: {
          _active: boolean
          _benefit_type: string
          _fixed_cents: number
          _free_shipping: boolean
          _max_cap: number
          _note: string
          _percent: number
          _stack_code: boolean
          _stack_credit: boolean
          _stack_crypto: boolean
          _stack_first_offer: boolean
          _stack_foundation: boolean
          _stack_multibuy: boolean
          _user_id: string
        }
        Returns: Json
      }
      allocate_welcome_referral_code: {
        Args: { _user_id: string }
        Returns: string
      }
      attach_first_offer_claim: {
        Args: { _claim_id: string; _payment_attempt_id: string }
        Returns: undefined
      }
      attach_referral_redemption_claim: {
        Args: { _claim_id: string; _payment_attempt_id: string }
        Returns: undefined
      }
      attach_store_credit_reservation: {
        Args: { _payment_attempt_id: string; _reservation_id: string }
        Returns: undefined
      }
      claim_first_offer: {
        Args: { _emails: string[]; _ttl_minutes: number; _user_id: string }
        Returns: string
      }
      claim_member_welcome_emails: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          claimed_until: string | null
          completed_at: string | null
          created_at: string
          last_error: string | null
          next_attempt_at: string
          outcome: string | null
          template_version: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "member_welcome_email_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_referral_redemption: {
        Args: {
          _code_id: string
          _emails: string[]
          _except_order_id?: string
          _ttl_minutes: number
          _user_id: string
        }
        Returns: string
      }
      claim_review_photo_cleanup: {
        Args: { _ids: string[]; _user_id: string }
        Returns: string[]
      }
      claim_titan_club_welcome_email_for: {
        Args: { _user_id: string }
        Returns: {
          attempts: number
          claimed_until: string | null
          completed_at: string | null
          created_at: string
          last_error: string | null
          next_attempt_at: string
          outcome: string | null
          snapshot: Json
          user_id: string
          welcome_event_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "titan_club_welcome_email_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_titan_club_welcome_emails: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          claimed_until: string | null
          completed_at: string | null
          created_at: string
          last_error: string | null
          next_attempt_at: string
          outcome: string | null
          snapshot: Json
          user_id: string
          welcome_event_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "titan_club_welcome_email_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ensure_referral_redemption: {
        Args: { _order_id: string }
        Returns: boolean
      }
      finalize_checkout_order: {
        Args: {
          _attempt_id: string
          _contact_email: string
          _contact_name: string
          _contact_phone: string
          _items: Json
          _notes: string
          _payment_intent_id: string
          _profile: Json
          _shipping: number
          _shipping_address: string
          _subtotal: number
          _total: number
        }
        Returns: Json
      }
      finalize_stripe_order: {
        Args: {
          _attempt_id: string
          _contact_email: string
          _contact_name: string
          _contact_phone: string
          _items: Json
          _notes: string
          _payment_intent_id: string
          _profile_address_line: string
          _profile_city: string
          _profile_first_name: string
          _profile_last_name: string
          _profile_phone: string
          _profile_postcode: string
          _profile_state: string
          _shipping: number
          _shipping_address: string
          _subtotal: number
          _total: number
          _user_id: string
        }
        Returns: Json
      }
      first_offer_eligible: {
        Args: { _emails: string[]; _user_id: string }
        Returns: boolean
      }
      foundation_next_number: { Args: { _cap: number }; Returns: number }
      foundation_programme_status: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_order_acknowledgement: {
        Args: { _ack_id: string; _order_id: string }
        Returns: boolean
      }
      lock_referral_code_buyer: {
        Args: { _code_id: string; _emails: string[]; _user_id: string }
        Returns: undefined
      }
      normalize_emails: { Args: { _emails: string[] }; Returns: string[] }
      record_restock_expense: {
        Args: {
          _amount: number
          _category: string
          _description: string
          _occurred_on: string
          _product_slug: string
          _quantity: number
          _supplier: string
          _variant_label: string
        }
        Returns: Json
      }
      record_stock_purchase: {
        Args: {
          _apply_stock: boolean
          _description: string
          _discount_cents: number
          _items: Json
          _occurred_on: string
          _other_costs_cents: number
          _request_id: string
          _supplier: string
        }
        Returns: Json
      }
      referral_paid_order_count: { Args: { _user_id: string }; Returns: number }
      referral_redemption_eligible:
        | {
            Args: {
              _code_id: string
              _emails: string[]
              _except_order_id: string
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _emails: string[]
              _except_order_id?: string
              _user_id: string
            }
            Returns: boolean
          }
      release_first_offer: { Args: { _claim_id: string }; Returns: boolean }
      release_first_offer_for_attempt: {
        Args: { _payment_attempt_id: string }
        Returns: number
      }
      release_referral_redemption: {
        Args: { _claim_id: string }
        Returns: boolean
      }
      release_referral_redemption_for_attempt: {
        Args: { _payment_attempt_id: string }
        Returns: number
      }
      release_store_credit: {
        Args: { _reservation_id: string }
        Returns: boolean
      }
      release_store_credit_for_attempt: {
        Args: { _payment_attempt_id: string }
        Returns: number
      }
      reserve_store_credit: {
        Args: {
          _payment_attempt_id: string
          _ttl_minutes: number
          _units: number
          _user_id: string
        }
        Returns: string
      }
      retry_stock_settlement: { Args: { _order_id: string }; Returns: Json }
      settle_order_stock: { Args: { _order_id: string }; Returns: Json }
      store_credit_available_units: {
        Args: { _user_id: string }
        Returns: number
      }
      store_credit_lots: {
        Args: { _user_id: string }
        Returns: {
          expires_at: string
          units: number
        }[]
      }
      store_credit_summary: { Args: { _user_id: string }; Returns: Json }
      submit_member_photo_review: {
        Args: { _photo_ids: string[]; _review: Json; _user_id: string }
        Returns: string
      }
      titan_club_my_benefit: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      discount_type: "percent" | "fixed"
      order_status:
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "pending_payment"
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
      app_role: ["admin", "user"],
      discount_type: ["percent", "fixed"],
      order_status: [
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "pending_payment",
      ],
    },
  },
} as const
