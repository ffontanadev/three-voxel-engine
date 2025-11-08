/**
 * renderer.ts - Configuración del Renderizador WebGL
 *
 * Módulo que configura un WebGLRenderer con ajustes optimizados
 * para escenas de voxels con iluminación PBR.
 */

import * as THREE from 'three';

/**
 * Configura un WebGLRenderer con defaults apropiados para escenas voxel/PBR.
 *
 * Configuración aplicada:
 * - Pixel ratio limitado a 2x para balance rendimiento/calidad
 * - Tone mapping ACES Filmic para rango dinámico cinematográfico
 * - Shadow mapping suave (PCF) para sombras realistas
 * - Color space sRGB para salida correcta
 * - Fondo transparente (alpha 0)
 *
 * @param renderer Instancia de WebGLRenderer a configurar
 */
export function setupRenderer(renderer: THREE.WebGLRenderer) {
  // Limitar pixel ratio para evitar sobrecarga en pantallas de alta densidad
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  // Configurar tone mapping para mejor rango dinámico
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Estilo cinematográfico
  renderer.toneMappingExposure = 0.7;                 // Exposición ligeramente reducida

  // Configurar espacio de color de salida (debe coincidir con texturas)
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Habilitar sombras con suavizado PCF
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves

  // Fondo transparente (útil para overlays o composición)
  renderer.setClearColor(0x000000, 0);
}
