import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El motor de PDF (src/lib/render/pdf.ts) usa react-dom/server.node fuera
  // del árbol de RSC y depende de los binarios nativos de Puppeteer/Chromium:
  // deben resolverse como módulos externos de Node en runtime, no bundlearse
  // (bundlearlos aplica la condición "react-server" y rompe react-dom/server).
  serverExternalPackages: ["react-dom", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
