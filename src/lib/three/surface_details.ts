/**
 * surface_details.ts - Generación de Detalles de Terreno
 *
 * Módulo que proporciona funciones para modificar chunks de voxels aplicando
 * efectos de terreno procedural mediante ruido de Perlin.
 *
 * Funcionalidades:
 * - TerrainRelief: Genera heightmaps, cuevas 3D o heightmaps invertidos
 * - PaintLayer: Pinta capas de bloques en la superficie (césped, tierra, etc.)
 *
 * Estos efectos se aplican después de llenar el chunk con un bloque base,
 * creando terrenos naturales y variados.
 */

import { idx } from './chunk';
import { makeNoise } from './perlin';
import { Block } from './block_types';

/**
 * Opciones para la generación de relieve de terreno
 */
type ReliefOptions = {
  scale?: number;       // Escala del ruido (valores menores = terreno más suave)
  threshold?: number;   // Umbral para corte de bloques en modo 3D (0-1)
  mode?: 'surface' | '3d' | 'reverse-surface'; // Modo de generación
  fill?: Block;         // Tipo de bloque para rellenar el vacío
};

/**
 * Aplica relieve de terreno a un chunk usando ruido de Perlin.
 *
 * Modos disponibles:
 * - 'surface': Heightmap 2D - genera colinas y valles eliminando bloques por encima
 *   de una altura calculada con ruido. Ideal para terreno principal.
 *
 * - '3d': Cuevas volumétricas - usa ruido 3D para crear sistemas de cuevas.
 *   Elimina bloques donde el ruido supera el umbral. Perfecto para cuevas naturales.
 *
 * - 'reverse-surface': Heightmap invertido - elimina bloques por debajo de una altura.
 *   Útil para generar techos o estructuras flotantes.
 *
 * @param grid Array de bloques del chunk (se modifica in-place)
 * @param CHUNK Tamaño del chunk (típicamente 16)
 * @param options Opciones de configuración del relieve
 */
export function TerrainRelief(grid: Uint8Array, CHUNK: number, options: ReliefOptions = {}) {
  const {
    scale = 0.1,              // Escala por defecto: terreno moderadamente detallado
    threshold = 0.5,          // Umbral medio: 50% de bloques removidos en modo 3D
    mode = 'surface',         // Por defecto: heightmap de superficie
    fill = Block.Air,         // Por defecto: rellenar con aire
  } = options;

  // Generar función de ruido con semilla aleatoria
  const noise = makeNoise(Math.random());

  // --- Modo Surface: Heightmap 2D ---
  // Genera un terreno con alturas variables usando ruido 2D
  if (mode === 'surface') {
    for (let x = 0; x < CHUNK; x++) {
      for (let z = 0; z < CHUNK; z++) {
        // Samplear ruido en el plano XZ
        const heightNoise = noise(x * scale, z * scale);
        const maxY = Math.floor(heightNoise * CHUNK); // Convertir [0,1] a [0,CHUNK]

        // Eliminar todos los bloques por encima de la altura calculada
        for (let y = CHUNK - 1; y > maxY; y--) {
          grid[idx(x, y, z, CHUNK)] = fill;
        }
      }
    }
  }

  // --- Modo Reverse-Surface: Heightmap invertido ---
  // Elimina bloques por debajo de una altura, creando plataformas o techos
  if (mode === 'reverse-surface') {
    for (let x = 0; x < CHUNK; x++) {
      for (let z = 0; z < CHUNK; z++) {
        // Samplear ruido en el plano XZ
        const heightNoise = noise(x * scale, z * scale);
        const minY = Math.floor(heightNoise * CHUNK);

        // Eliminar todos los bloques por debajo de la altura calculada
        for (let y = 0; y < minY; y++) {
          grid[idx(x, y, z, CHUNK)] = fill;
        }
      }
    }
  }

  // --- Modo 3D: Cuevas volumétricas ---
  // Usa ruido 3D para crear sistemas de cuevas naturales
  if (mode === '3d') {
    for (let x = 0; x < CHUNK; x++) {
      for (let y = 0; y < CHUNK; y++) {
        for (let z = 0; z < CHUNK; z++) {
          // Samplear ruido volumétrico en el espacio 3D
          const n = noise(x * scale, y * scale, z * scale);

          // Si el ruido supera el umbral, crear un hueco (cueva)
          if (n > threshold) {
            grid[idx(x, y, z, CHUNK)] = fill;
          }
        }
      }
    }
  }
}

/**
 * Reemplaza los N bloques superiores sólidos en cada columna (x,z) del chunk.
 * Útil para pintar capas de superficie como césped, tierra, arena, etc.
 *
 * Modos de pintado:
 * - 'contiguous': Reemplaza bloques contiguos desde arriba mientras coincidan con 'from'.
 *   Se detiene al encontrar un bloque diferente. Ideal para césped que solo debe
 *   estar en la capa superior.
 *
 * - 'any': Reemplaza los N bloques superiores que coincidan con 'from' (o cualquier
 *   sólido si from=null), incluso si hay bloques intermedios diferentes. Ideal para
 *   tierra que debe penetrar más profundo.
 *
 * @param voxels Array de bloques (Uint16Array o number[], se modifica in-place)
 * @param size Tamaño del chunk
 * @param from Tipo de bloque a reemplazar (null = cualquier bloque sólido)
 * @param to Tipo de bloque destino (ej: Block.Grass)
 * @param depth Cuántos bloques reemplazar desde arriba (default: 3)
 * @param layout Layout de memoria: 'xzy' (default) o 'xyz'
 * @param mode Modo de pintado: 'contiguous' (default) o 'any'
 */
export function PaintLayer(
  voxels: Uint16Array | number[],
  size: number,
  from: Block | null,
  to: Block,
  depth = 3,
  layout: 'xzy' | 'xyz' = 'xzy',
  mode: 'contiguous' | 'any' = 'contiguous'
) {
  // Funciones de indexación según el layout de memoria
  const idx_xzy = (x: number, y: number, z: number) => x + z * size + y * size * size;
  const idx_xyz = (x: number, y: number, z: number) => x + y * size + z * size * size;
  const IDX = layout === 'xzy' ? idx_xzy : idx_xyz;

  // Helpers para determinar si un bloque está vacío o coincide con el filtro
  const isEmpty = (v: any) => v === 0 || v === Block.Air || v == null;
  const matches = (v: any) => (from == null ? true : v === from);

  // Iterar cada columna (x, z) del chunk
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      // --- Paso 1: Encontrar el bloque sólido más alto en la columna ---
      let y = size - 1;
      while (y >= 0 && isEmpty(voxels[IDX(x, y, z)])) y--;
      if (y < 0) continue; // Columna completamente vacía, saltar

      // --- Paso 2: Reemplazar hasta 'depth' bloques hacia abajo desde el tope ---
      let replaced = 0;
      while (y >= 0 && replaced < depth) {
        const i = IDX(x, y, z);
        const b = voxels[i];

        // Verificar si encontramos aire (no debería pasar, pero manejo defensivo)
        if (isEmpty(b)) break;

        if (mode === 'contiguous') {
          // Modo contiguous: detener si el bloque no coincide con 'from'
          if (!matches(b)) break;
          voxels[i] = to;  // Reemplazar y continuar
          replaced++;
          y--;
        } else {
          // Modo 'any': reemplazar si coincide (o from == null), pero siempre avanzar
          if (matches(b)) {
            voxels[i] = to;
            replaced++;
          }
          y--; // Siempre descender en modo 'any'
        }
      }
    }
  }
}
