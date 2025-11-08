/**
 * block_types.ts - Definiciones de Tipos de Bloques
 *
 * Módulo que define el enum de bloques y el tipo de configuración mundial
 * para el motor de voxels.
 */

import * as THREE from 'three';

/**
 * Enum de todos los tipos de bloques disponibles en el motor.
 *
 * Cada bloque tiene un ID numérico único usado para almacenar chunks
 * de forma compacta (Uint8Array).
 *
 * Para agregar un nuevo bloque:
 * 1. Agregar aquí en el enum
 * 2. Agregar definición de material en block_defs.ts
 * 3. Agregar manejo en buildInstancedChunk() en instancing.ts
 */
export enum Block {
  Air = 0,            // Bloque vacío (no se renderiza)
  Grass = 1,          // Bloque de césped
  Dirt = 2,           // Bloque de tierra
  Stone = 3,          // Bloque de piedra (base del mundo)
  RedFlower = 4,      // Flor roja
  OrangeFlower = 5,   // Flor naranja
  PinkFlower = 6,     // Flor rosa
  WhiteFlower = 7,    // Flor blanca
  Gizmos = 8,         // Bloque de utilidad/debug (semi-transparente)
}

/**
 * Configuración global del mundo de voxels.
 *
 * Define parámetros fundamentales que afectan toda la aplicación:
 * - Tamaño de chunks
 * - Posición inicial de cámara
 * - Bloque base del mundo
 * - Configuración del renderizador
 */
export type WorldConfiguration = {
  CHUNK: number;                                  // Tamaño del chunk (8, 16, 32, etc.)
  CAMERA_INITIAL_POSITION: THREE.Vector3;         // Posición inicial de la cámara
  WORLD_BASE_BLOCK: Block;                        // Bloque que rellena el mundo por defecto
  RENDERER_CONFIG: THREE.WebGLRendererParameters; // Parámetros del WebGLRenderer
};
