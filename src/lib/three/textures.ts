/**
 * textures.ts - Utilidad para Carga de Texturas
 *
 * Módulo que proporciona una función estandarizada para crear y configurar
 * texturas Three.js optimizadas para renderizado PBR estilo voxel/game.
 */

import * as THREE from 'three';

/**
 * Crea una textura configurada de forma estandarizada para renderizado PBR estilo juego.
 *
 * Configuración por defecto:
 * - ColorSpace sRGB para mapas de color (coincide con renderer.outputColorSpace)
 * - ClampToEdge wrapping para evitar costuras en cubos/ladrillos
 * - LinearFilter para minificación (evita ringing en voxel art)
 * - Repeat configurable para tiling
 *
 * @param loader TextureLoader de Three.js
 * @param url URL de la textura a cargar
 * @param opts Opciones de configuración
 * @param opts.wrapS Wrapping horizontal (default: ClampToEdgeWrapping)
 * @param opts.wrapT Wrapping vertical (default: ClampToEdgeWrapping)
 * @param opts.repeat Repetición de textura [x, y] (default: [1, 1])
 * @param opts.linear Si true, fuerza minFilter a linear (default: true)
 * @param opts.isColor Si true, usa sRGB color space (default: true)
 * @returns Textura configurada
 */
export function createTexture(
  loader: THREE.TextureLoader,
  url: string,
  opts?: {
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    repeat?: [number, number];
    linear?: boolean;
    isColor?: boolean;
  }
): THREE.Texture {
  const {
    wrapS = THREE.ClampToEdgeWrapping,  // No repetir: para cubos individuales
    wrapT = THREE.ClampToEdgeWrapping,
    repeat = [1, 1],                     // Sin tiling por defecto
    linear = true,                       // Filtrado linear para suavidad
    isColor = true,                      // Textura de color (no normal map, etc.)
  } = opts || {};

  // Cargar textura desde URL
  const tex = loader.load(url);

  // Configurar wrapping (repetición en bordes)
  tex.wrapS = wrapS;
  tex.wrapT = wrapT;

  // Configurar repetición/tiling
  tex.repeat.set(repeat[0], repeat[1]);

  // Configurar filtrado de minificación (cuando textura es más pequeña que pixel)
  if (linear) tex.minFilter = THREE.LinearFilter;

  // Configurar espacio de color para texturas de albedo/color
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;

  return tex;
}
