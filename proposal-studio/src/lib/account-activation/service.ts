import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/database/admin";
import type { Database } from "@/lib/database/types";
import { logServerError } from "@/lib/utils/errors";
import { findAuthUserByEmail } from "@/lib/auth/admin-lookup";
import { generateActivationToken, hashActivationToken } from "@/lib/account-activation/tokens";
import { ActivationServiceError } from "@/lib/account-activation/types";
import type {
  ValidateActivationTokenResult,
  ActivateAccountResult,
  CreateActivationInvitationParams,
  CreateActivationInvitationResult,
} from "@/lib/account-activation/types";
import { getMembershipById, linkMembershipToUser } from "@/lib/memberships/service";
import { ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import type { Membership } from "@/lib/memberships/types";
import { sendActivationEmail } from "@/lib/email/activation-email";
import { EmailDeliveryError } from "@/lib/email/client";

const DEFAULT_EXPIRES_IN_HOURS = 48;

const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Chequeo best-effort de "¿ya existe un usuario con este email?" al emitir la
 * invitación. No es la puerta de seguridad real (esa es `auth.admin.createUser`
 * en `activateAccount`, que rechaza de forma autoritativa un email duplicado):
 * esto es solo para no emitir una invitación que nunca podría consumirse y dar
 * mejor feedback al administrador. Si la búsqueda falla, se trata como
 * "desconocido" y se continúa — nunca bloquea la emisión por un error de red.
 */
async function findExistingAuthUserByEmail(email: string): Promise<boolean> {
  return Boolean(await findAuthUserByEmail(email));
}

/**
 * Emite una invitación de activación de cuenta. Solo debe invocarse desde
 * código server-side ya protegido por `requirePlatformOwner()` (ver
 * `src/lib/account-activation/admin-actions.ts`). Devuelve el token en texto
 * plano una única vez: quien lo recibe es responsable de construir el enlace
 * y no debe loguearlo ni persistirlo en ningún otro lugar.
 */
async function createActivationInvitation({
  email,
  membershipId,
  createdByUserId = undefined,
  expiresInHours = DEFAULT_EXPIRES_IN_HOURS,
  metadata = {},
}: CreateActivationInvitationParams): Promise<CreateActivationInvitationResult> {
  let membership: Membership | null = null;

  if (membershipId) {
    membership = await getMembershipById(membershipId);
    if (!membership) {
      throw new ActivationServiceError("membership_not_found", "La membresía indicada no existe.");
    }
    if (!ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status)) {
      throw new ActivationServiceError(
        "membership_not_eligible",
        `La membresía está en estado "${membership.status}" y no permite emitir una invitación de activación.`,
      );
    }
    if (email && email.trim().toLowerCase() !== membership.email) {
      throw new ActivationServiceError(
        "membership_email_mismatch",
        "El correo indicado no coincide con el de la membresía.",
      );
    }
  }

  const emailToUse = membership?.email ?? email;
  const parsedEmail = emailSchema.safeParse(emailToUse);
  if (!parsedEmail.success) {
    throw new ActivationServiceError("invalid_email", "El correo ingresado no tiene un formato válido.");
  }
  const normalizedEmail = parsedEmail.data;

  const admin = createAdminClient();

  const alreadyRegistered = await findExistingAuthUserByEmail(normalizedEmail);
  if (alreadyRegistered) {
    throw new ActivationServiceError(
      "email_already_registered",
      "Ya existe una cuenta creada con ese correo.",
    );
  }

  const nowIso = new Date().toISOString();

  // Revoca cualquier invitación pendiente previa para el mismo email: nunca
  // deben convivir dos invitaciones activas para el mismo destinatario.
  await admin
    .from("account_activation_invitations")
    .update({ status: "revoked", updated_at: nowIso })
    .eq("email", normalizedEmail)
    .eq("status", "pending");

  const token = generateActivationToken();
  const tokenHash = hashActivationToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 3_600_000).toISOString();

  const { data, error } = await admin
    .from("account_activation_invitations")
    .insert({
      email: normalizedEmail,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_user_id: createdByUserId ?? null,
      membership_id: membershipId ?? null,
      metadata: metadata as Database["public"]["Tables"]["account_activation_invitations"]["Insert"]["metadata"],
    })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    logServerError("createActivationInvitation", error);
    throw new ActivationServiceError("internal_error", "No se pudo crear la invitación.");
  }

  // Auditoría: nunca se loguea el token, solo metadata no sensible.
  console.log("[account-activation] invitation_created", {
    invitationId: data.id,
    email: normalizedEmail,
  });

  return { invitationId: data.id, token, expiresAt: data.expires_at, email: normalizedEmail };
}

