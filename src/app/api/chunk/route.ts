/**
 * route.ts - API Endpoint de Generación de Chunks
 *
 * Endpoint del servidor Next.js que genera chunks de voxels de forma determinista
 * utilizando ruido de Perlin para crear terrenos con cuevas, heightmaps y capas de bloques.
 *
 * Características:
 * - Generación procedural determinista basada en coordenadas y semilla
 * - Caché de 1 año con Next.js unstable_cache
 * - Soporte de ETag para respuestas condicionales (304 Not Modified)
 * - Retorna datos binarios compactos (Uint8Array) para minimizar transferencia
 * - Configurable: tamaño de chunk, escalas de ruido, profundidad de capas
 */

import { NextRequest } from 'next/server';
import { unstable_cache as cache } from 'next/cache';
import { Block } from '@/lib/three/block_types';
import { makeNoise } from '@/lib/three/perlin';

// Runtime de Node.js para acceso completo a APIs del servidor
export const runtime = 'nodejs';

// --- Configuración de caché ---
// Caché inmutable de 1 año - ideal para contenido determinista con hash
const ONE_YEAR = 31536000;
const CACHE_CONTROL = `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable`;

/**
 * Parámetros de generación del chunk
 */
type Params = {
  size: number;           // Tamaño del chunk (4-128, típicamente 16)
  seed: string;           // Semilla para generación determinista
  base: number;           // ID del bloque base (típicamente piedra)
  cx: number;             // Coordenada X del chunk en el grid mundial
  cy: number;             // Coordenada Y del chunk en el grid mundial
  cz: number;             // Coordenada Z del chunk en el grid mundial
  // Parámetros de terreno
  surfaceScale: number;   // Escala del ruido de superficie (heightmap)
  cavesScale: number;     // Escala del ruido de cuevas 3D
  cavesThreshold: number; // Umbral para generar cuevas (0-1, mayor = menos cuevas)
  grassDepth: number;     // Profundidad de capa de césped
  dirtDepth: number;      // Profundidad de capa de tierra
};

/**
 * Parsea y valida los parámetros de la query string
 * @param req Request de Next.js con searchParams
 * @returns Parámetros validados y normalizados
 */
function parseParams(req: NextRequest): Params {
  const sp = req.nextUrl.searchParams;

  // Limitar tamaño del chunk entre 4 y 128 para evitar chunks excesivos
  const size = Math.max(4, Math.min(128, Number(sp.get('size') ?? 64) | 0));
  const seed = (sp.get('seed') ?? 'seed').toString();
  const base = Number(sp.get('base') ?? Block.Stone) | 0;

  // Coordenadas del chunk en el espacio mundial
  const cx = Number(sp.get('cx') ?? 0) | 0;
  const cy = Number(sp.get('cy') ?? 0) | 0;
  const cz = Number(sp.get('cz') ?? 0) | 0;

  // Parámetros de generación de terreno con valores por defecto
  const surfaceScale = Number(sp.get('surfaceScale') ?? 0.04);
  const cavesScale = Number(sp.get('cavesScale') ?? 0.16);
  const cavesThreshold = Number(sp.get('cavesThreshold') ?? 0.72);
  const grassDepth = Number(sp.get('grassDepth') ?? 2);
  const dirtDepth = Number(sp.get('dirtDepth') ?? 3);

  return { size, seed, base, cx, cy, cz, surfaceScale, cavesScale, cavesThreshold, grassDepth, dirtDepth };
}

/**
 * Hash determinista simple de string a entero de 32 bits sin signo.
 * Usa el algoritmo FNV-1a para distribución uniforme.
 *
 * @param str String a hashear
 * @returns Hash de 32 bits sin signo
 */
function hash32(str: string): number {
  let h = 2166136261 >>> 0; // Offset basis de FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619); // Prime de FNV
  }
  return h >>> 0;
}

/**
 * Mezcla múltiples enteros en un hash de 32 bits determinista.
 * Útil para combinar coordenadas y semillas en una única seed de ruido.
 *
 * @param nums Números a mezclar
 * @returns Hash combinado de 32 bits
 */
function mix(...nums: number[]) {
  let h = 0x811c9dc5 >>> 0; // FNV offset basis
  for (const n of nums) {
    let x = n >>> 0;
    // MurmurHash3 finalizer para buena distribución
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    h ^= x;
  }
  return h >>> 0;
}

