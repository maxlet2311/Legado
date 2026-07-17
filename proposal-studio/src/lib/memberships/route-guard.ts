import "server-only";

import { NextResponse } from "next/server";

import { requireActiveMembership } from "@/lib/memberships/guard";
import type { ActiveMembershipContext, RequireActiveMembershipOptions } from "@/lib/memberships/guard";
import { MembershipGuardError } from "@/lib/memberships/guard-errors";
import { mapMembershipErrorToHttpResponse } from "@/lib/memberships/error-mapper";

type MembershipRouteGuardOutcome = { context: ActiveMembershipContext; response?: undefined } | { response: NextResponse; context?: undefined };

/**
 * Envoltorio de `requireActiveMembership` para Route Handlers (Etapa 5,
 * sección 4/9): nunca redirige — devuelve un `NextResponse` con el código
 * HTTP tipado correspondiente (`402`/`403`/`409`/`503`, ver
 * `error-mapper.ts`) para que el llamador lo retorne tal cual.
 */
async function requireActiveMembershipForRoute(
  options: RequireActiveMembershipOptions = {},
): Promise<MembershipRouteGuardOutcome> {
  try {
    const context = await requireActiveMembership(options);
    return { context };
  } catch (error) {
    if (!(error instanceof MembershipGuardError)) {
      throw error;
    }
    const { status, error: message, code } = mapMembershipErrorToHttpResponse(error);
    return { response: NextResponse.json({ error: message, code }, { status }) };
  }
}

export { requireActiveMembershipForRoute };
export type { MembershipRouteGuardOutcome };