/**
 * Valida un token de activación sin consumirlo. Segura para llamarse
 * repetidas veces (ej. al cargar `/activate-account`) — no muta estado. La
 * razón exacta (`reason`) es solo para logging/UX interno: la UI pública
 * siempre debe mostrar un mensaje neutral, nunca distinguir estos casos.
 */
async function validateActivationToken(token: string): Promise<ValidateActivationTokenResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "invalid" };
  }

  const admin = createAdminClient();
  const tokenHash = hashActivationToken(token);

  const { data, error } = await admin
    .from("account_activation_invitations")
    .select("id, email, status, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, reason: "invalid" };
  }

  if (data.status === "revoked") {
    return { valid: false, reason: "revoked" };
  }

  if (data.status === "used" || data.used_at) {
    return { valid: false, reason: "used" };
  }

  if (data.status !== "pending") {
    return { valid: false, reason: "invalid" };
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, email: data.email, invitationId: data.id };
}

/**
 * Crea la cuenta a partir de un token de activación. Revalida todo
 * server-side (nunca confía en la validación previa de la página) y maneja
 * la falta de transacción única entre Supabase Auth y Postgres con un
 * reclamo atómico + compensación:
 *
 * 1. Reclama la invitación con un único UPDATE condicionado a
 *    `status = 'pending' and expires_at > now()` — atómico a nivel de fila,
 *    así que ante dos envíos simultáneos con el mismo token solo uno puede
 *    ganar la carrera.
 * 2. Crea el usuario en Supabase Auth.
 * 3. Si la creación falla, libera la invitación (vuelve a `pending`) — pero
 *    solo si nadie más la confirmó ya (`used_by_user_id is null`).
 * 4. Si la creación tuvo éxito, confirma el consumo con el id real del
 *    usuario creado.
 * 5. Verifica que `handle_new_user` haya creado el perfil.
 *
 * Si el proceso se interrumpe entre 2 y 4 (crash, timeout), el usuario queda
 * creado pero la invitación puede quedar en `used` sin `used_by_user_id`:
 * ese estado inconsistente se loguea explícitamente para reparación
 * administrativa manual (no hay forma de tener una única transacción entre
 * Supabase Auth y Postgres).
 */
