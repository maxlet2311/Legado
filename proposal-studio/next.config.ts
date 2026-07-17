import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El motor de PDF (src/lib/render/pdf.ts) usa react-dom/server.node fuera
  // del árbol de RSC y depende de los binarios nativos de Puppeteer/Chromium:
  // deben resolverse como módulos externos de Node en runtime, no bundlearse
  // (bundlearlos aplica la condición "react-server" y rompe react-dom/server).
  serverExternalPackages: ["react-dom", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  // El binario de Chromium (@sparticuz/chromium/bin/*.br) nunca se importa
  // desde JS (se resuelve en runtime vía `chromium.executablePath()`), así
  // que el output file tracing de Vercel no lo detecta solo y lo deja afuera
  // del bundle serverless — causa "The input directory .../bin does not
  // exist" en producción. Se incluye explícitamente solo para la función que
  // lo necesita (nunca para las demás: son ~67MB comprimidos).
  outputFileTracingIncludes: {
    "/api/proposal-versions/[versionId]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  // Sprint 4 (hardening): headers de seguridad base, sin CSP. El checkout de
  // Mercado Pago es un redirect a un dominio propio de MP (nunca un iframe
  // embebido — ver src/lib/payments/checkout.ts), así que X-Frame-Options no
  // rompe ese flujo. No se agrega Content-Security-Policy: requeriría
  // permitir explícitamente los dominios de Supabase/Resend/Mercado Pago y
  // el patrón de hydration/inline styles de Next.js, y un CSP mal calibrado
  // rompe silenciosamente en producción sin aviso — queda como pendiente
  // documentado (ver informe de Sprint 4) para calibrarlo con pruebas
  // dedicadas, no para agregarlo a ciegas acá.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
