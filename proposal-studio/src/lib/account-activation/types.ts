type ActivationInvalidReason = "invalid" | "expired" | "used" | "revoked";

interface ValidateActivationTokenResult {
  valid: boolean;
  email?: string;
  invitationId?: string;
  reason?: ActivationInvalidReason;
}

type ActivateAccountFailureReason = ActivationInvalidReason | "email_exists" | "error";

interface ActivateAccountResult {
  success: boolean;
  reason?: ActivateAccountFailureReason;
}

interface CreateActivationInvitationParams {
  /** Opcional cuando se provee `membershipId`: el email se deriva de la membresía y debe coincidir si igual se pasa explícito. */
  email?: string;
  /** Etapa 3: invitación comercial asociada a una membresía (`authorized`/`active`). Sin ella, invitación administrativa manual (comportamiento de la Etapa 2). */
  membershipId?: string;
  /** `undefined` para emisión automática por el sistema (Etapa 4: webhook de Mercado Pago) — no hay un administrador actor en ese caso. */
  createdByUserId?: string;
  expiresInHours?: number;
  metadata?: Record<string, unknown>;
}

interface CreateActivationInvitationResult {
  invitationId: string;
  token: string;
  expiresAt: string;
  email: string;
}

/** `emailSent: false` con `success: true` significa "omitido a propósito" (`EMAIL_ENABLED=false`), no una falla. */
interface IssueAndSendActivationInvitationResult {
  success: boolean;
  emailSent: boolean;
}

type AdminInvitationStatus = "pending" | "used" | "revoked" | "expired";

interface AdminInvitationSummary {
  id: string;
  email: string;
  status: AdminInvitationStatus;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  membershipId: string | null;
}

class ActivationServiceError extends Error {
  code:
    | "invalid_email"
    | "email_already_registered"
    | "membership_not_found"
    | "membership_not_eligible"
    | "membership_email_mismatch"
    | "invitation_not_found"
    | "invitation_not_pending"
    | "internal_error";

  constructor(code: ActivationServiceError["code"], message: string) {
    super(message);
    this.name = "ActivationServiceError";
    this.code = code;
  }
}

export { ActivationServiceError };
export type {
  ActivationInvalidReason,
  ValidateActivationTokenResult,
  ActivateAccountFailureReason,
  ActivateAccountResult,
  CreateActivationInvitationParams,
  CreateActivationInvitationResult,
  IssueAndSendActivationInvitationResult,
  AdminInvitationStatus,
  AdminInvitationSummary,
};
