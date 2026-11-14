import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "OpenAI Reto Correos",
  description: "Sube los CSV del evento y envía a cada asistente el reto para armar el QR de sus créditos de ChatGPT.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="aurora" aria-hidden />
        <div className="grid-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
