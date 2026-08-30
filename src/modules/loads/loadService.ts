import { Load, Client, Broker, Truck, Driver, PipelineStatus, EquipmentType } from '../../types/domain.types.ts';
import { LoadWithRelations, CreateLoadInput, UpdateLoadInput, LoadFilterCriteria, isValidUsState } from './loadTypes.ts';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.ts';
import { clientService } from '../clients/clientService.ts';
import { brokerService } from '../brokers/brokerService.ts';
import { truckService } from '../trucks/truckService.ts';
import { driverService } from '../drivers/driverService.ts';
import { activityService } from '../activity/activityService.ts';

// Storage keys
const LOADS_STORAGE_PREFIX = 'dispatchdesk_demo_loads_';
const CLIENTS_STORAGE_PREFIX = 'dispatchdesk_demo_clients_';
const TRUCKS_STORAGE_PREFIX = 'dispatchdesk_demo_trucks_';
const DRIVERS_STORAGE_PREFIX = 'dispatchdesk_demo_drivers_';
const BROKERS_STORAGE_PREFIX = 'dispatchdesk_demo_brokers_';

// Seed Brokers for demo organization (strictly fictional mock entities)
const SEED_BROKERS: Omit<Broker, 'organization_id'>[] = [
  {
    id: 'demo-broker-1',
    company_name: 'Apex Freight Logistics [Demo]',
    mc_number: '084729',
    dot_number: '221458',
    contact_name: 'Sarah Jenkins (Midwest Fleet)',
    contact_phone: '(800) 555-0142',
    contact_email: 'dispatch@apex-demo-freight.test',
    payment_terms_days: 30,
    credit_status: 'approved',
    status: 'active',
    notes: 'Demo carrier tier 1, quick pay approved at 1.5% fee or 30 days standard net.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'demo-broker-2',
    company_name: 'Blue Ridge Freight Brokerage [Demo]',
    mc_number: '347592',
    dot_number: '556102',
    contact_name: 'Brandon Cole (Team 204)',
    contact_phone: '(800) 555-0188',
    contact_email: 'ops@blueridge-demo.test',
    payment_terms_days: 30,
    credit_status: 'approved',
    status: 'active',
    notes: 'High volume flatbed and reefer spot freight demo. Requires check call every 4 hours.',
    created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'demo-broker-3',
    company_name: 'Horizon Express Logistics [Demo]',
    mc_number: '561230',
    dot_number: '774109',
    contact_name: 'Amanda Cross',
    contact_phone: '(877) 555-0193',
    contact_email: 'loads@horizon-demo.test',
    payment_terms_days: 21,
    credit_status: 'approved',
    status: 'active',
    notes: 'Automated tracking required via MacroPoint / ELD link. Fast payment turnaround.',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'demo-broker-4',
    company_name: 'Keystone Freight Partners [Demo]',
    mc_number: '143211',
    dot_number: '339812',
    contact_name: 'David Morrison (Agency JAX)',
    contact_phone: '(800) 555-0165',
    contact_email: 'agents@keystone-demo.test',
    payment_terms_days: 30,
    credit_status: 'approved',
    status: 'active',
    notes: 'Pre-vetted heavy haul and reefer broker agent. Strict on on-time delivery.',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-broker-5',
    company_name: 'Prairie Star Logistics [Demo]',
    mc_number: '445892',
    dot_number: '662301',
    contact_name: 'Rachel Sterling',
    contact_phone: '(800) 555-0177',
    contact_email: 'carrier-settlements@prairiestar-demo.test',
    payment_terms_days: 15,
    credit_status: 'factoring_only',
    status: 'active',
    notes: 'Requires factoring verification and assignment before booking high-value freight.',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

// Seed initial loads
const SEED_LOADS: Omit<Load, 'organization_id'>[] = [
  {
    id: 'demo-load-1',
    load_number: 'LD-2024-8841',
    client_id: 'demo-client-1',
    broker_id: 'demo-broker-1',
    truck_id: 'demo-truck-101',
    driver_id: 'demo-driver-1',
    assigned_dispatcher_id: null,
    pipeline_status: 'booked',
    equipment_type: 'dry_van',
    commodity: 'Packaged Consumer Electronics',
    weight_lbs: 38500,
    origin_city: 'Dallas',
    origin_state: 'TX',
    origin_zip: '75207',
    pickup_datetime: new Date(Date.now() + 18 * 3600000).toISOString(),
    dest_city: 'Atlanta',
    dest_state: 'GA',
    dest_zip: '30301',
    delivery_datetime: new Date(Date.now() + 48 * 3600000).toISOString(),
    rate: 2450.00,
    loaded_miles: 780,
    deadhead_miles: 45,
    fuel_expense: 485.00,
    driver_pay: 661.50, // 27% of $2,450 gross
    other_expenses: 75.00,
    special_instructions: 'Driver must check in at Gate 4 with Broker PO #CH-88219. High-value freight; lock trailer with security seal #89921.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-load-2',
    load_number: 'LD-2024-8842',
    client_id: 'demo-client-1',
    broker_id: 'demo-broker-3',
    truck_id: 'demo-truck-102',
    driver_id: 'demo-driver-2',
    assigned_dispatcher_id: null,
    pipeline_status: 'in_transit',
    equipment_type: 'reefer',
    commodity: 'Chilled Dairy & Specialty Yogurt (36°F Continuous)',
    weight_lbs: 41200,
    origin_city: 'Memphis',
    origin_state: 'TN',
    origin_zip: '38103',
    pickup_datetime: new Date(Date.now() - 12 * 3600000).toISOString(),
    dest_city: 'Charlotte',
    dest_state: 'NC',
    dest_zip: '28202',
    delivery_datetime: new Date(Date.now() + 14 * 3600000).toISOString(),
    rate: 2850.00,
    loaded_miles: 630,
    deadhead_miles: 20,
    fuel_expense: 410.00,
    driver_pay: 442.00, // $0.68/mi * 650 total miles
    other_expenses: 100.00,
    special_instructions: 'Maintain Reefer set point at 36°F Continuous mode. Download temperature log at destination receiver dock.',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'demo-load-3',
    load_number: 'LD-2024-8843',
    client_id: 'demo-client-2',
    broker_id: 'demo-broker-2',
    truck_id: 'demo-truck-201',
    driver_id: 'demo-driver-3',
    assigned_dispatcher_id: null,
    pipeline_status: 'sourced',
    equipment_type: 'flatbed',
    commodity: 'Fabricated Structural Steel Beams',
    weight_lbs: 46000,
    origin_city: 'Chicago',
    origin_state: 'IL',
    origin_zip: '60611',
    pickup_datetime: new Date(Date.now() + 36 * 3600000).toISOString(),
    dest_city: 'Dallas',
    dest_state: 'TX',
    dest_zip: '75207',
    delivery_datetime: new Date(Date.now() + 84 * 3600000).toISOString(),
    rate: 3200.00,
    loaded_miles: 925,
    deadhead_miles: 60,
    fuel_expense: 615.00,
    driver_pay: 960.00, // 30% of $3,200 gross
    other_expenses: 50.00,
    special_instructions: 'Full 8ft tarps and minimum 8 grade-70 transport chains required. Hard hat & steel-toe boots mandatory at steel mill.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'demo-load-4',
    load_number: 'LD-2024-8844',
    client_id: 'demo-client-3',
    broker_id: 'demo-broker-4',
    truck_id: 'demo-truck-301',
    driver_id: 'demo-driver-4',
    assigned_dispatcher_id: null,
    pipeline_status: 'delivered',
    equipment_type: 'reefer',
    commodity: 'Fresh California Strawberries & Citrus (34°F)',
    weight_lbs: 42800,
    origin_city: 'Houston',
    origin_state: 'TX',
    origin_zip: '77002',
    pickup_datetime: new Date(Date.now() - 72 * 3600000).toISOString(),
    dest_city: 'Phoenix',
    dest_state: 'AZ',
    dest_zip: '85001',
    delivery_datetime: new Date(Date.now() - 10 * 3600000).toISOString(),
    rate: 3750.00,
    loaded_miles: 1175,
    deadhead_miles: 80,
    fuel_expense: 790.00,
    driver_pay: 1450.00, // Flat rate
    other_expenses: 120.00,
    special_instructions: 'Signed POD received with no OS&D claims. Lumper fee receipt approved by broker David Morrison.',
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'demo-load-5',
    load_number: 'LD-2024-8845',
    client_id: 'demo-client-1',
    broker_id: 'demo-broker-5',
    truck_id: 'demo-truck-101',
    driver_id: 'demo-driver-1',
    assigned_dispatcher_id: null,
    pipeline_status: 'paid',
    equipment_type: 'dry_van',
    commodity: 'Automotive Component Racks',
    weight_lbs: 32000,
    origin_city: 'Atlanta',
    origin_state: 'GA',
    origin_zip: '30301',
    pickup_datetime: new Date(Date.now() - 120 * 3600000).toISOString(),
    dest_city: 'Jacksonville',
    dest_state: 'FL',
    dest_zip: '32202',
    delivery_datetime: new Date(Date.now() - 96 * 3600000).toISOString(),
    rate: 1650.00,
    loaded_miles: 350,
    deadhead_miles: 30,
    fuel_expense: 230.00,
    driver_pay: 445.50,
    other_expenses: 30.00,
    special_instructions: 'Quick turnaround auto assembly delivery. Remittance paid direct via ACH.',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

// Helper functions for local storage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error loading storage for key ${key}:`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving storage for key ${key}:`, err);
  }
}

/**
 * Load Service Interface
 * Defines clean repository contracts for Load Management.
 * Compatible with public.loads schema for future Supabase RLS integration.
 */
export interface ILoadService {
  getLoads(organizationId: string, filters?: LoadFilterCriteria): Promise<LoadWithRelations[]>;
  getLoad(organizationId: string, id: string): Promise<LoadWithRelations | null>;
  getLoadById(organizationId: string, id: string): Promise<LoadWithRelations | null>;
  createLoad(organizationId: string, input: CreateLoadInput): Promise<LoadWithRelations>;
  updateLoad(organizationId: string, id: string, input: UpdateLoadInput): Promise<LoadWithRelations>;
  deleteLoad(organizationId: string, id: string): Promise<void>;
  updateLoadStatus(organizationId: string, id: string, status: PipelineStatus): Promise<LoadWithRelations>;
  getClients(organizationId: string): Promise<Client[]>;
  getBrokers(organizationId: string): Promise<Broker[]>;
  getTrucks(organizationId: string, clientId?: string): Promise<Truck[]>;
  getDrivers(organizationId: string, clientId?: string): Promise<Driver[]>;
  getDependencies(organizationId: string): Promise<[Truck[], Driver[], Client[], Broker[]]>;
  generateNextLoadNumber(organizationId: string): Promise<string>;
}

/**
 * Local / Demo Implementation of ILoadService
 * Persists per-organization in localStorage with full relational joins.
 * Guarantees operational hierarchy:
 * Organization -> Client -> Truck -> Driver -> Load & Broker -> Load
 */
class LocalLoadService implements ILoadService {
  private ensureInitialized(organizationId: string): {
    loads: Load[];
    clients: Client[];
    brokers: Broker[];
    trucks: Truck[];
    drivers: Driver[];
  } {
    const loadsKey = `${LOADS_STORAGE_PREFIX}${organizationId}`;
    const clientsKey = `${CLIENTS_STORAGE_PREFIX}${organizationId}`;
    const brokersKey = `${BROKERS_STORAGE_PREFIX}${organizationId}`;
    const trucksKey = `${TRUCKS_STORAGE_PREFIX}${organizationId}`;
    const driversKey = `${DRIVERS_STORAGE_PREFIX}${organizationId}`;

    const clients = loadFromStorage<Client[]>(clientsKey, []);
    const trucks = loadFromStorage<Truck[]>(trucksKey, []);
    const drivers = loadFromStorage<Driver[]>(driversKey, []);

    let brokers = loadFromStorage<Broker[]>(brokersKey, []);
    if (brokers.length === 0) {
      brokers = SEED_BROKERS.map((b) => ({
        ...b,
        organization_id: organizationId,
      }));
      saveToStorage(brokersKey, brokers);
    }

    let loads = loadFromStorage<Load[]>(loadsKey, []);
    if (loads.length === 0) {
      loads = SEED_LOADS.map((l) => ({
        ...l,
        organization_id: organizationId,
      }));
      saveToStorage(loadsKey, loads);
    }

    return { loads, clients, brokers, trucks, drivers };
  }

  private joinRelations(
    load: Load,
    clients: Client[],
    brokers: Broker[],
    trucks: Truck[],
    drivers: Driver[]
  ): LoadWithRelations {
    const client = load.client_id
      ? clients.find((c) => c.id === load.client_id && (!c.organization_id || c.organization_id === load.organization_id)) || null
      : null;

    const broker = load.broker_id
      ? brokers.find((b) => b.id === load.broker_id && (!b.organization_id || b.organization_id === load.organization_id)) || null
      : null;

    const truck = load.truck_id
      ? trucks.find((t) => t.id === load.truck_id && (!t.organization_id || t.organization_id === load.organization_id)) || null
      : null;

    const driver = load.driver_id
      ? drivers.find((d) => d.id === load.driver_id && (!d.organization_id || d.organization_id === load.organization_id)) || null
      : null;

    return {
      ...load,
      client: client
        ? {
            id: client.id,
            company_name: client.company_name,
            client_type: client.client_type,
            contact_name: client.contact_name,
            contact_phone: client.contact_phone,
            contact_email: client.contact_email,
          }
        : null,
      broker: broker
        ? {
            id: broker.id,
            company_name: broker.company_name,
            mc_number: broker.mc_number,
            dot_number: broker.dot_number,
            contact_name: broker.contact_name,
            contact_phone: broker.contact_phone,
            contact_email: broker.contact_email,
            credit_status: broker.credit_status,
            payment_terms_days: broker.payment_terms_days,
          }
        : null,
      truck: truck
        ? {
            id: truck.id,
            truck_number: truck.truck_number,
            equipment_type: truck.equipment_type,
            current_location_city: truck.current_location_city,
            current_location_state: truck.current_location_state,
            status: truck.status,
            vin: truck.vin,
          }
        : null,
      driver: driver
        ? {
            id: driver.id,
            full_name: driver.full_name,
            phone: driver.phone,
            email: driver.email,
            pay_type: driver.pay_type,
            pay_rate: driver.pay_rate,
            status: driver.status,
          }
        : null,
      dispatcher_profile: null,
    };
  }

  async getLoads(organizationId: string, filters?: LoadFilterCriteria): Promise<LoadWithRelations[]> {
    let rawLoads: Load[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('loads')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          rawLoads = data as Load[];
        }
      } catch (err) {
        console.warn('Supabase getLoads failed, falling back to local storage:', err);
      }
    }

    if (rawLoads.length === 0) {
      const { loads } = this.ensureInitialized(organizationId);
      rawLoads = loads;
    }

    const [trucks, drivers, clients, brokers] = await this.getDependencies(organizationId);
    let result = rawLoads.map((l) => this.joinRelations(l, clients, brokers, trucks, drivers));

    if (filters) {
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        result = result.filter((l) => {
          const loadNum = l.load_number.toLowerCase();
          const origin = `${l.origin_city}, ${l.origin_state}`.toLowerCase();
          const dest = `${l.dest_city}, ${l.dest_state}`.toLowerCase();
          const commodity = (l.commodity || '').toLowerCase();
          const clientName = (l.client?.company_name || '').toLowerCase();
          const brokerName = (l.broker?.company_name || '').toLowerCase();
          const truckNum = (l.truck?.truck_number || '').toLowerCase();
          const driverName = (l.driver?.full_name || '').toLowerCase();

          return (
            loadNum.includes(query) ||
            origin.includes(query) ||
            dest.includes(query) ||
            commodity.includes(query) ||
            clientName.includes(query) ||
            brokerName.includes(query) ||
            truckNum.includes(query) ||
            driverName.includes(query)
          );
        });
      }

      if (filters.clientId && filters.clientId !== 'all') {
        result = result.filter((l) => l.client_id === filters.clientId);
      }

      if (filters.brokerId && filters.brokerId !== 'all') {
        result = result.filter((l) => l.broker_id === filters.brokerId);
      }

      if (filters.equipmentType && filters.equipmentType !== 'all') {
        result = result.filter((l) => l.equipment_type === filters.equipmentType);
      }

      if (filters.status && filters.status !== 'all') {
        result = result.filter((l) => l.pipeline_status === filters.status);
      }

      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 86400000;

        if (filters.dateRange === 'today') {
          result = result.filter((l) => {
            if (!l.pickup_datetime) return false;
            const pTime = new Date(l.pickup_datetime).getTime();
            return pTime >= todayStart && pTime < todayEnd;
          });
        } else if (filters.dateRange === 'upcoming') {
          result = result.filter((l) => {
            if (!l.pickup_datetime) return true;
            return new Date(l.pickup_datetime).getTime() >= todayStart;
          });
        } else if (filters.dateRange === 'past') {
          result = result.filter((l) => {
            if (!l.delivery_datetime) return false;
            return new Date(l.delivery_datetime).getTime() < todayStart;
          });
        }
      }
    }

    // Sort newest first by created_at or pickup_datetime
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getLoad(organizationId: string, id: string): Promise<LoadWithRelations | null> {
    return this.getLoadById(organizationId, id);
  }

  async getLoadById(organizationId: string, id: string): Promise<LoadWithRelations | null> {
    let rawLoad: Load | null = null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('loads')
          .select('*')
          .eq('id', id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (!error && data) {
          rawLoad = data as Load;
        }
      } catch (err) {
        console.warn('Supabase getLoadById failed, falling back to local storage:', err);
      }
    }

    if (!rawLoad) {
      const { loads } = this.ensureInitialized(organizationId);
      rawLoad = loads.find((l) => l.id === id) || null;
    }

    if (!rawLoad) return null;

    const [trucks, drivers, clients, brokers] = await this.getDependencies(organizationId);
    return this.joinRelations(rawLoad, clients, brokers, trucks, drivers);
  }

  async createLoad(organizationId: string, input: CreateLoadInput): Promise<LoadWithRelations> {
    // 1. Mandatory Validations
    if (!input.load_number || !input.load_number.trim()) {
      throw new Error('Load number is required.');
    }
    if (!input.client_id) {
      throw new Error('Client assignment is required for creating a load.');
    }
    if (!input.origin_city || !input.origin_city.trim()) {
      throw new Error('Origin city is required.');
    }
    if (!input.origin_state || !isValidUsState(input.origin_state)) {
      throw new Error('Valid two-letter origin state code is required (e.g. TX, GA).');
    }
    if (!input.dest_city || !input.dest_city.trim()) {
      throw new Error('Destination city is required.');
    }
    if (!input.dest_state || !isValidUsState(input.dest_state)) {
      throw new Error('Valid two-letter destination state code is required (e.g. TX, GA).');
    }

    // Chronological validation
    if (input.pickup_datetime && input.delivery_datetime) {
      if (new Date(input.delivery_datetime).getTime() < new Date(input.pickup_datetime).getTime()) {
        throw new Error('Delivery date and time cannot be earlier than pickup date and time.');
      }
    }

    const [trucks, drivers, clients, brokers] = await this.getDependencies(organizationId);

    // 2. Validate Client / Truck / Driver consistency
    const client = clients.find((c) => c.id === input.client_id);
    if (!client) {
      throw new Error('Specified Client does not exist in this organization.');
    }

    let finalTruckId = input.truck_id || null;
    let finalDriverId = input.driver_id || null;

    if (finalTruckId) {
      const truck = trucks.find((t) => t.id === finalTruckId);
      if (!truck || truck.client_id !== input.client_id) {
        throw new Error('The selected Truck does not belong to the selected Client.');
      }
    }

    if (finalDriverId) {
      const driver = drivers.find((d) => d.id === finalDriverId);
      if (!driver || driver.client_id !== input.client_id) {
        throw new Error('The selected Driver does not belong to the selected Client.');
      }
    }

    if (input.broker_id) {
      const broker = brokers.find((b) => b.id === input.broker_id && (!b.organization_id || b.organization_id === organizationId));
      if (!broker) {
        throw new Error('Specified Broker does not exist in this organization.');
      }
    }

    if (isSupabaseConfigured) {
      try {
        // Check duplicate load number in same org
        const { data: existingLoad } = await supabase
          .from('loads')
          .select('id')
          .eq('organization_id', organizationId)
          .ilike('load_number', input.load_number.trim())
          .maybeSingle();

        if (existingLoad) {
          throw new Error(`Load number "${input.load_number.trim()}" already exists in this organization.`);
        }

        const { data, error } = await supabase
          .from('loads')
          .insert({
            organization_id: organizationId,
            load_number: input.load_number.trim().toUpperCase(),
            client_id: input.client_id,
            broker_id: input.broker_id || null,
            truck_id: finalTruckId,
            driver_id: finalDriverId,
            assigned_dispatcher_id: input.assigned_dispatcher_id || null,
            pipeline_status: input.pipeline_status || 'sourced',
            equipment_type: input.equipment_type || 'dry_van',
            commodity: input.commodity?.trim() || null,
            weight_lbs: input.weight_lbs !== undefined && input.weight_lbs !== null ? Math.max(0, Number(input.weight_lbs)) : null,
            origin_city: input.origin_city.trim(),
            origin_state: input.origin_state.trim().toUpperCase(),
            origin_zip: input.origin_zip?.trim() || null,
            pickup_datetime: input.pickup_datetime || null,
            dest_city: input.dest_city.trim(),
            dest_state: input.dest_state.trim().toUpperCase(),
            dest_zip: input.dest_zip?.trim() || null,
            delivery_datetime: input.delivery_datetime || null,
            rate: Math.max(0, Number(input.rate) || 0),
            loaded_miles: Math.max(0, Number(input.loaded_miles) || 0),
            deadhead_miles: Math.max(0, Number(input.deadhead_miles) || 0),
            fuel_expense: Math.max(0, Number(input.fuel_expense) || 0),
            driver_pay: Math.max(0, Number(input.driver_pay) || 0),
            other_expenses: Math.max(0, Number(input.other_expenses) || 0),
            special_instructions: input.special_instructions?.trim() || null,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            throw new Error(`Load number "${input.load_number.trim()}" already exists in this organization.`);
          }
          throw error;
        }

        if (data) {
          const createdLoad = data as Load;

          // Auto-record activity events for initial creation and assignment
          activityService.recordSystemEvent(
            organizationId,
            createdLoad.id,
            `Load ${createdLoad.load_number} Created`,
            `Load initialized from ${createdLoad.origin_city}, ${createdLoad.origin_state} to ${createdLoad.dest_city}, ${createdLoad.dest_state}. Status set to ${createdLoad.pipeline_status.toUpperCase()}.`,
            {
              initialStatus: createdLoad.pipeline_status,
              commodity: createdLoad.commodity,
              rate: createdLoad.rate,
              equipmentType: createdLoad.equipment_type,
            }
          ).catch(() => {});

          if (finalTruckId || finalDriverId) {
            const trk = trucks.find((t) => t.id === finalTruckId);
            const drv = drivers.find((d) => d.id === finalDriverId);
            activityService.recordAssignmentChange(
              organizationId,
              createdLoad.id,
              {
                newTruckId: finalTruckId,
                newTruckNumber: trk?.truck_number || null,
                newDriverId: finalDriverId,
                newDriverName: drv?.full_name || null,
              }
            ).catch(() => {});
          }

          return this.joinRelations(createdLoad, clients, brokers, trucks, drivers);
        }
      } catch (err) {
        if ((err as Error).message?.includes('already exists')) {
          throw err;
        }
        console.warn('Supabase createLoad failed, saving locally:', err);
      }
    }

    const { loads } = this.ensureInitialized(organizationId);

    // Check duplicate load number in local storage
    const exists = loads.find(
      (l) => l.load_number.trim().toLowerCase() === input.load_number.trim().toLowerCase()
    );
    if (exists) {
      throw new Error(`Load number "${input.load_number.trim()}" already exists in this organization.`);
    }

    const now = new Date().toISOString();
    const newLoad: Load = {
      id: `load-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      organization_id: organizationId,
      load_number: input.load_number.trim().toUpperCase(),
      client_id: input.client_id,
      broker_id: input.broker_id || null,
      truck_id: finalTruckId,
      driver_id: finalDriverId,
      assigned_dispatcher_id: input.assigned_dispatcher_id || null,
      pipeline_status: input.pipeline_status || 'sourced',
      equipment_type: input.equipment_type || 'dry_van',
      commodity: input.commodity?.trim() || null,
      weight_lbs: input.weight_lbs !== undefined && input.weight_lbs !== null ? Math.max(0, Number(input.weight_lbs)) : null,
      origin_city: input.origin_city.trim(),
      origin_state: input.origin_state.trim().toUpperCase(),
      origin_zip: input.origin_zip?.trim() || null,
      pickup_datetime: input.pickup_datetime || null,
      dest_city: input.dest_city.trim(),
      dest_state: input.dest_state.trim().toUpperCase(),
      dest_zip: input.dest_zip?.trim() || null,
      delivery_datetime: input.delivery_datetime || null,
      rate: Math.max(0, Number(input.rate) || 0),
      loaded_miles: Math.max(0, Number(input.loaded_miles) || 0),
      deadhead_miles: Math.max(0, Number(input.deadhead_miles) || 0),
      fuel_expense: Math.max(0, Number(input.fuel_expense) || 0),
      driver_pay: Math.max(0, Number(input.driver_pay) || 0),
      other_expenses: Math.max(0, Number(input.other_expenses) || 0),
      special_instructions: input.special_instructions?.trim() || null,
      created_at: now,
      updated_at: now,
    };

    const updatedLoads = [newLoad, ...loads];
    const loadsKey = `${LOADS_STORAGE_PREFIX}${organizationId}`;
    saveToStorage(loadsKey, updatedLoads);

    // Auto-record activity events for initial creation and assignment
    activityService.recordSystemEvent(
      organizationId,
      newLoad.id,
      `Load ${newLoad.load_number} Created`,
      `Load initialized from ${newLoad.origin_city}, ${newLoad.origin_state} to ${newLoad.dest_city}, ${newLoad.dest_state}. Status set to ${newLoad.pipeline_status.toUpperCase()}.`,
      {
        initialStatus: newLoad.pipeline_status,
        commodity: newLoad.commodity,
        rate: newLoad.rate,
        equipmentType: newLoad.equipment_type,
      }
    ).catch(() => {});

    if (finalTruckId || finalDriverId) {
      const trk = trucks.find((t) => t.id === finalTruckId);
      const drv = drivers.find((d) => d.id === finalDriverId);
      activityService.recordAssignmentChange(
        organizationId,
        newLoad.id,
        {
          newTruckId: finalTruckId,
          newTruckNumber: trk?.truck_number || null,
          newDriverId: finalDriverId,
          newDriverName: drv?.full_name || null,
        }
      ).catch(() => {});
    }

    return this.joinRelations(newLoad, clients, brokers, trucks, drivers);
  }

  async updateLoad(organizationId: string, id: string, input: UpdateLoadInput): Promise<LoadWithRelations> {
    const [trucks, drivers, clients, brokers] = await this.getDependencies(organizationId);

    // Pickup & Delivery validations
    if (input.origin_state !== undefined && !isValidUsState(input.origin_state)) {
      throw new Error('Valid two-letter origin state code is required (e.g. TX, GA).');
    }
    if (input.dest_state !== undefined && !isValidUsState(input.dest_state)) {
      throw new Error('Valid two-letter destination state code is required (e.g. TX, GA).');
    }

    if (input.broker_id) {
      const broker = brokers.find((b) => b.id === input.broker_id && (!b.organization_id || b.organization_id === organizationId));
      if (!broker) {
        throw new Error('Specified Broker does not exist in this organization.');
      }
    }

    if (isSupabaseConfigured) {
      try {
        const { data: currentLoadData, error: fetchErr } = await supabase
          .from('loads')
          .select('*')
          .eq('id', id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (!fetchErr && currentLoadData) {
          const currentLoad = currentLoadData as Load;

          // Check duplicate load number if changed
          if (input.load_number && input.load_number.trim().toUpperCase() !== currentLoad.load_number) {
            const { data: duplicate } = await supabase
              .from('loads')
              .select('id')
              .eq('organization_id', organizationId)
              .ilike('load_number', input.load_number.trim())
              .neq('id', id)
              .maybeSingle();

            if (duplicate) {
              throw new Error(`Load number "${input.load_number.trim()}" is already in use by another load.`);
            }
          }

          const targetClientId = input.client_id !== undefined ? input.client_id : currentLoad.client_id;
          if (!targetClientId) {
            throw new Error('Client assignment cannot be empty.');
          }

          let targetTruckId = input.truck_id !== undefined ? input.truck_id : currentLoad.truck_id;
          let targetDriverId = input.driver_id !== undefined ? input.driver_id : currentLoad.driver_id;

          if (targetTruckId) {
            const truck = trucks.find((t) => t.id === targetTruckId);
            if (!truck || truck.client_id !== targetClientId) {
              targetTruckId = null;
            }
          }

          if (targetDriverId) {
            const driver = drivers.find((d) => d.id === targetDriverId);
            if (!driver || driver.client_id !== targetClientId) {
              targetDriverId = null;
            }
          }

          const pickupDt = input.pickup_datetime !== undefined ? input.pickup_datetime : currentLoad.pickup_datetime;
          const deliveryDt = input.delivery_datetime !== undefined ? input.delivery_datetime : currentLoad.delivery_datetime;
          if (pickupDt && deliveryDt && new Date(deliveryDt).getTime() < new Date(pickupDt).getTime()) {
            throw new Error('Delivery date and time cannot be earlier than pickup date and time.');
          }

          const { data, error } = await supabase
            .from('loads')
            .update({
              ...(input.load_number !== undefined ? { load_number: input.load_number.trim().toUpperCase() } : {}),
              ...(input.client_id !== undefined ? { client_id: targetClientId } : {}),
              ...(input.broker_id !== undefined ? { broker_id: input.broker_id || null } : {}),
              ...(input.truck_id !== undefined ? { truck_id: targetTruckId } : {}),
              ...(input.driver_id !== undefined ? { driver_id: targetDriverId } : {}),
              ...(input.assigned_dispatcher_id !== undefined ? { assigned_dispatcher_id: input.assigned_dispatcher_id || null } : {}),
              ...(input.pipeline_status !== undefined ? { pipeline_status: input.pipeline_status } : {}),
              ...(input.equipment_type !== undefined ? { equipment_type: input.equipment_type } : {}),
              ...(input.commodity !== undefined ? { commodity: input.commodity?.trim() || null } : {}),
              ...(input.weight_lbs !== undefined ? { weight_lbs: input.weight_lbs !== null ? Math.max(0, Number(input.weight_lbs)) : null } : {}),
              ...(input.origin_city !== undefined ? { origin_city: input.origin_city.trim() } : {}),
              ...(input.origin_state !== undefined ? { origin_state: input.origin_state.trim().toUpperCase() } : {}),
              ...(input.origin_zip !== undefined ? { origin_zip: input.origin_zip?.trim() || null } : {}),
              ...(input.pickup_datetime !== undefined ? { pickup_datetime: pickupDt } : {}),
              ...(input.dest_city !== undefined ? { dest_city: input.dest_city.trim() } : {}),
              ...(input.dest_state !== undefined ? { dest_state: input.dest_state.trim().toUpperCase() } : {}),
              ...(input.dest_zip !== undefined ? { dest_zip: input.dest_zip?.trim() || null } : {}),
              ...(input.delivery_datetime !== undefined ? { delivery_datetime: deliveryDt } : {}),
              ...(input.rate !== undefined ? { rate: Math.max(0, Number(input.rate) || 0) } : {}),
              ...(input.loaded_miles !== undefined ? { loaded_miles: Math.max(0, Number(input.loaded_miles) || 0) } : {}),
              ...(input.deadhead_miles !== undefined ? { deadhead_miles: Math.max(0, Number(input.deadhead_miles) || 0) } : {}),
              ...(input.fuel_expense !== undefined ? { fuel_expense: Math.max(0, Number(input.fuel_expense) || 0) } : {}),
              ...(input.driver_pay !== undefined ? { driver_pay: Math.max(0, Number(input.driver_pay) || 0) } : {}),
              ...(input.other_expenses !== undefined ? { other_expenses: Math.max(0, Number(input.other_expenses) || 0) } : {}),
              ...(input.special_instructions !== undefined ? { special_instructions: input.special_instructions?.trim() || null } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select()
            .single();

          if (error) {
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
              throw new Error(`Load number "${input.load_number?.trim() || ''}" is already in use by another load.`);
            }
            throw error;
          }

          if (data) {
            const updatedLoad = data as Load;

            // Auto-record status shift
            if (input.pipeline_status && input.pipeline_status !== currentLoad.pipeline_status) {
              activityService.recordStatusChange(
                organizationId,
                id,
                currentLoad.pipeline_status,
                input.pipeline_status
              ).catch(() => {});
            }

            // Auto-record assignment change
            if (
              (targetTruckId !== currentLoad.truck_id) ||
              (targetDriverId !== currentLoad.driver_id)
            ) {
              const prevTruck = trucks.find((t) => t.id === currentLoad.truck_id);
              const nextTruck = trucks.find((t) => t.id === targetTruckId);
              const prevDriver = drivers.find((d) => d.id === currentLoad.driver_id);
              const nextDriver = drivers.find((d) => d.id === targetDriverId);

              activityService.recordAssignmentChange(
                organizationId,
                id,
                {
                  previousTruckId: currentLoad.truck_id,
                  newTruckId: targetTruckId,
                  previousTruckNumber: prevTruck?.truck_number || null,
                  newTruckNumber: nextTruck?.truck_number || null,
                  previousDriverId: currentLoad.driver_id,
                  newDriverId: targetDriverId,
                  previousDriverName: prevDriver?.full_name || null,
                  newDriverName: nextDriver?.full_name || null,
                }
              ).catch(() => {});
            }

            return this.joinRelations(updatedLoad, clients, brokers, trucks, drivers);
          }
        }
      } catch (err) {
        if ((err as Error).message?.includes('already in use') || (err as Error).message?.includes('Delivery date')) {
          throw err;
        }
        console.warn('Supabase updateLoad failed, updating locally:', err);
      }
    }

    const { loads } = this.ensureInitialized(organizationId);

    const index = loads.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Load with ID "${id}" was not found.`);
    }

    const currentLoad = loads[index];

    // Check duplicate load number if changed
    if (input.load_number && input.load_number.trim().toUpperCase() !== currentLoad.load_number) {
      const duplicate = loads.find(
        (l) => l.id !== id && l.load_number.trim().toLowerCase() === input.load_number!.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Load number "${input.load_number.trim()}" is already in use by another load.`);
      }
    }

    // Determine target client_id
    const targetClientId = input.client_id !== undefined ? input.client_id : currentLoad.client_id;
    if (!targetClientId) {
      throw new Error('Client assignment cannot be empty.');
    }

    let targetTruckId = input.truck_id !== undefined ? input.truck_id : currentLoad.truck_id;
    let targetDriverId = input.driver_id !== undefined ? input.driver_id : currentLoad.driver_id;

    if (targetTruckId) {
      const truck = trucks.find((t) => t.id === targetTruckId);
      if (!truck || truck.client_id !== targetClientId) {
        targetTruckId = null;
      }
    }

    if (targetDriverId) {
      const driver = drivers.find((d) => d.id === targetDriverId);
      if (!driver || driver.client_id !== targetClientId) {
        targetDriverId = null;
      }
    }

    const originState = input.origin_state !== undefined ? input.origin_state.trim().toUpperCase() : currentLoad.origin_state;
    const destState = input.dest_state !== undefined ? input.dest_state.trim().toUpperCase() : currentLoad.dest_state;

    const pickupDt = input.pickup_datetime !== undefined ? input.pickup_datetime : currentLoad.pickup_datetime;
    const deliveryDt = input.delivery_datetime !== undefined ? input.delivery_datetime : currentLoad.delivery_datetime;
    if (pickupDt && deliveryDt && new Date(deliveryDt).getTime() < new Date(pickupDt).getTime()) {
      throw new Error('Delivery date and time cannot be earlier than pickup date and time.');
    }

    const updatedLoad: Load = {
      ...currentLoad,
      load_number: input.load_number !== undefined ? input.load_number.trim().toUpperCase() : currentLoad.load_number,
      client_id: targetClientId,
      broker_id: input.broker_id !== undefined ? input.broker_id : currentLoad.broker_id,
      truck_id: targetTruckId,
      driver_id: targetDriverId,
      assigned_dispatcher_id: input.assigned_dispatcher_id !== undefined ? input.assigned_dispatcher_id : currentLoad.assigned_dispatcher_id,
      pipeline_status: input.pipeline_status !== undefined ? input.pipeline_status : currentLoad.pipeline_status,
      equipment_type: input.equipment_type !== undefined ? input.equipment_type : currentLoad.equipment_type,
      commodity: input.commodity !== undefined ? (input.commodity?.trim() || null) : currentLoad.commodity,
      weight_lbs: input.weight_lbs !== undefined ? (input.weight_lbs !== null ? Math.max(0, Number(input.weight_lbs)) : null) : currentLoad.weight_lbs,
      origin_city: input.origin_city !== undefined ? input.origin_city.trim() : currentLoad.origin_city,
      origin_state: originState,
      origin_zip: input.origin_zip !== undefined ? (input.origin_zip?.trim() || null) : currentLoad.origin_zip,
      pickup_datetime: pickupDt,
      dest_city: input.dest_city !== undefined ? input.dest_city.trim() : currentLoad.dest_city,
      dest_state: destState,
      dest_zip: input.dest_zip !== undefined ? (input.dest_zip?.trim() || null) : currentLoad.dest_zip,
      delivery_datetime: deliveryDt,
      rate: input.rate !== undefined ? Math.max(0, Number(input.rate) || 0) : currentLoad.rate,
      loaded_miles: input.loaded_miles !== undefined ? Math.max(0, Number(input.loaded_miles) || 0) : currentLoad.loaded_miles,
      deadhead_miles: input.deadhead_miles !== undefined ? Math.max(0, Number(input.deadhead_miles) || 0) : currentLoad.deadhead_miles,
      fuel_expense: input.fuel_expense !== undefined ? Math.max(0, Number(input.fuel_expense) || 0) : currentLoad.fuel_expense,
      driver_pay: input.driver_pay !== undefined ? Math.max(0, Number(input.driver_pay) || 0) : currentLoad.driver_pay,
      other_expenses: input.other_expenses !== undefined ? Math.max(0, Number(input.other_expenses) || 0) : currentLoad.other_expenses,
      special_instructions: input.special_instructions !== undefined ? (input.special_instructions?.trim() || null) : currentLoad.special_instructions,
      updated_at: new Date().toISOString(),
    };

    loads[index] = updatedLoad;
    const loadsKey = `${LOADS_STORAGE_PREFIX}${organizationId}`;
    saveToStorage(loadsKey, loads);

    // Auto-record status shift
    if (input.pipeline_status && input.pipeline_status !== currentLoad.pipeline_status) {
      activityService.recordStatusChange(
        organizationId,
        id,
        currentLoad.pipeline_status,
        input.pipeline_status
      ).catch(() => {});
    }

    // Auto-record assignment change
    if (
      (targetTruckId !== currentLoad.truck_id) ||
      (targetDriverId !== currentLoad.driver_id)
    ) {
      const prevTruck = trucks.find((t) => t.id === currentLoad.truck_id);
      const nextTruck = trucks.find((t) => t.id === targetTruckId);
      const prevDriver = drivers.find((d) => d.id === currentLoad.driver_id);
      const nextDriver = drivers.find((d) => d.id === targetDriverId);

      activityService.recordAssignmentChange(
        organizationId,
        id,
        {
          previousTruckId: currentLoad.truck_id,
          newTruckId: targetTruckId,
          previousTruckNumber: prevTruck?.truck_number || null,
          newTruckNumber: nextTruck?.truck_number || null,
          previousDriverId: currentLoad.driver_id,
          newDriverId: targetDriverId,
          previousDriverName: prevDriver?.full_name || null,
          newDriverName: nextDriver?.full_name || null,
        }
      ).catch(() => {});
    }

    return this.joinRelations(updatedLoad, clients, brokers, trucks, drivers);
  }

  async updateLoadStatus(organizationId: string, id: string, status: PipelineStatus): Promise<LoadWithRelations> {
    return this.updateLoad(organizationId, id, { pipeline_status: status });
  }

  async deleteLoad(organizationId: string, id: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('loads')
          .delete()
          .eq('id', id)
          .eq('organization_id', organizationId);

        if (!error) {
          const { loads } = this.ensureInitialized(organizationId);
          const filtered = loads.filter((l) => l.id !== id);
          const loadsKey = `${LOADS_STORAGE_PREFIX}${organizationId}`;
          saveToStorage(loadsKey, filtered);
          return;
        }
      } catch (err) {
        console.warn('Supabase deleteLoad failed, deleting locally:', err);
      }
    }

    const { loads } = this.ensureInitialized(organizationId);
    const filtered = loads.filter((l) => l.id !== id);
    if (filtered.length === loads.length) {
      throw new Error(`Load with ID "${id}" was not found.`);
    }
    const loadsKey = `${LOADS_STORAGE_PREFIX}${organizationId}`;
    saveToStorage(loadsKey, filtered);
  }

  async getClients(organizationId: string): Promise<Client[]> {
    return clientService.getClients(organizationId);
  }

  async getBrokers(organizationId: string): Promise<Broker[]> {
    return brokerService.listBrokers(organizationId);
  }

  async getTrucks(organizationId: string, clientId?: string): Promise<Truck[]> {
    const trucks = await truckService.getTrucks(organizationId);
    let result: Truck[] = trucks.map((t) => ({
      id: t.id,
      organization_id: t.organization_id,
      client_id: t.client_id,
      truck_number: t.truck_number,
      vin: t.vin,
      equipment_type: t.equipment_type,
      max_weight_lbs: t.max_weight_lbs,
      status: t.status,
      current_location_city: t.current_location_city,
      current_location_state: t.current_location_state,
      notes: t.notes,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
    if (clientId) {
      result = result.filter((t) => t.client_id === clientId);
    }
    return result.sort((a, b) => a.truck_number.localeCompare(b.truck_number));
  }

  async getDrivers(organizationId: string, clientId?: string): Promise<Driver[]> {
    const drivers = await driverService.getDrivers(organizationId);
    let result: Driver[] = drivers.map((d) => ({
      id: d.id,
      organization_id: d.organization_id,
      client_id: d.client_id,
      assigned_truck_id: d.assigned_truck_id,
      full_name: d.full_name,
      phone: d.phone,
      email: d.email,
      pay_type: d.pay_type,
      pay_rate: d.pay_rate,
      status: d.status,
      notes: d.notes,
      created_at: d.created_at,
      updated_at: d.updated_at,
    }));
    if (clientId) {
      result = result.filter((d) => d.client_id === clientId);
    }
    return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  async getDependencies(organizationId: string): Promise<[Truck[], Driver[], Client[], Broker[]]> {
    return Promise.all([
      this.getTrucks(organizationId),
      this.getDrivers(organizationId),
      this.getClients(organizationId),
      this.getBrokers(organizationId),
    ]);
  }

  async generateNextLoadNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LD-${year}-`;
    let maxSeq = 8840;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('loads')
          .select('load_number')
          .eq('organization_id', organizationId);

        if (!error && data) {
          data.forEach((l) => {
            if (l.load_number.startsWith(prefix)) {
              const numPart = parseInt(l.load_number.replace(prefix, ''), 10);
              if (!isNaN(numPart) && numPart > maxSeq) {
                maxSeq = numPart;
              }
            }
          });
          return `${prefix}${maxSeq + 1}`;
        }
      } catch (err) {
        console.warn('Supabase generateNextLoadNumber failed, falling back:', err);
      }
    }

    const { loads } = this.ensureInitialized(organizationId);
    loads.forEach((l) => {
      if (l.load_number.startsWith(prefix)) {
        const numPart = parseInt(l.load_number.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });

    return `${prefix}${maxSeq + 1}`;
  }
}

// Export singleton instance
export const loadService: ILoadService = new LocalLoadService();
