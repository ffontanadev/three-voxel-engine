/**
 * geometry.ts - Creación de Geometrías
 *
 * Módulo que proporciona funciones factory para crear geometrías Three.js
 * reutilizables. Centralizar la creación de geometrías evita duplicados
 * y facilita compartir BufferGeometry entre instancias.
 */

import * as THREE from 'three';

/**
 * Crea la geometría estándar de un bloque cúbico de 1x1x1.
 *
 * Esta geometría se comparte entre todos los bloques del mismo tipo
 * mediante InstancedMesh, minimizando el uso de memoria GPU.
 *
 * @returns BoxGeometry unitaria (1x1x1) centrada en el origen
 */
export function createBlockGeometry() {
  return new THREE.BoxGeometry(1, 1, 1);
}
