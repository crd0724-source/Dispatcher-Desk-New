import { EquipmentType } from '../../types/domain.types.ts';

export interface ExtractedBrokerInfo {
  company_name: string;
  mc_number?: string | null;
  dot_number?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  payment_terms_days?: number | null;
  raw_text?: string | null;
}

export interface ExtractedLoadInfo {
  load_number: string;
  rate: number;
  equipment_type?: EquipmentType | string | null;
  commodity?: string | null;
  weight_lbs?: number | null;
  special_instructions?: string | null;
  raw_text?: string | null;
}

export interface ExtractedLocationInfo {
  facility_name?: string | null;
  address?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  pickup_datetime?: string | null;
  delivery_datetime?: string | null;
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  raw_text?: string | null;
}

export interface ExtractedAccessorial {
  type: string;
  amount?: number | null;
  notes?: string | null;
}

export interface ExtractionConfidenceScores {
  overall: number; // 0 - 100
  broker?: number;
  load_number?: number;
  rate?: number;
  origin?: number;
  destination?: number;
  equipment_type?: number;
  commodity?: number;
  dates?: number;
}

export interface RateConfirmationExtraction {
  broker: ExtractedBrokerInfo;
  load_info: ExtractedLoadInfo;
  origin: ExtractedLocationInfo;
  destination: ExtractedLocationInfo;
  accessorials?: ExtractedAccessorial[];
  confidence_scores: ExtractionConfidenceScores;
  warnings?: string[];
  provenance?: {
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    extractedAt: string;
    model: string;
    sourceType: 'uploaded_pdf' | 'uploaded_image' | 'sample_document' | 'pasted_text';
  };
}

export interface ExtractionResponse {
  success: boolean;
  extractedData: RateConfirmationExtraction;
  source: string;
  extractedAt: string;
  notice?: string;
  error?: string;
}

export interface ApplyExtractionToLoadInput {
  targetLoadId?: string; // If updating existing load
  createNewLoad?: boolean; // If creating new load
  organizationId: string;
  clientId: string;
  brokerId?: string | null;
  truckId?: string | null;
  driverId?: string | null;
  extractedData: RateConfirmationExtraction;
  overriddenFields: {
    load_number?: string;
    rate?: number;
    origin_city?: string;
    origin_state?: string;
    origin_zip?: string;
    pickup_datetime?: string;
    dest_city?: string;
    dest_state?: string;
    dest_zip?: string;
    delivery_datetime?: string;
    equipment_type?: EquipmentType;
    commodity?: string;
    weight_lbs?: number;
    loaded_miles?: number;
    deadhead_miles?: number;
    special_instructions?: string;
  };
  attachDocument?: {
    file_name: string;
    file_size_bytes?: number;
    mime_type?: string;
  };
}
