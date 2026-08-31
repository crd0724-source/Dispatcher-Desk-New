export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'owner_admin' | 'dispatcher' | 'staff';
export type ClientType = 'owner_operator' | 'fleet';
export type CreditStatus = 'approved' | 'caution' | 'blocked' | 'factoring_only';
export type EquipmentType = 'dry_van' | 'reefer' | 'flatbed' | 'step_deck' | 'power_only' | 'box_truck' | 'hotshot';
export type TruckStatus = 'active' | 'maintenance' | 'inactive';
export type DriverStatus = 'available' | 'on_load' | 'off_duty';
export type DriverPayType = 'percentage_gross' | 'per_mile' | 'flat_rate';
export type PipelineStatus = 'sourced' | 'negotiating' | 'booked' | 'in_transit' | 'delivered' | 'invoiced' | 'paid';
export type DocumentType = 'rate_confirmation' | 'bol' | 'pod' | 'invoice' | 'other';
export type DocumentStatus = 'missing' | 'pending' | 'received' | 'verified';
export type NoteType =
  | 'broker_call'
  | 'driver_check'
  | 'handover'
  | 'general'
  | 'rate_negotiation'
  | 'assignment_change'
  | 'status_change';

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          dot_number: string | null;
          mc_number: string | null;
          primary_timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          dot_number?: string | null;
          mc_number?: string | null;
          primary_timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          dot_number?: string | null;
          mc_number?: string | null;
          primary_timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          preferred_timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          preferred_timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          preferred_timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          client_type: ClientType;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          billing_email: string | null;
          preferred_equipment: string | null;
          preferred_lanes: string | null;
          minimum_rate_per_mile: number | null;
          notes: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          client_type: ClientType;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          billing_email?: string | null;
          preferred_equipment?: string | null;
          preferred_lanes?: string | null;
          minimum_rate_per_mile?: number | null;
          notes?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_name?: string;
          client_type?: ClientType;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          billing_email?: string | null;
          preferred_equipment?: string | null;
          preferred_lanes?: string | null;
          minimum_rate_per_mile?: number | null;
          notes?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brokers: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          mc_number: string | null;
          dot_number: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          payment_terms_days: number;
          credit_status: CreditStatus;
          notes: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          mc_number?: string | null;
          dot_number?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          payment_terms_days?: number;
          credit_status?: CreditStatus;
          notes?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_name?: string;
          mc_number?: string | null;
          dot_number?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          payment_terms_days?: number;
          credit_status?: CreditStatus;
          notes?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trucks: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          truck_number: string;
          vin: string | null;
          equipment_type: EquipmentType;
          max_weight_lbs: number | null;
          status: TruckStatus;
          current_location_city: string | null;
          current_location_state: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id?: string | null;
          truck_number: string;
          vin?: string | null;
          equipment_type?: EquipmentType;
          max_weight_lbs?: number | null;
          status?: TruckStatus;
          current_location_city?: string | null;
          current_location_state?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string | null;
          truck_number?: string;
          vin?: string | null;
          equipment_type?: EquipmentType;
          max_weight_lbs?: number | null;
          status?: TruckStatus;
          current_location_city?: string | null;
          current_location_state?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trucks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trucks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      drivers: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string | null;
          assigned_truck_id: string | null;
          full_name: string;
          phone: string | null;
          email: string | null;
          pay_type: DriverPayType;
          pay_rate: number;
          status: DriverStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id?: string | null;
          assigned_truck_id?: string | null;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          pay_type?: DriverPayType;
          pay_rate?: number;
          status?: DriverStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string | null;
          assigned_truck_id?: string | null;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          pay_type?: DriverPayType;
          pay_rate?: number;
          status?: DriverStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      loads: {
        Row: {
          id: string;
          organization_id: string;
          load_number: string;
          client_id: string | null;
          broker_id: string | null;
          truck_id: string | null;
          driver_id: string | null;
          assigned_dispatcher_id: string | null;
          pipeline_status: PipelineStatus;
          equipment_type: EquipmentType;
          commodity: string | null;
          weight_lbs: number | null;
          origin_city: string;
          origin_state: string;
          origin_zip: string | null;
          pickup_datetime: string | null;
          dest_city: string;
          dest_state: string;
          dest_zip: string | null;
          delivery_datetime: string | null;
          rate: number;
          loaded_miles: number;
          deadhead_miles: number;
          fuel_expense: number;
          driver_pay: number;
          other_expenses: number;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          load_number: string;
          client_id?: string | null;
          broker_id?: string | null;
          truck_id?: string | null;
          driver_id?: string | null;
          assigned_dispatcher_id?: string | null;
          pipeline_status?: PipelineStatus;
          equipment_type?: EquipmentType;
          commodity?: string | null;
          weight_lbs?: number | null;
          origin_city: string;
          origin_state: string;
          origin_zip?: string | null;
          pickup_datetime?: string | null;
          dest_city: string;
          dest_state: string;
          dest_zip?: string | null;
          delivery_datetime?: string | null;
          rate?: number;
          loaded_miles?: number;
          deadhead_miles?: number;
          fuel_expense?: number;
          driver_pay?: number;
          other_expenses?: number;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          load_number?: string;
          client_id?: string | null;
          broker_id?: string | null;
          truck_id?: string | null;
          driver_id?: string | null;
          assigned_dispatcher_id?: string | null;
          pipeline_status?: PipelineStatus;
          equipment_type?: EquipmentType;
          commodity?: string | null;
          weight_lbs?: number | null;
          origin_city?: string;
          origin_state?: string;
          origin_zip?: string | null;
          pickup_datetime?: string | null;
          dest_city?: string;
          dest_state?: string;
          dest_zip?: string | null;
          delivery_datetime?: string | null;
          rate?: number;
          loaded_miles?: number;
          deadhead_miles?: number;
          fuel_expense?: number;
          driver_pay?: number;
          other_expenses?: number;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          load_id: string | null;
          doc_type: DocumentType;
          doc_status: DocumentStatus;
          file_path: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          load_id?: string | null;
          doc_type: DocumentType;
          doc_status?: DocumentStatus;
          file_path?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          load_id?: string | null;
          doc_type?: DocumentType;
          doc_status?: DocumentStatus;
          file_path?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          uploaded_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_notes: {
        Row: {
          id: string;
          organization_id: string;
          load_id: string | null;
          truck_id: string | null;
          author_id: string | null;
          note_type: NoteType;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          load_id?: string | null;
          truck_id?: string | null;
          author_id?: string | null;
          note_type?: NoteType;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          load_id?: string | null;
          truck_id?: string | null;
          author_id?: string | null;
          note_type?: NoteType;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: UserRole;
          invited_by_user_id: string | null;
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role: UserRole;
          invited_by_user_id?: string | null;
          token_hash: string;
          expires_at: string;
          accepted_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: UserRole;
          invited_by_user_id?: string | null;
          token_hash?: string;
          expires_at?: string;
          accepted_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_organizations: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      is_org_owner_admin: {
        Args: {
          org_id: string;
        };
        Returns: boolean;
      };
      create_organization_with_admin: {
        Args: {
          org_name: string;
          org_slug?: string | null;
          primary_tz?: string | null;
        };
        Returns: string;
      };
      create_team_invitation: {
        Args: {
          p_organization_id: string;
          p_email: string;
          p_role: string;
          p_token_hash: string;
          p_expires_at?: string | null;
        };
        Returns: Json;
      };
      cancel_team_invitation: {
        Args: {
          p_invitation_id: string;
        };
        Returns: Json;
      };
      get_invitation_details: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
      accept_team_invitation: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
      update_team_member_role: {
        Args: {
          p_organization_id: string;
          p_member_id: string;
          p_new_role: string;
        };
        Returns: Json;
      };
      remove_team_member: {
        Args: {
          p_organization_id: string;
          p_member_id: string;
        };
        Returns: Json;
      };
      transition_load_status: {
        Args: {
          p_organization_id: string;
          p_load_id: string;
          p_target_status: string;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      assign_load_dispatch: {
        Args: {
          p_organization_id: string;
          p_load_id: string;
          p_truck_id?: string | null;
          p_driver_id?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      client_type: ClientType;
      credit_status: CreditStatus;
      equipment_type: EquipmentType;
      truck_status: TruckStatus;
      driver_status: DriverStatus;
      driver_pay_type: DriverPayType;
      pipeline_status: PipelineStatus;
      document_type: DocumentType;
      document_status: DocumentStatus;
      note_type: NoteType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
