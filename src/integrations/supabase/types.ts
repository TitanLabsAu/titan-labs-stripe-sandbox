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
      customer_reviews: {
        Row: {
          created_at: string
          id: string
          location: string | null
          published: boolean
          rating: number | null
          review_text: string
          reviewer_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          published?: boolean
          rating?: number | null
          review_text: string
          reviewer_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          published?: boolean
          rating?: number | null
          review_text?: string
          reviewer_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          occurred_on: string
          product_slug: string | null
          quantity: number | null
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
          id?: string
          occurred_on?: string
          product_slug?: string | null
          quantity?: number | null
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
          id?: string
          occurred_on?: string
          product_slug?: string | null
          quantity?: number | null
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
      member_calendar_entries: {
        Row: {
          created_at: string
          dose_label: string
          end_date: string | null
          frequency: string
          id: string
          notes: string
          product_name: string
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
          start_date?: string
          time_of_day?: string | null
          updated_at?: string
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
      orders: {
        Row: {
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
          referrer_user_id: string | null
          refunded_at: string | null
          shipping: number
          shipping_address: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_checked_at: string | null
          tracking_number: string | null
          tracking_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
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
          referrer_user_id?: string | null
          refunded_at?: string | null
          shipping?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_checked_at?: string | null
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
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
          referrer_user_id?: string | null
          refunded_at?: string | null
          shipping?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
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
          status: string
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
          status?: string
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
          status?: string
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
      store_credit_ledger: {
        Row: {
          created_at: string
          created_by: string | null
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
      attach_first_offer_claim: {
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
      normalize_emails: { Args: { _emails: string[] }; Returns: string[] }
      referral_paid_order_count: { Args: { _user_id: string }; Returns: number }
      release_first_offer: { Args: { _claim_id: string }; Returns: boolean }
      release_first_offer_for_attempt: {
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
      store_credit_available_units: {
        Args: { _user_id: string }
        Returns: number
      }
      store_credit_summary: { Args: { _user_id: string }; Returns: Json }
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