async function activateAccount(params: {
  token: string;
  fullName: string;
  password: string;
}): Promise<ActivateAccountResult> {
  const { token, fullName, password } = params;
  const admin = createAdminClient();
  const tokenHash = hashActivationToken(token);
  const nowIso = new Date().toISOString();

  const { data: claimed, error: claimError } = await admin
    .from("account_activation_invitations")
    .update({ status: "used", used_at: nowIso, updated_at: nowIso })
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .select("id, email, membership_id")
    .maybeSingle();

  if (claimError || !claimed) {
    // No se reclamó nada: puede ser inválido, ya usado, revocado o vencido.
    // Se reutiliza validateActivationToken solo para loguear la razón real;
    // el llamador igual debe mostrar el mensaje neutral genérico.
    const details = await validateActivationToken(token);
    console.warn("[account-activation] activation_attempt_failed", { reason: details.reason ?? "invalid" });
    return { success: false, reason: details.reason ?? "invalid" };
  }

  // Etapa 3: si la invitación viene de una contratación comercial, la
  // membresía se revalida acá con datos frescos (nunca se confía en el
  // estado que tenía al emitirse la invitación) — pudo cancelarse o vencer
  // entre la emisión y este momento.
  if (claimed.membership_id) {
    const membership = await getMembershipById(claimed.membership_id);
    const membershipInvalid =
      !membership ||
      membership.email !== claimed.email ||
      !ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status);

    if (membershipInvalid) {
      await admin
        .from("account_activation_invitations")
        .update({ status: "pending", used_at: null, updated_at: new Date().toISOString() })
        .eq("id", claimed.id)
        .eq("status", "used")
        .is("used_by_user_id", null);

      console.warn("[account-activation] activation_attempt_failed_membership", {
        invitationId: claimed.id,
        membershipId: claimed.membership_id,
      });
      return { success: false, reason: "invalid" };
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: claimed.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created?.user) {
    // Libera la invitación: no se pierde el token del usuario legítimo por un
    // error transitorio de creación (ej. contraseña rechazada por el proveedor).
    await admin
      .from("account_activation_invitations")
      .update({ status: "pending", used_at: null, updated_at: new Date().toISOString() })
      .eq("id", claimed.id)
      .eq("status", "used")
      .is("used_by_user_id", null);

    logServerError("activateAccount:createUser", createError);

    const isEmailExists =
      createError?.code === "email_exists" || createError?.message?.toLowerCase().includes("already registered");
    return { success: false, reason: isEmailExists ? "email_exists" : "error" };
  }

  const { data: confirmedRows, error: confirmError } = await admin
    .from("account_activation_invitations")
    .update({ used_by_user_id: created.user.id, updated_at: new Date().toISOString() })
    .eq("id", claimed.id)
    .eq("status", "used")
    .is("used_by_user_id", null)
    .select("id");

  if (confirmError || !confirmedRows?.length) {
    console.error("[account-activation] INCONSISTENT_STATE_needs_manual_repair", {
      invitationId: claimed.id,
      userId: created.user.id,
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", created.user.id)
    .maybeSingle();

  if (!profile) {
    console.error("[account-activation] PROFILE_NOT_CREATED_needs_manual_repair", {
      invitationId: claimed.id,
      userId: created.user.id,
    });
    return { success: false, reason: "error" };
  }

  if (claimed.membership_id) {
    try {
      await linkMembershipToUser({
        membershipId: claimed.membership_id,
        userId: created.user.id,
        email: claimed.email,
        source: "activation",
        actorUserId: created.user.id,
      });
    } catch (error) {
      // La cuenta ya existe y el perfil ya se verificó: no se revierte la
      // activación por esto (el usuario legítimo necesita poder entrar). Se
      // deja loggeado para reparación administrativa manual — mismo criterio
      // que INCONSISTENT_STATE más arriba.
      console.error("[account-activation] MEMBERSHIP_LINK_FAILED_needs_manual_repair", {
        invitationId: claimed.id,
        membershipId: claimed.membership_id,
        userId: created.user.id,
        error,
      });
    }
  }

  console.log("[account-activation] activation_completed", { invitationId: claimed.id, userId: created.user.id });

  return { success: true };
}

/**
 * Variante de `activateAccount` para "Activar con Google" (Etapa 5, sección
 * 15): el usuario de Supabase Auth ya existe (lo creó el propio intercambio
 * OAuth en `/auth/callback`, antes de llegar acá) — esta función no crea
 * ningún usuario, solo reclama la invitación y vincula la membresía al
 * `userId` ya autenticado. El email debe coincidir EXACTAMENTE con el de la
 * invitación (`.eq("email", ...)` en la misma condición atómica del claim):
 * si Google devuelve un email distinto, el claim no matchea ninguna fila y
 * se devuelve `success: false` sin consumir nada — el llamador
 * (`/auth/callback`) es responsable de no dejar la cuenta de Google huérfana
 * en ese caso.
 */
async function consumeActivationInvitationForOAuthUser(params: {
  token: string;
  userId: string;
  email: string;
}): Promise<{ success: boolean }> {
  const admin = createAdminClient();
  const tokenHash = hashActivationToken(params.token);
  const nowIso = new Date().toISOString();
  const normalizedEmail = params.email.trim().toLowerCase();

  const { data: claimed, error: claimError } = await admin
    .from("account_activation_invitations")
    .update({ status: "used", used_at: nowIso, updated_at: nowIso })
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .eq("email", normalizedEmail)
    .gt("expires_at", nowIso)
    .select("id, email, membership_id")
    .maybeSingle();

  if (claimError || !claimed) {
    console.warn("[account-activation] oauth_activation_attempt_failed");
    return { success: false };
  }

  if (claimed.membership_id) {
    const membership = await getMembershipById(claimed.membership_id);
    const membershipInvalid =
      !membership || membership.email !== claimed.email || !ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status);

    if (membershipInvalid) {
      await admin
        .from("account_activation_invitations")
        .update({ status: "pending", used_at: null, updated_at: new Date().toISOString() })
        .eq("id", claimed.id)
        .eq("status", "used")
        .is("used_by_user_id", null);

      console.warn("[account-activation] oauth_activation_attempt_failed_membership", { invitationId: claimed.id });
      return { success: false };
    }
  }

  const { data: confirmedRows, error: confirmError } = await admin
    .from("account_activation_invitations")
    .update({ used_by_user_id: params.userId, updated_at: new Date().toISOString() })
    .eq("id", claimed.id)
    .eq("status", "used")
    .is("used_by_user_id", null)
    .select("id");

  if (confirmError || !confirmedRows?.length) {
    console.error("[account-activation] INCONSISTENT_STATE_needs_manual_repair_oauth", {
      invitationId: claimed.id,
      userId: params.userId,
    });
  }

  if (claimed.membership_id) {
    try {
      await linkMembershipToUser({
        membershipId: claimed.membership_id,
        userId: params.userId,
        email: claimed.email,
        source: "activation",
        actorUserId: params.userId,
      });
    } catch (error) {
      console.error("[account-activation] MEMBERSHIP_LINK_FAILED_needs_manual_repair_oauth", {
        invitationId: claimed.id,
        userId: params.userId,
        error,
      });
      return { success: false };
    }
  }

  console.log("[account-activation] oauth_activation_completed", { invitationId: claimed.id, userId: params.userId });
  return { success: true };
}

/**
 * Estrategia de entrega real (Etapa 5, sección 2, "generación bajo
 * demanda"): genera un token nuevo y lo envía inmediatamente por email.
 * Nunca se guarda el token en texto plano más allá de esta llamada (ya lo
 * garantiza `createActivationInvitation`) y nunca se devuelve al llamador —
 * esta función no retorna el token, solo si la operación tuvo éxito.
 *
 * Si el envío de email falla, la invitación recién creada se revoca de
 * inmediato (nunca queda un token entregable "flotando" sin que nadie lo
 * haya recibido) y se permite reintentar — el próximo llamado a esta misma
 * función revoca cualquier pendiente previa y emite una nueva (mismo
 * mecanismo que ya usa `createActivationInvitation` para no duplicar
 * invitaciones activas).
 */
async function issueAndSendActivationInvitation(
  params: CreateActivationInvitationParams,
): Promise<{ success: boolean }> {
  const result = await createActivationInvitation(params);

  try {
    await sendActivationEmail({ email: result.email, token: result.token });
  } catch (error) {
    const admin = createAdminClient();
    await admin
      .from("account_activation_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", result.invitationId)
      .eq("status", "pending");

    if (error instanceof EmailDeliveryError) {
      logServerError("issueAndSendActivationInvitation:email_failed", { invitationId: result.invitationId });
    } else {
      logServerError("issueAndSendActivationInvitation:unexpected_error", error);
    }

    return { success: false };
  }

  console.log("[account-activation] invitation_sent", { invitationId: result.invitationId });
  return { success: true };
}

export {
  createActivationInvitation,
  issueAndSendActivationInvitation,
  validateActivationToken,
  activateAccount,
  consumeActivationInvitationForOAuthUser,
};
