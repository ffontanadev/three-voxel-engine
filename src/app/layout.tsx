/**
 * layout.tsx - Layout Raíz de la Aplicación Next.js
 *
 * Componente RootLayout que define la estructura HTML base
 * y metadatos de la aplicación.
 */

import type { Metadata } from 'next'
import './globals.css'

/**
 * Metadatos de la aplicación para SEO y previsualizaciones
 */
export const metadata: Metadata = {
  title: 'Voxel World Engine',
  description: 'A 3D voxel world renderer with procedural terrain generation and chunk streaming',
}

/**
 * Layout raíz de la aplicación Next.js.
 *
 * Estructura HTML base:
 * - lang="en": Idioma inglés (para accesibilidad)
 * - body: Fondo negro, texto blanco, sin scroll (overflow-hidden)
 *
 * Todos los componentes hijos se renderizan dentro de este layout.
 *
 * @param children Componentes hijos a renderizar (típicamente page.tsx)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  )
}
