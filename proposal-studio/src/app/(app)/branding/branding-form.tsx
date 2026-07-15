"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleCheck, Loader2, UploadCloud } from "lucide-react";

import { saveBrandAction } from "@/lib/branding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/database/types";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Usá un color HEX válido (ej. #596B4D).");

const brandFormSchema = z.object({
  commercial_name: z.string().trim().min(1, "El nombre comercial es obligatorio."),
  advisor_name: z.string().trim().min(1, "El nombre del asesor es obligatorio."),
  license_number: z.string().trim().optional(),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  footer_text: z.string().trim().optional(),
  primary_color: hexColor,
  secondary_color: hexColor,
  accent_color: hexColor,
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

type BrandSummary = Pick<
  Tables<"brands">,
  | "id"
  | "commercial_name"
  | "advisor_name"
  | "license_number"
  | "logo_url"
  | "primary_color"
  | "secondary_color"
  | "accent_color"
  | "email"
  | "phone"
  | "whatsapp"
  | "website"
  | "address"
  | "footer_text"
  | "signature_image"
>;

interface BrandingFormProps {
  brand: BrandSummary | null;
  /** Signed URL de corta duración ya resuelta en servidor (bucket privado). */
  initialSignaturePreviewUrl: string | null;
}

function BrandingForm({ brand, initialSignaturePreviewUrl }: BrandingFormProps) {
  const [serverError, setServerError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [logoPreview, setLogoPreview] = useState<string | null>(brand?.logo_url ?? null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(initialSignaturePreviewUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Revoca cualquier object URL creado localmente (blob:) al desmontar. Las
  // URLs remotas (logo_url público, signed URL de firma) no son object URLs
  // y no deben revocarse.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      commercial_name: brand?.commercial_name ?? "",
      advisor_name: brand?.advisor_name ?? "",
      license_number: brand?.license_number ?? "",
      email: brand?.email ?? "",
      phone: brand?.phone ?? "",
      whatsapp: brand?.whatsapp ?? "",
      website: brand?.website ?? "",
      address: brand?.address ?? "",
      footer_text: brand?.footer_text ?? "",
      primary_color: brand?.primary_color ?? "#596B4D",
      secondary_color: brand?.secondary_color ?? "#F6F2E9",
      accent_color: brand?.accent_color ?? "#C49752",
    },
  });

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview((previous) => {
      if (previous && objectUrlsRef.current.has(previous)) {
        URL.revokeObjectURL(previous);
        objectUrlsRef.current.delete(previous);
      }
      const next = URL.createObjectURL(file);
      objectUrlsRef.current.add(next);
      return next;
    });
  }

  function handleSignatureChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview((previous) => {
      if (previous && objectUrlsRef.current.has(previous)) {
        URL.revokeObjectURL(previous);
        objectUrlsRef.current.delete(previous);
      }
      const next = URL.createObjectURL(file);
      objectUrlsRef.current.add(next);
      return next;
    });
  }

  function onSubmit(values: BrandFormValues) {
    setServerError(undefined);
    setSuccess(false);

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value ?? "");
    }
    if (logoFile) formData.set("logo", logoFile);
    if (signatureFile) formData.set("signature", signatureFile);

    startTransition(async () => {
      const result = await saveBrandAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Identidad comercial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commercial_name">Nombre comercial</Label>
            <Input id="commercial_name" placeholder="Broker o agencia" {...register("commercial_name")} />
            {errors.commercial_name && (
              <p className="text-small text-error">{errors.commercial_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="advisor_name">Nombre del asesor</Label>
            <Input id="advisor_name" placeholder="Ariel Marcos" {...register("advisor_name")} />
            {errors.advisor_name && (
              <p className="text-small text-error">{errors.advisor_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="license_number">Matrícula</Label>
            <Input id="license_number" placeholder="N° de matrícula" {...register("license_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email comercial</Label>
            <Input id="email" type="email" placeholder="contacto@estudio.com" {...register("email")} />
            {errors.email && <p className="text-small text-error">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="+54 11 0000-0000" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" placeholder="+54 9 11 0000-0000" {...register("whatsapp")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Sitio web</Label>
            <Input id="website" placeholder="https://" {...register("website")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Oficina o estudio" {...register("address")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="footer_text">Texto legal de pie de página</Label>
            <Input id="footer_text" placeholder="Texto institucional fijo" {...register("footer_text")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo y firma</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant p-10 text-center transition-colors hover:border-primary">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="h-16 max-w-full object-contain" />
            ) : (
              <UploadCloud className="h-6 w-6 text-outline" />
            )}
            <p className="text-small text-on-surface-variant">Logo (SVG, PNG o WebP)</p>
            <input type="file" accept=".svg,.png,.webp" className="hidden" onChange={handleLogoChange} />
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-outline-variant p-10 text-center transition-colors hover:border-primary">
            {signaturePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signaturePreview} alt="Firma" className="h-16 max-w-full object-contain" />
            ) : (
              <UploadCloud className="h-6 w-6 text-outline" />
            )}
            <p className="text-small text-on-surface-variant">Firma (PNG o SVG, fondo transparente)</p>
            <input
              type="file"
              accept=".svg,.png"
              className="hidden"
              onChange={handleSignatureChange}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paleta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-8">
          {(
            [
              { key: "primary_color", label: "Primary" },
              { key: "secondary_color", label: "Secondary" },
              { key: "accent_color", label: "Accent" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <input
                type="color"
                className="h-16 w-16 cursor-pointer rounded-md border border-outline-variant"
                {...register(key)}
              />
              <span className="text-caption text-on-surface-variant">{label}</span>
              {errors[key] && <p className="text-caption text-error">{errors[key]?.message}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {serverError && (
        <p className="rounded-md bg-error-container px-4 py-3 text-small text-error">{serverError}</p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-md bg-primary-container/40 px-4 py-3 text-small text-on-surface">
          <CircleCheck className="h-4 w-4 text-primary" /> Cambios guardados correctamente.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

export { BrandingForm };
