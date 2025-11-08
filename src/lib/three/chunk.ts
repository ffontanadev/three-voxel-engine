/**
 * chunk.ts - Utilidades para Gestión de Chunks
 *
 * Módulo que proporciona funciones para indexar y generar chunks de voxels.
 */

import { Block } from './block_types';

/**
 * Indexador 3D a 1D para un grid cúbico de tamaño CHUNK³.
 *
 * Convierte coordenadas 3D (x, y, z) a un índice lineal en un array 1D.
 * Layout: x + y*CHUNK + z*CHUNK² (Y-up, Z-forward)
 *
 * @param x Coordenada X (0 a CHUNK-1)
 * @param y Coordenada Y (0 a CHUNK-1)
 * @param z Coordenada Z (0 a CHUNK-1)
 * @param CHUNK Tamaño del chunk
 * @returns Índice 1D en el rango [0, CHUNK³-1]
 */
export const idx = (x: number, y: number, z: number, CHUNK: number) =>
  x + y * CHUNK + z * CHUNK * CHUNK;

/**
 * Crea y rellena un chunk CHUNK³ con un bloque inicial.
 *
 * @param CHUNK Tamaño del chunk (lado del cubo)
 * @param fill Tipo de bloque para rellenar todo el chunk
 * @returns Uint8Array de tamaño CHUNK³ lleno con el bloque especificado
 */
export function generateChunk(CHUNK: number, fill: Block): Uint8Array {
  return new Uint8Array(CHUNK * CHUNK * CHUNK).fill(fill);
}