/**
 * Convierte un entero de 32 bits a un float en el rango [0, 1)
 * para usar como semilla en el generador de ruido de Perlin.
 *
 * @param u32 Entero de 32 bits sin signo
 * @returns Float en rango [0, 1)
 */
function toUnitFloat(u32: number) {
  return (u32 & 0x7ffffff) / 0x8000000; // Usar 27 bits de mantissa
}

/**
 * Generador central de chunks en el servidor.
 * Replica la lógica del cliente pero con seeding determinista y offsets mundiales.
 *
 * Proceso:
 * 1. Llenar todo el chunk con bloque base (piedra)
 * 2. Aplicar heightmap de superficie usando ruido 2D
 * 3. Generar cuevas 3D usando ruido volumétrico
 * 4. Pintar capas de césped y tierra en la superficie
 *
 * @param params Parámetros de generación
 * @returns Grid 3D de bloques como Uint8Array (índices de 0-255)
 */
function generateChunkServer(params: Params): Uint8Array {
  const { size: S, seed, base, cx, cy, cz, surfaceScale, cavesScale, cavesThreshold, grassDepth, dirtDepth } = params;

  // Calcular offset del chunk en el espacio mundial
  // Esto asegura que chunks vecinos tengan terreno continuo
  const ox = cx * S;
  const oy = cy * S;
  const oz = cz * S;

  // Crear seeds de ruido deterministas combinando la semilla del mundo con las coordenadas
  const baseHash = hash32(seed);
  const noiseSeed1 = toUnitFloat(mix(baseHash, ox, oy, oz, 0xA1));
  const noiseSeed2 = toUnitFloat(mix(baseHash ^ 0x9e3779b9, ox, oy, oz, 0xB2));

  // Generadores de ruido independientes para superficie y cuevas
  const surfaceNoise = makeNoise(noiseSeed1);
  const cavesNoise = makeNoise(noiseSeed2);

  // Asignar grid 3D y llenar con bloque base
  const total = S * S * S;
  const grid = new Uint8Array(total);
  grid.fill(base);

  /**
   * Indexador 3D a 1D: convierte coordenadas (x, y, z) a índice lineal
   * Layout: x + y*S + z*S² (Y-up, Z-forward)
   */
  const IDX = (x: number, y: number, z: number) => x + y * S + z * S * S;

  // --- Fase 1: Heightmap de superficie ---
  // Genera un mapa de alturas 2D y elimina bloques por encima del terreno
  for (let x = 0; x < S; x++) {
    for (let z = 0; z < S; z++) {
      // Samplear ruido en coordenadas mundiales
      const h = surfaceNoise((x + ox) * surfaceScale, (z + oz) * surfaceScale);
      const maxY = Math.floor(h * S); // Convertir ruido [0,1] a altura [0,S]

      // Eliminar bloques por encima del terreno (aire)
      for (let y = S - 1; y > maxY; y--) {
        grid[IDX(x, y, z)] = Block.Air;
      }
    }
  }

  // --- Fase 2: Generación de cuevas 3D ---
  // Usa ruido volumétrico para crear sistemas de cuevas
  for (let x = 0; x < S; x++) {
    for (let y = 0; y < S; y++) {
      for (let z = 0; z < S; z++) {
        // Samplear ruido 3D en coordenadas mundiales
        const n = cavesNoise((x + ox) * cavesScale, (y + oy) * cavesScale, (z + oz) * cavesScale);

        // Si el ruido supera el umbral, crear aire (cueva)
        if (n > cavesThreshold) grid[IDX(x, y, z)] = Block.Air;
      }
    }
  }

  // --- Fase 3: Pintar capas de bloques (césped y tierra) ---

  /**
   * Reemplaza los N bloques superiores contiguos que coincidan con 'from' por 'to'.
   * Se detiene si encuentra aire o un bloque diferente de 'from'.
   * Ideal para césped que solo debe aparecer en la superficie.
   *
   * @param from Tipo de bloque a reemplazar (típicamente piedra)
   * @param to Tipo de bloque destino (típicamente césped)
   * @param depth Profundidad de la capa
   */
  const replaceTopContiguous = (from: number, to: number, depth: number) => {
    for (let x = 0; x < S; x++) {
      for (let z = 0; z < S; z++) {
        // Encontrar el bloque sólido más alto
        let y = S - 1;
        while (y >= 0 && grid[IDX(x, y, z)] === Block.Air) y--;

        // Reemplazar hasta N bloques contiguos que sean del tipo 'from'
        let replaced = 0;
        while (y >= 0 && replaced < depth) {
          const i = IDX(x, y, z);
          const b = grid[i];
          if (b === Block.Air) break;  // Parar si encuentra aire
          if (b !== from) break;        // Parar si encuentra otro tipo de bloque
          grid[i] = to & 0xff;
          replaced++; y--;
        }
      }
    }
  };

  /**
   * Reemplaza los N bloques superiores que coincidan con 'from' (o cualquier sólido si from=null).
   * Continúa hacia abajo incluso si encuentra bloques intermedios diferentes.
   * Ideal para tierra que debe aparecer bajo el césped.
   *
   * @param from Tipo de bloque a reemplazar (null = cualquier sólido)
   * @param to Tipo de bloque destino (típicamente tierra)
   * @param depth Profundidad de la capa
   */
  const replaceTopAny = (from: number | null, to: number, depth: number) => {
    for (let x = 0; x < S; x++) {
      for (let z = 0; z < S; z++) {
        // Encontrar el bloque sólido más alto
        let y = S - 1;
        while (y >= 0 && grid[IDX(x, y, z)] === Block.Air) y--;

        // Reemplazar hasta N bloques que cumplan la condición
        let replaced = 0;
        while (y >= 0 && replaced < depth) {
          const i = IDX(x, y, z);
          const b = grid[i];
          if (b !== Block.Air && (from == null || b === from)) {
            grid[i] = to & 0xff;
            replaced++;
          }
          y--;
        }
      }
    }
  };

  // Aplicar capas: primero césped (contiguos), luego tierra (cualquier sólido)
  if (grassDepth > 0) replaceTopContiguous(base, Block.Grass, grassDepth | 0);
  if (dirtDepth > 0) replaceTopAny(base, Block.Dirt, dirtDepth | 0);

  return grid;
}

