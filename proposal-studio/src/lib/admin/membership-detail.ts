import "server-only";

import { createAdminClient } from "@/lib/database/admin";

interface MembershipHistoryEntry {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  source: string;
  actorUserId: string | null;
  reason: string | null;
  externalEventId: string | null;
  createdAt: string;
}

async function getMembershipStatusHistory(membershipId: string): Promise<MembershipHistoryEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_status_history")
    .select("id, previous_status, new_status, source, actor_user_id, reason, external_event_id, created_at")
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    source: row.source,
    actorUserId: row.actor_user_id,
    reason: row.reason,
    externalEventId: row.external_event_id,
    createdAt: row.created_at,
  }));
}

interface ProviderEventEntry {
  id: string;
  eventType: string;
  providerResourceId: string | null;
  processingStatus: string;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: string;
}

/** Correlaciona por `(provider, provider_resource_id)` — `payment_provider_events` no tiene FK directa a `memberships`. */
async function getMembershipProviderEvents(provider: string | null, providerResourceId: string | null): Promise<ProviderEventEntry[]> {
  if (!provider || !providerResourceId) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_provider_events")
    .select("id, event_type, provider_resource_id, processing_status, attempt_count, error_message, created_at")
    .eq("provider", provider)
    .eq("provider_resource_id", providerResourceId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    providerResourceId: row.provider_resource_id,
    processingStatus: row.processing_status,
    attemptCount: row.attempt_count,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}

interface InvitationEntry {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByUserId: string | null;
}

async function getMembershipInvitations(membershipId: string): Promise<InvitationEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("account_activation_invitations")
    .select("id, status, created_at, expires_at, used_at, used_by_user_id")
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    usedByUserId: row.used_by_user_id,
  }));
}

export { getMembershipStatusHistory, getMembershipProviderEvents, getMembershipInvitations };
export type { MembershipHistoryEntry, ProviderEventEntry, InvitationEntry };
