/**
 * index.ts - Punto de Entrada Principal del Motor Three.js
 *
 * Módulo barrel que exporta todas las funcionalidades del motor de voxels
 * y define la configuración mundial por defecto.
 *
 * Este archivo centraliza todas las exportaciones para facilitar imports:
 * ```typescript
 * import { createSceneContext, Block, WorldConfiguraton } from '@/lib/three';
 * ```
 */

// Exportar todos los módulos del motor
export * from './blocks';          // BlockRegistry y tipos relacionados
export * from './chunk';           // Utilidades de indexación y generación de chunks
export * from './controls';        // Controladores de cámara (Orbit, Fly, PointerLock)
export * from './dispose';         // Utilidades de liberación de memoria
export * from './instancing';      // Sistema de renderizado instanciado
export * from './materials';       // Factorías de materiales Three.js
export * from './textures';        // Carga de texturas configuradas
export * from './resize';          // Redimensionamiento de renderer y cámara
export * from './renderer';        // Configuración del WebGLRenderer
export * from './geometry';        // Creación de geometrías compartidas
export * from './scene';           // Configuración de escena 3D
export * from './input';           // Sistema de rastreo de input de teclado
export * from './block_defs';      // Definiciones de materiales de bloques
export * from './block_types';     // Enum de bloques y tipos de configuración

import * as THREE from 'three';
import { Block, WorldConfiguration } from './block_types';

/**
 * Configuración mundial por defecto del motor de voxels.
 *
 * Valores configurables:
 * - CHUNK: Tamaño de cada chunk (16 = 16x16x16 = 4096 bloques)
 * - CAMERA_INITIAL_POSITION: Posición inicial de la cámara en el mundo
 * - WORLD_BASE_BLOCK: Bloque que rellena el mundo por defecto (Stone)
 * - RENDERER_CONFIG: Configuración del WebGLRenderer
 *
 * Tamaños de chunk comunes y su impacto:
 * - CHUNK = 8  → 8³ = 512 bloques (bajo uso de memoria, más chunks)
 * - CHUNK = 16 → 16³ = 4096 bloques (balance óptimo)
 * - CHUNK = 32 → 32³ = 32768 bloques (alto uso de memoria, menos chunks)
 */
export const WorldConfiguraton: WorldConfiguration = {
  CHUNK: 16,  // Tamaño de chunk por defecto: 16x16x16

  // Posición inicial: ligeramente elevada y alejada para ver el terreno
  CAMERA_INITIAL_POSITION: new THREE.Vector3(0, 20, 80),

  // Bloque base: piedra (se pinta con césped/tierra en la superficie)
  WORLD_BASE_BLOCK: Block.Stone,

  // Configuración del renderizador WebGL
  RENDERER_CONFIG: {
    antialias: true,             // Suavizado de bordes
    alpha: true,                 // Fondo transparente
    depth: true,                 // Depth buffer habilitado
    powerPreference: 'default'   // Balance entre rendimiento y calidad
  }
};

// Nota: Tamaños de chunk y su impacto en memoria/rendimiento
// CHUNK = 8  → 8³ = 512 voxels por chunk
// CHUNK = 16 → 16³ = 4096 voxels por chunk (recomendado)
// CHUNK = 32 → 32³ = 32768 voxels por chunk
