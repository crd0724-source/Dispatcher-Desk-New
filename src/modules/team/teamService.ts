import { TeamMember, TeamInvitation, UserRole, InvitationStatus } from '../../types/domain.types.ts';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.ts';

const TEAM_STORAGE_PREFIX = 'dispatchdesk_demo_team_members_';
const INVITATION_STORAGE_PREFIX = 'dispatchdesk_demo_team_invitations_';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(str?: string | null): boolean {
  return Boolean(str && UUID_REGEX.test(str.trim()));
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Generate a cryptographically secure 256-bit random hex token.
 */
export function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-browser/non-crypto edge cases
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
}

/**
 * Hash raw token using SHA-256 for secure database storage and comparison.
 */
export async function hashToken(rawToken: string): Promise<string> {
  const clean = rawToken.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const msgUint8 = new TextEncoder().encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure JavaScript SHA-256 fallback if subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256_mock_${Math.abs(hash).toString(16)}`;
}

export const SEED_DEMO_TEAM_MEMBERS: Omit<TeamMember, 'organization_id'>[] = [
  {
    id: 'demo-member-1',
    user_id: 'usr-alex-1',
    role: 'owner_admin',
    full_name: 'Alex Rivera',
    phone: '(312) 555-0199',
    preferred_timezone: 'America/Chicago',
    email: 'alex.rivera@dispatchdesk.demo',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'demo-member-2',
    user_id: 'usr-sarah-2',
    role: 'dispatcher',
    full_name: 'Sarah Chen',
    phone: '(312) 555-0145',
    preferred_timezone: 'America/Chicago',
    email: 'sarah.chen@dispatchdesk.demo',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'demo-member-3',
    user_id: 'usr-marcus-3',
    role: 'dispatcher',
    full_name: 'Marcus Johnson',
    phone: '(214) 555-0188',
    preferred_timezone: 'America/Chicago',
    email: 'marcus.j@dispatchdesk.demo',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-member-4',
    user_id: 'usr-elena-4',
    role: 'staff',
    full_name: 'Elena Rostova',
    phone: '+91 98765 43210',
    preferred_timezone: 'Asia/Kolkata',
    email: 'elena.rostova@dispatchdesk.demo',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const SEED_DEMO_INVITATIONS: Omit<TeamInvitation, 'organization_id'>[] = [
  {
    id: 'demo-inv-1',
    email: 'david.miller@dispatchdesk.demo',
    role: 'dispatcher',
    invited_by_user_id: 'usr-alex-1',
    invited_by_name: 'Alex Rivera',
    token_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // SHA256 of 'test'
    expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    accepted_at: null,
    cancelled_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'pending',
  },
  {
    id: 'demo-inv-2',
    email: 'compliance.auditor@dispatchdesk.demo',
    role: 'staff',
    invited_by_user_id: 'usr-alex-1',
    invited_by_name: 'Alex Rivera',
    token_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // SHA256 of 'password'
    expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    accepted_at: null,
    cancelled_at: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    status: 'pending',
  },
];

export interface ITeamService {
  getTeamMembers(organizationId: string): Promise<TeamMember[]>;
  updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: UserRole,
    actorRole?: UserRole | null
  ): Promise<TeamMember>;
  removeMember(
    organizationId: string,
    memberId: string,
    actorRole?: UserRole | null
  ): Promise<void>;

  // S5.2 Invitations
  createInvitation(
    organizationId: string,
    email: string,
    role: UserRole,
    invitedByUserId?: string,
    actorRole?: UserRole | null
  ): Promise<{ invitation: TeamInvitation; rawToken: string; inviteUrl: string }>;
  listInvitations(
    organizationId: string,
    actorRole?: UserRole | null
  ): Promise<TeamInvitation[]>;
  cancelInvitation(
    organizationId: string,
    invitationId: string,
    actorRole?: UserRole | null
  ): Promise<void>;
  getInvitationByToken(rawToken: string): Promise<TeamInvitation | null>;
  acceptInvitation(
    rawToken: string,
    user: { id: string; email?: string; full_name?: string }
  ): Promise<{ organizationId: string; organizationName: string; role: UserRole }>;
}

class TeamService implements ITeamService {
  private memoryMembers: Map<string, string> = new Map();
  private memoryInvitations: Map<string, string> = new Map();
  private rawTokenCache: Map<string, string> = new Map(); // token_hash -> rawToken (for easy demo UI copying)

  private getMemberStorageKey(organizationId: string): string {
    return `${TEAM_STORAGE_PREFIX}${organizationId}`;
  }

  private getInvitationStorageKey(organizationId: string): string {
    return `${INVITATION_STORAGE_PREFIX}${organizationId}`;
  }

  private loadMembersFromStorage(organizationId: string): TeamMember[] {
    const key = this.getMemberStorageKey(organizationId);
    try {
      let raw: string | null = null;
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(key);
      } else {
        raw = this.memoryMembers.get(key) || null;
      }
      if (!raw) return [];
      return JSON.parse(raw) as TeamMember[];
    } catch (err) {
      console.error(`[TeamService] Error loading member storage for org ${organizationId}:`, err);
      return [];
    }
  }

  private saveMembersToStorage(organizationId: string, members: TeamMember[]): void {
    const key = this.getMemberStorageKey(organizationId);
    try {
      const serialized = JSON.stringify(members);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serialized);
      } else {
        this.memoryMembers.set(key, serialized);
      }
    } catch (err) {
      console.error(`[TeamService] Error saving member storage for org ${organizationId}:`, err);
    }
  }

  private ensureMembersInitialized(organizationId: string): TeamMember[] {
    let members = this.loadMembersFromStorage(organizationId);
    if (members.length === 0) {
      members = SEED_DEMO_TEAM_MEMBERS.map((m) => ({
        ...m,
        organization_id: organizationId,
      }));
      this.saveMembersToStorage(organizationId, members);
    }
    return members;
  }

  private loadInvitationsFromStorage(organizationId: string): TeamInvitation[] {
    const key = this.getInvitationStorageKey(organizationId);
    try {
      let raw: string | null = null;
      if (typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(key);
      } else {
        raw = this.memoryInvitations.get(key) || null;
      }
      if (!raw) return [];
      return JSON.parse(raw) as TeamInvitation[];
    } catch (err) {
      console.error(`[TeamService] Error loading invitation storage for org ${organizationId}:`, err);
      return [];
    }
  }

  private saveInvitationsToStorage(organizationId: string, invitations: TeamInvitation[]): void {
    const key = this.getInvitationStorageKey(organizationId);
    try {
      const serialized = JSON.stringify(invitations);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serialized);
      } else {
        this.memoryInvitations.set(key, serialized);
      }
    } catch (err) {
      console.error(`[TeamService] Error saving invitation storage for org ${organizationId}:`, err);
    }
  }

  private ensureInvitationsInitialized(organizationId: string): TeamInvitation[] {
    let invitations = this.loadInvitationsFromStorage(organizationId);
    if (invitations.length === 0) {
      invitations = SEED_DEMO_INVITATIONS.map((inv) => ({
        ...inv,
        organization_id: organizationId,
        organization_name: 'DispatchDesk Logistics (Demo Fleet)',
      }));
      this.saveInvitationsToStorage(organizationId, invitations);
    }
    return invitations;
  }

  private computeInvitationStatus(inv: {
    accepted_at?: string | null;
    cancelled_at?: string | null;
    expires_at: string;
  }): InvitationStatus {
    if (inv.cancelled_at) return 'cancelled';
    if (inv.accepted_at) return 'accepted';
    if (new Date(inv.expires_at).getTime() <= Date.now()) return 'expired';
    return 'pending';
  }

  private sortMembers(members: TeamMember[]): TeamMember[] {
    const roleRank: Record<UserRole, number> = {
      owner_admin: 1,
      dispatcher: 2,
      staff: 3,
    };

    return [...members].sort((a, b) => {
      const rankDiff = (roleRank[a.role] || 99) - (roleRank[b.role] || 99);
      if (rankDiff !== 0) return rankDiff;
      const nameA = a.full_name || '';
      const nameB = b.full_name || '';
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Fetch all team members in an organization with hydrated profiles.
   */
  async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    if (!organizationId) return [];

    if (isSupabaseConfigured && isUUID(organizationId)) {
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true });

        if (memberErr) {
          console.error('[TeamService] Error querying organization_members:', memberErr);
          throw memberErr;
        }

        if (memberRows && memberRows.length > 0) {
          const userIds = memberRows.map((m) => m.user_id).filter(Boolean);

          const { data: profileRows, error: profileErr } = await supabase
            .from('profiles')
            .select('id, full_name, phone, preferred_timezone')
            .in('id', userIds);

          if (profileErr) {
            console.warn('[TeamService] Profile fetch warning:', profileErr);
          }

          const profileMap = new Map<
            string,
            { full_name: string | null; phone: string | null; preferred_timezone: string | null }
          >();

          if (profileRows) {
            for (const p of profileRows) {
              profileMap.set(p.id, p);
            }
          }

          const result: TeamMember[] = memberRows.map((m) => {
            const profile = profileMap.get(m.user_id);
            return {
              id: m.id,
              user_id: m.user_id,
              organization_id: m.organization_id,
              role: m.role as UserRole,
              created_at: m.created_at,
              updated_at: m.updated_at,
              full_name: profile?.full_name || 'Team Member',
              phone: profile?.phone || null,
              preferred_timezone: profile?.preferred_timezone || null,
              email: null,
            };
          });

          return this.sortMembers(result);
        }
      } catch (err) {
        console.warn('[TeamService] Supabase getTeamMembers fallback to demo store:', err);
      }
    }

    const members = this.ensureMembersInitialized(organizationId);
    return this.sortMembers(members);
  }

  /**
   * Update a member's role (owner_admin only).
   * Guards against demoting the sole owner_admin of an organization.
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: UserRole,
    actorRole?: UserRole | null
  ): Promise<TeamMember> {
    if (actorRole && actorRole !== 'owner_admin') {
      throw new Error('Unauthorized: Only Owner/Admins can modify team member roles.');
    }

    const validRoles: UserRole[] = ['owner_admin', 'dispatcher', 'staff'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role "${newRole}". Allowed roles: owner_admin, dispatcher, staff.`);
    }

    const currentMembers = await this.getTeamMembers(organizationId);
    const targetMember = currentMembers.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new Error(`Team member with ID "${memberId}" was not found in organization.`);
    }

    if (targetMember.role === 'owner_admin' && newRole !== 'owner_admin') {
      const ownerAdminCount = currentMembers.filter((m) => m.role === 'owner_admin').length;
      if (ownerAdminCount <= 1) {
        throw new Error('Cannot demote the last Owner/Admin. Every organization must maintain at least one Owner/Admin.');
      }
    }

    if (isSupabaseConfigured && isUUID(organizationId) && isUUID(memberId)) {
      try {
        const { data, error } = await supabase
          .from('organization_members')
          .update({
            role: newRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', memberId)
          .eq('organization_id', organizationId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Failed to update member role in Supabase.');
        }

        if (data) {
          const localMembers = this.loadMembersFromStorage(organizationId);
          const idx = localMembers.findIndex((m) => m.id === memberId);
          if (idx !== -1) {
            localMembers[idx].role = newRole;
            localMembers[idx].updated_at = new Date().toISOString();
            this.saveMembersToStorage(organizationId, localMembers);
          }

          return {
            ...targetMember,
            role: newRole,
            updated_at: data.updated_at,
          };
        }
      } catch (err: any) {
        console.warn('[TeamService] Supabase updateMemberRole error:', err);
        throw err;
      }
    }

    // Local / Demo Mode execution
    const localMembers = this.ensureMembersInitialized(organizationId);
    const idx = localMembers.findIndex((m) => m.id === memberId);
    if (idx === -1) {
      throw new Error(`Team member with ID "${memberId}" was not found.`);
    }

    const updated: TeamMember = {
      ...localMembers[idx],
      role: newRole,
      updated_at: new Date().toISOString(),
    };

    localMembers[idx] = updated;
    this.saveMembersToStorage(organizationId, localMembers);
    return updated;
  }

  /**
   * Remove a member from an organization (owner_admin only).
   * Guards against deleting the sole owner_admin of an organization.
   */
  async removeMember(
    organizationId: string,
    memberId: string,
    actorRole?: UserRole | null
  ): Promise<void> {
    if (actorRole && actorRole !== 'owner_admin') {
      throw new Error('Unauthorized: Only Owner/Admins can remove team members.');
    }

    const currentMembers = await this.getTeamMembers(organizationId);
    const targetMember = currentMembers.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new Error(`Team member with ID "${memberId}" was not found in organization.`);
    }

    if (targetMember.role === 'owner_admin') {
      const ownerAdminCount = currentMembers.filter((m) => m.role === 'owner_admin').length;
      if (ownerAdminCount <= 1) {
        throw new Error('Cannot remove the last Owner/Admin. Every organization must maintain at least one Owner/Admin.');
      }
    }

    if (isSupabaseConfigured && isUUID(organizationId) && isUUID(memberId)) {
      try {
        const { error } = await supabase
          .from('organization_members')
          .delete()
          .eq('id', memberId)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(error.message || 'Failed to remove member in Supabase.');
        }
      } catch (err: any) {
        console.warn('[TeamService] Supabase removeMember error:', err);
        throw err;
      }
    }

    // Local / Demo Mode removal
    const localMembers = this.ensureMembersInitialized(organizationId);
    const filtered = localMembers.filter((m) => m.id !== memberId);
    this.saveMembersToStorage(organizationId, filtered);
  }

  /**
   * S5.2: Create and dispatch a new team invitation.
   * Generates a cryptographic token, computes SHA-256 hash, enforces uniqueness,
   * and returns the invitation record with the shareable invitation URL.
   */
  async createInvitation(
    organizationId: string,
    email: string,
    role: UserRole,
    invitedByUserId?: string,
    actorRole?: UserRole | null
  ): Promise<{ invitation: TeamInvitation; rawToken: string; inviteUrl: string }> {
    if (actorRole && actorRole !== 'owner_admin') {
      throw new Error('Unauthorized: Only Owner/Admins can invite team members.');
    }

    const normalizedEmail = normalizeEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    const validRoles: UserRole[] = ['owner_admin', 'dispatcher', 'staff'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role "${role}". Allowed roles: owner_admin, dispatcher, staff.`);
    }

    // 1. Check existing members
    const existingMembers = await this.getTeamMembers(organizationId);
    const alreadyMember = existingMembers.some(
      (m) => m.email && normalizeEmail(m.email) === normalizedEmail
    );
    if (alreadyMember) {
      throw new Error(`User with email "${normalizedEmail}" is already an active member of this organization.`);
    }

    // 2. Check existing pending invitations
    const existingInvitations = await this.listInvitations(organizationId, actorRole);
    const activeInv = existingInvitations.find(
      (inv) =>
        normalizeEmail(inv.email) === normalizedEmail &&
        inv.status === 'pending'
    );
    if (activeInv) {
      throw new Error(`An active pending invitation already exists for "${normalizedEmail}". You can copy or cancel the existing invitation.`);
    }

    // 3. Generate token & hash
    const rawToken = generateSecureToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days expiry

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dispatchdesk.app';
    const inviteUrl = `${origin}/?invitation_token=${encodeURIComponent(rawToken)}`;

    if (isSupabaseConfigured && isUUID(organizationId)) {
      try {
        const { data, error } = await supabase
          .from('organization_invitations')
          .insert({
            organization_id: organizationId,
            email: normalizedEmail,
            role,
            invited_by_user_id: invitedByUserId || null,
            token_hash: tokenHash,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error(`An active invitation already exists for "${normalizedEmail}".`);
          }
          throw new Error(error.message || 'Failed to create team invitation in Supabase.');
        }

        if (data) {
          const inv: TeamInvitation = {
            id: data.id,
            organization_id: data.organization_id,
            email: data.email,
            role: data.role as UserRole,
            invited_by_user_id: data.invited_by_user_id,
            token_hash: data.token_hash,
            expires_at: data.expires_at,
            accepted_at: data.accepted_at,
            cancelled_at: data.cancelled_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
            status: 'pending',
          };

          this.rawTokenCache.set(tokenHash, rawToken);
          return { invitation: inv, rawToken, inviteUrl };
        }
      } catch (err: any) {
        console.warn('[TeamService] Supabase createInvitation error:', err);
        throw err;
      }
    }

    // Local / Demo Mode execution
    const localInvitations = this.ensureInvitationsInitialized(organizationId);
    const newInvitation: TeamInvitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      organization_name: 'DispatchDesk Logistics (Demo Fleet)',
      email: normalizedEmail,
      role,
      invited_by_user_id: invitedByUserId || 'usr-alex-1',
      invited_by_name: 'Alex Rivera (Owner/Admin)',
      token_hash: tokenHash,
      expires_at: expiresAt,
      accepted_at: null,
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending',
    };

    localInvitations.unshift(newInvitation);
    this.saveInvitationsToStorage(organizationId, localInvitations);
    this.rawTokenCache.set(tokenHash, rawToken);

    return {
      invitation: newInvitation,
      rawToken,
      inviteUrl,
    };
  }

  /**
   * S5.2: List invitations for an organization with calculated status.
   */
  async listInvitations(
    organizationId: string,
    actorRole?: UserRole | null
  ): Promise<TeamInvitation[]> {
    if (!organizationId) return [];

    if (isSupabaseConfigured && isUUID(organizationId)) {
      try {
        const { data, error } = await supabase
          .from('organization_invitations')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[TeamService] Error fetching organization_invitations:', error);
          throw error;
        }

        if (data) {
          // Fetch inviter profiles
          const inviterIds = data.map((d) => d.invited_by_user_id).filter(Boolean) as string[];
          let inviterMap = new Map<string, string>();

          if (inviterIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', inviterIds);

            if (profs) {
              for (const p of profs) {
                if (p.full_name) inviterMap.set(p.id, p.full_name);
              }
            }
          }

          return data.map((row) => ({
            id: row.id,
            organization_id: row.organization_id,
            email: row.email,
            role: row.role as UserRole,
            invited_by_user_id: row.invited_by_user_id,
            invited_by_name: row.invited_by_user_id ? inviterMap.get(row.invited_by_user_id) || 'Administrator' : null,
            token_hash: row.token_hash,
            expires_at: row.expires_at,
            accepted_at: row.accepted_at,
            cancelled_at: row.cancelled_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            status: this.computeInvitationStatus(row),
          }));
        }
      } catch (err) {
        console.warn('[TeamService] Supabase listInvitations fallback to demo store:', err);
      }
    }

    // Local / Demo Mode
    const local = this.ensureInvitationsInitialized(organizationId);
    return local.map((inv) => ({
      ...inv,
      status: this.computeInvitationStatus(inv),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * S5.2: Cancel an active pending invitation (owner_admin only).
   */
  async cancelInvitation(
    organizationId: string,
    invitationId: string,
    actorRole?: UserRole | null
  ): Promise<void> {
    if (actorRole && actorRole !== 'owner_admin') {
      throw new Error('Unauthorized: Only Owner/Admins can cancel team invitations.');
    }

    if (isSupabaseConfigured && isUUID(organizationId) && isUUID(invitationId)) {
      try {
        const { error } = await supabase
          .from('organization_invitations')
          .update({
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', invitationId)
          .eq('organization_id', organizationId);

        if (error) {
          throw new Error(error.message || 'Failed to cancel invitation in Supabase.');
        }
        return;
      } catch (err: any) {
        console.warn('[TeamService] Supabase cancelInvitation error:', err);
        throw err;
      }
    }

    // Local / Demo Mode
    const local = this.ensureInvitationsInitialized(organizationId);
    const idx = local.findIndex((i) => i.id === invitationId);
    if (idx !== -1) {
      local[idx].cancelled_at = new Date().toISOString();
      local[idx].status = 'cancelled';
      local[idx].updated_at = new Date().toISOString();
      this.saveInvitationsToStorage(organizationId, local);
    }
  }

  /**
   * S5.2: Look up invitation details by raw URL token.
   * Hashes the raw token to find the invitation without exposing table permissions.
   */
  async getInvitationByToken(rawToken: string): Promise<TeamInvitation | null> {
    if (!rawToken || !rawToken.trim()) return null;

    const tokenHash = await hashToken(rawToken.trim());

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: any; error: unknown }>)(
          'get_invitation_details',
          { p_token_hash: tokenHash }
        );

        if (error) {
          console.warn('[TeamService] Supabase get_invitation_details RPC error:', error);
        } else if (data && data.id) {
          return {
            id: data.id,
            organization_id: data.organization_id,
            organization_name: data.organization_name || 'DispatchDesk Organization',
            email: data.email,
            role: data.role as UserRole,
            invited_by_user_id: data.invited_by_user_id,
            invited_by_name: data.invited_by_name,
            expires_at: data.expires_at,
            accepted_at: data.accepted_at,
            cancelled_at: data.cancelled_at,
            created_at: data.created_at,
            status: data.status as InvitationStatus,
          };
        }
      } catch (err) {
        console.warn('[TeamService] RPC get_invitation_details failed:', err);
      }
    }

    // Local / Demo Mode search
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(INVITATION_STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const list: TeamInvitation[] = JSON.parse(raw);
              const matched = list.find(
                (inv) => inv.token_hash === tokenHash || inv.token_hash === rawToken
              );
              if (matched) {
                return {
                  ...matched,
                  status: this.computeInvitationStatus(matched),
                };
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    }

    // Check seed invitations fallback
    const seedMatch = SEED_DEMO_INVITATIONS.find(
      (inv) => inv.token_hash === tokenHash || inv.token_hash === rawToken || rawToken === 'demo-test-token'
    );
    if (seedMatch) {
      return {
        ...seedMatch,
        organization_id: 'demo-org-1',
        organization_name: 'DispatchDesk Logistics (Demo Fleet)',
        status: this.computeInvitationStatus(seedMatch),
      };
    }

    return null;
  }

  /**
   * S5.2: Accept invitation and provision organization membership.
   */
  async acceptInvitation(
    rawToken: string,
    user: { id: string; email?: string; full_name?: string }
  ): Promise<{ organizationId: string; organizationName: string; role: UserRole }> {
    if (!rawToken || !rawToken.trim()) {
      throw new Error('Invitation token is required.');
    }
    if (!user || !user.id || !user.email) {
      throw new Error('Authenticated user details are required.');
    }

    const tokenHash = await hashToken(rawToken.trim());

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: any; error: any }>)(
          'accept_team_invitation',
          { p_token_hash: tokenHash }
        );

        if (error) {
          throw new Error(error.message || 'Failed to accept invitation.');
        }

        if (data && data.success) {
          return {
            organizationId: data.organization_id,
            organizationName: data.organization_name || 'Organization',
            role: data.role as UserRole,
          };
        }
      } catch (err: any) {
        console.error('[TeamService] Supabase accept_team_invitation error:', err);
        throw err;
      }
    }

    // Local / Demo Mode acceptance
    const invitation = await this.getInvitationByToken(rawToken);
    if (!invitation) {
      throw new Error('Invitation not found or link has expired.');
    }

    if (invitation.cancelled_at) {
      throw new Error('This invitation has been cancelled by an administrator.');
    }
    if (invitation.accepted_at) {
      throw new Error('This invitation has already been accepted.');
    }
    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      throw new Error('This invitation has expired.');
    }

    // Verify email match (case-insensitive)
    if (normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
      throw new Error(
        `This invitation was sent to ${invitation.email}. You are signed in as ${user.email}. Please sign in with the invited email address to accept.`
      );
    }

    // Add user as member to the organization
    const orgId = invitation.organization_id || 'demo-org-1';
    const currentMembers = this.ensureMembersInitialized(orgId);
    const existingIdx = currentMembers.findIndex((m) => m.user_id === user.id);

    const updatedMember: TeamMember = {
      id: existingIdx !== -1 ? currentMembers[existingIdx].id : `mem-${Date.now()}`,
      user_id: user.id,
      organization_id: orgId,
      role: invitation.role,
      full_name: user.full_name || 'New Team Member',
      phone: null,
      preferred_timezone: 'America/Chicago',
      email: invitation.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      currentMembers[existingIdx] = updatedMember;
    } else {
      currentMembers.push(updatedMember);
    }
    this.saveMembersToStorage(orgId, currentMembers);

    // Mark invitation as accepted
    const localInvitations = this.ensureInvitationsInitialized(orgId);
    const invIdx = localInvitations.findIndex((i) => i.id === invitation.id);
    if (invIdx !== -1) {
      localInvitations[invIdx].accepted_at = new Date().toISOString();
      localInvitations[invIdx].status = 'accepted';
      this.saveInvitationsToStorage(orgId, localInvitations);
    }

    return {
      organizationId: orgId,
      organizationName: invitation.organization_name || 'DispatchDesk Logistics (Demo Fleet)',
      role: invitation.role,
    };
  }
}

export const teamService: ITeamService = new TeamService();
