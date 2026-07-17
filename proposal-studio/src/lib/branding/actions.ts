"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError } from "@/lib/utils/errors";
import type { TablesInsert } from "@/lib/database/types";

interface ActionResult {
  error?: string;
  success?: boolean;
}

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Usá un color HEX válido (ej. #596B4D).");

const brandSchema = z.object({
  commercial_name: z.string().trim().min(1, "El nombre comercial es obligatorio."),
  advisor_name: z.string().trim().min(1, "El nombre del asesor es obligatorio."),
  license_number: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  footer_text: z.string().trim().optional().or(z.literal("")),
  primary_color: hexColor,
  secondary_color: hexColor,
  accent_color: hexColor,
});

const ALLOWED_LOGO_TYPES = ["image/svg+xml", "image/png", "image/webp"];
const ALLOWED_SIGNATURE_TYPES = ["image/svg+xml", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type UploadResult = { success: true; path: string } | { success: false; error: string };

async function uploadBrandAsset(
  bucket: "brand-assets" | "signatures",
  userId: string,
  file: File,
  allowedTypes: string[],
): Promise<UploadResult> {
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Formato de archivo no permitido." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "El archivo supera el tamaño máximo permitido (5 MB)." };
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop();
  const path = `${userId}/${bucket === "brand-assets" ? "logo" : "signature"}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });

  if (error) {
    return { success: false, error: "No pudimos subir el archivo. Intentá de nuevo." };
  }

  return { success: true, path };
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

async function saveBrandAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "branding.save" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = brandSchema.safeParse({
    commercial_name: formData.get("commercial_name"),
    advisor_name: formData.get("advisor_name"),
    license_number: formData.get("license_number"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    website: formData.get("website"),
    address: formData.get("address"),
    footer_text: formData.get("footer_text"),
    primary_color: formData.get("primary_color"),
    secondary_color: formData.get("secondary_color"),
    accent_color: formData.get("accent_color"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const updates: TablesInsert<"brands"> = { ...parsed.data, user_id: user.id };

  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    const result = await uploadBrandAsset("brand-assets", user.id, logoFile, ALLOWED_LOGO_TYPES);
    if (!result.success) return { error: result.error };
    updates.logo_url = supabase.storage.from("brand-assets").getPublicUrl(result.path).data.publicUrl;
  }

  const signatureFile = formData.get("signature") as File | null;
  if (signatureFile && signatureFile.size > 0) {
    const result = await uploadBrandAsset("signatures", user.id, signatureFile, ALLOWED_SIGNATURE_TYPES);
    if (!result.success) return { error: result.error };
    // El bucket "signatures" es privado (dato sensible): se guarda el path
    // interno, no una URL. La UI resuelve una signed URL de corta duración
    // recién al momento de mostrar la preview (ver getSignaturePreviewUrl).
    updates.signature_image = result.path;
  }

  const { error } = await supabase.from("brands").upsert(updates, { onConflict: "user_id" });

  if (error) {
    return { error: mapSupabaseError(error) };
  }

  revalidatePath("/branding");
  return { success: true };
}

/**
 * Genera una signed URL de corta duración para previsualizar la firma
 * guardada. `signature_image` almacena el path interno del bucket privado
 * `signatures`, nunca una URL pública.
 */
async function getSignaturePreviewUrl(path: string): Promise<string | null> {
  const guard = await requireActiveMembershipForAction({ surface: "branding.signature_preview" });
  if (!guard.ok) return null;
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from("signatures")
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

  return data?.signedUrl ?? null;
}

export { saveBrandAction, getSignaturePreviewUrl };