/**
 * Wrapper de caché para la generación de chunks.
 * Usa Next.js unstable_cache para almacenar resultados por 1 año.
 */
const getChunkCached = cache(
  async (params: Params) => {
    const grid = generateChunkServer(params);
    return grid; // Retorna Uint8Array
  },
  ['chunk-gen'],
  { revalidate: ONE_YEAR, tags: ['chunk-gen'] }
);

/**
 * Genera una clave de caché única basada en todos los parámetros de generación.
 * Crucial para asegurar que chunks con diferentes parámetros no compartan caché.
 *
 * @param p Parámetros del chunk
 * @returns String único que representa la configuración completa
 */
function keyOf(p: Params) {
  return `${p.size}|${p.seed}|${p.base}|${p.cx}|${p.cy}|${p.cz}|${p.surfaceScale}|${p.cavesScale}|${p.cavesThreshold}|${p.grassDepth}|${p.dirtDepth}`;
}

/**
 * Handler GET del endpoint /api/chunk
 *
 * Proceso:
 * 1. Parsear y validar parámetros de query
 * 2. Generar o recuperar chunk cacheado
 * 3. Calcular ETag determinista para soporte de caché condicional
 * 4. Retornar datos binarios con headers de caché agresivo
 *
 * @param req Request de Next.js
 * @returns Response con datos binarios del chunk o 304 Not Modified
 */
export async function GET(req: NextRequest) {
  try {
    const params = parseParams(req);

    // Generar clave estable para caché (incluye todos los parámetros)
    const cacheKey = keyOf(params);
    const data = await getChunkCached(params);
    const bufferedData = Buffer.from(data);

    // Calcular ETag débil basado en la clave (determinista)
    const etag = `W/"${hash32(cacheKey).toString(16)}-${params.size}"`;

    // Soporte de request condicional: retornar 304 si el cliente ya tiene este chunk
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: { 'Cache-Control': CACHE_CONTROL, ETag: etag } });
    }

    // Retornar datos binarios compactos del chunk
    return new Response(bufferedData, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream', // Datos binarios
        'Cache-Control': CACHE_CONTROL,              // Caché de 1 año
        'ETag': etag,                                // Para validación condicional
        'X-Chunk-Size': String(params.size),         // Header custom para debugging
      },
    });
  } catch (err: any) {
    // En caso de error, retornar 500 con detalles
    return new Response(JSON.stringify({ error: err?.message ?? 'error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
