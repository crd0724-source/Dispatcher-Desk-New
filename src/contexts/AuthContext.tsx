import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { Organization, Profile, UserRole } from '../types/domain.types.ts';

export interface UserOrgMembership {
  organization: Organization;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  activeOrganization: Organization | null;
  userRole: UserRole | null;
  memberships: UserOrgMembership[];
  isLoading: boolean;
  isConfigured: boolean;
  setActiveOrganizationId: (orgId: string) => void;
  createOrganization: (name: string, slug?: string, timezone?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<UserOrgMembership[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (currentUser: User) => {
    try {
      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // 2. Fetch memberships and organizations
      const { data: memberRows, error: memberErr } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations (
            id,
            name,
            slug,
            dot_number,
            mc_number,
            primary_timezone,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', currentUser.id);

      if (memberErr) {
        console.error('Error fetching org memberships:', memberErr);
        return;
      }

      const parsedMemberships: UserOrgMembership[] = [];
      if (memberRows) {
        const rows = memberRows as unknown as any[];
        for (const row of rows) {
          if (row.organization) {
            parsedMemberships.push({
              organization: (Array.isArray(row.organization) ? row.organization[0] : row.organization) as unknown as Organization,
              role: row.role as UserRole,
            });
          }
        }
      }

      setMemberships(parsedMemberships);

      // 3. Resolve active organization
      const savedOrgId = localStorage.getItem('dispatchdesk_active_org_id');
      const matched = parsedMemberships.find((m) => m.organization.id === savedOrgId);

      if (matched) {
        setActiveOrganization(matched.organization);
        setUserRole(matched.role);
      } else if (parsedMemberships.length > 0) {
        setActiveOrganization(parsedMemberships[0].organization);
        setUserRole(parsedMemberships[0].role);
        localStorage.setItem('dispatchdesk_active_org_id', parsedMemberships[0].organization.id);
      } else {
        setActiveOrganization(null);
        setUserRole(null);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const LOCAL_ORGS_KEY = 'dispatchdesk_local_orgs';
      const LOCAL_ACTIVE_KEY = 'dispatchdesk_active_org_id';

      const defaultDemoOrg: Organization = {
        id: 'demo-org-1',
        name: 'DispatchDesk Logistics (Demo Fleet)',
        slug: 'dispatchdesk-demo',
        dot_number: '1234567',
        mc_number: '987654',
        primary_timezone: 'America/Chicago',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const storedOrgsRaw = localStorage.getItem(LOCAL_ORGS_KEY);
      let localOrgs: Organization[] = [];
      if (storedOrgsRaw) {
        try {
          localOrgs = JSON.parse(storedOrgsRaw);
        } catch {
          localOrgs = [defaultDemoOrg];
        }
      } else {
        localOrgs = [defaultDemoOrg];
        localStorage.setItem(LOCAL_ORGS_KEY, JSON.stringify(localOrgs));
      }

      const activeId = localStorage.getItem(LOCAL_ACTIVE_KEY) || localOrgs[0].id;
      const matched = localOrgs.find((o) => o.id === activeId) || localOrgs[0];

      const demoMemberships: UserOrgMembership[] = localOrgs.map((org) => ({
        organization: org,
        role: 'owner_admin',
      }));

      setMemberships(demoMemberships);
      setActiveOrganization(matched);
      setUserRole('owner_admin');
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user).finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveOrganization(null);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const setActiveOrganizationId = (orgId: string) => {
    const matched = memberships.find((m) => m.organization.id === orgId);
    if (matched) {
      setActiveOrganization(matched.organization);
      setUserRole(matched.role);
      localStorage.setItem('dispatchdesk_active_org_id', matched.organization.id);
    }
  };

  const createOrganization = async (name: string, slug?: string, timezone = 'America/Chicago'): Promise<string | null> => {
    if (!isSupabaseConfigured) {
      const LOCAL_ORGS_KEY = 'dispatchdesk_local_orgs';
      const LOCAL_ACTIVE_KEY = 'dispatchdesk_active_org_id';

      const normalizedSlug = (slug || name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name: name.trim(),
        slug: normalizedSlug || `org-${Date.now()}`,
        dot_number: null,
        mc_number: null,
        primary_timezone: timezone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const storedOrgsRaw = localStorage.getItem(LOCAL_ORGS_KEY);
      let localOrgs: Organization[] = [];
      if (storedOrgsRaw) {
        try {
          localOrgs = JSON.parse(storedOrgsRaw);
        } catch {
          localOrgs = [];
        }
      }
      localOrgs.push(newOrg);
      localStorage.setItem(LOCAL_ORGS_KEY, JSON.stringify(localOrgs));
      localStorage.setItem(LOCAL_ACTIVE_KEY, newOrg.id);

      const updatedMemberships: UserOrgMembership[] = localOrgs.map((org) => ({
        organization: org,
        role: 'owner_admin',
      }));

      setMemberships(updatedMemberships);
      setActiveOrganization(newOrg);
      setUserRole('owner_admin');
      return newOrg.id;
    }

    if (!user) return null;
    try {
      const normalizedSlug = (slug || name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Use the safe bootstrap RPC function
      const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: string; error: unknown }>)(
        'create_organization_with_admin',
        {
          org_name: name.trim(),
          org_slug: normalizedSlug || undefined,
          org_primary_timezone: timezone,
        }
      );

      if (error) {
        console.error('Failed to create organization:', error);
        throw error;
      }

      await fetchUserData(user);
      return data as string;
    } catch (err) {
      console.error('Create organization exception:', err);
      return null;
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setActiveOrganization(null);
    setUserRole(null);
    setMemberships([]);
    localStorage.removeItem('dispatchdesk_active_org_id');
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        activeOrganization,
        userRole,
        memberships,
        isLoading,
        isConfigured: isSupabaseConfigured,
        setActiveOrganizationId,
        createOrganization,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
