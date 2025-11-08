/**
 * materials.ts - Factorías de Materiales Three.js
 *
 * Módulo que proporciona funciones factory para crear materiales Three.js
 * configurados para el motor de voxels.
 *
 * Filosofía de materiales:
 * - MeshStandardMaterial PBR para realismo
 * - Roughness alto (1.0) para look mate estilo Minecraft
 * - Metalness bajo (0.0) para bloques no metálicos
 * - Soporte de texturas y colores sólidos
 */

import * as THREE from 'three';
import { createTexture } from './textures';

/**
 * Crea un MeshStandardMaterial estándar para bloques de voxels.
 *
 * Características:
 * - Acepta color hex (ej: "#003A4A") o URL de textura (ej: "/grass.jpg")
 * - Defaults optimizados para look "voxel/Minecraft"
 * - Roughness = 1 (completamente mate)
 * - Metalness = 0 (no metálico)
 * - Parámetros personalizables mediante 'params'
 *
 * @param textureUrl URL de textura o string de color hex
 * @param loader TextureLoader de Three.js
 * @param params Parámetros opcionales de material (override defaults)
 * @returns MeshStandardMaterial configurado
 */
export function createStandardMaterial(
  textureUrl: string,
  loader: THREE.TextureLoader,
  params?: Partial<THREE.MeshStandardMaterialParameters> | Partial<THREE.MeshDepthMaterialParameters>,
): THREE.MeshStandardMaterial {
  // Detectar si es un color hex o una URL de textura
  const isColor = textureUrl.includes('#');

  // Caso 1: Color sólido
  if(isColor) {
    const mat = new THREE.MeshStandardMaterial({
      color: textureUrl,   // Color hex
      roughness: 1,        // Completamente mate (sin reflejos especulares)
      metalness: 0,        // No metálico
      ...params,           // Override con parámetros custom
    });
    return mat;
  }

  // Caso 2: Textura desde archivo
  const map = createTexture(loader, textureUrl, { isColor, linear: true });
  const mat = new THREE.MeshStandardMaterial({
    map,                  // Textura cargada
    roughness: 1,         // Completamente mate
    metalness: 0,         // No metálico
    ...params,            // Override con parámetros custom
  });
  return mat;
}

/**
 * Helper para crear materiales con emisión de luz.
 * Útil para bloques que brillan como lava, antorchas, cristales luminosos, etc.
 *
 * @param textureUrl URL de textura del bloque emisivo
 * @param loader TextureLoader de Three.js
 * @param emissive Color de la emisión (ej: 0xff6600 para naranja)
 * @param emissiveIntensity Intensidad de la emisión (0-1+)
 * @param params Parámetros opcionales adicionales
 * @returns MeshStandardMaterial con emisión configurada
 */
export function createEmissiveMaterial(
  textureUrl: string,
  loader: THREE.TextureLoader,
  emissive: THREE.ColorRepresentation,
  emissiveIntensity: number,
  params?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  return createStandardMaterial(textureUrl, loader, {
    emissive,             // Color de la luz emitida
    emissiveIntensity,    // Intensidad del brillo
    ...params,
  });
}
