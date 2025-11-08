/**
 * page.tsx - Página Principal de la Aplicación
 *
 * Componente Home de Next.js que renderiza el motor de voxels 3D
 * con overlays de instrucciones e información de rendimiento.
 *
 * Estructura:
 * - Canvas 3D a pantalla completa (WorldCanvas)
 * - Overlay superior izquierdo: instrucciones de controles
 * - Overlay superior derecho: información técnica
 */

'use client';
import { WorldCanvas } from '@/components/WorldCanvas';

/**
 * Componente principal de la página Home.
 *
 * Renderiza:
 * 1. Canvas 3D del mundo de voxels (posición absoluta, inset-0)
 * 2. Instrucciones de control con fondo semi-transparente
 * 3. Información de características técnicas
 *
 * Controles disponibles:
 * - Click: Activar pointer lock (controles FPS)
 * - WASD: Movimiento horizontal
 * - Espacio: Ascender
 * - Shift: Descender
 * - Mouse: Mirar alrededor (cuando pointer lock está activo)
 * - ESC: Salir de pointer lock
 */
export default function Home() {
  return (
    <main className="h-screen w-screen relative">
      {/* Canvas 3D del mundo de voxels - cubre toda la pantalla */}
      <WorldCanvas className="absolute inset-0" />

      {/* Overlay de instrucciones - superior izquierdo */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm">
        <h2 className="text-lg font-bold mb-2">Voxel World Engine</h2>
        <div className="text-sm space-y-1">
          <p><strong>Click</strong> to enable mouse look</p>
          <p><strong>WASD</strong> - Move around</p>
          <p><strong>Space</strong> - Move up</p>
          <p><strong>Shift</strong> - Move down</p>
          <p><strong>Mouse</strong> - Look around</p>
        </div>
      </div>

      {/* Overlay de información técnica - superior derecho */}
      <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
        <p>Procedural terrain generation</p>  {/* Generación procedural con Perlin noise */}
        <p>Infinite chunk streaming</p>       {/* Carga dinámica de chunks según posición */}
        <p>Instanced rendering</p>            {/* Optimización GPU mediante instancias */}
      </div>
    </main>
  );
}
