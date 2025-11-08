/**
 * dispose.ts - Utilidades de Liberación de Memoria
 *
 * Módulo que proporciona funciones para liberar correctamente recursos
 * de Three.js (geometrías, materiales, texturas) y prevenir memory leaks.
 */

import * as THREE from 'three';

/**
 * Libera recursos de memoria de un Object3D y todos sus hijos recursivamente.
 *
 * IMPORTANTE: Por defecto solo remueve el objeto del grafo de escena.
 * Para liberar geometrías y materiales, pasar opciones disposeGeometry/disposeMaterial.
 *
 * Uso típico al desmontar un chunk:
 * ```typescript
 * disposeObject(chunkGroup, { disposeGeometry: true, disposeMaterial: true });
 * ```
 *
 * Nota: Los materiales suelen compartirse entre bloques, así que disposeMaterial
 * debe usarse con cuidado. En este proyecto, los materiales se liberan desde
 * el BlockRegistry.
 *
 * @param object Object3D raíz a liberar (típicamente un Group)
 * @param opts Opciones de liberación
 * @param opts.disposeGeometry Si true, llama a dispose() en geometrías (default: false)
 * @param opts.disposeMaterial Si true, llama a dispose() en materiales (default: false)
 */
export function disposeObject(object: THREE.Object3D, { disposeGeometry = false, disposeMaterial = false } = {}) {
  // Iterar recursivamente todos los hijos del objeto
  object.traverse(o => {
    // Liberar geometría si está presente y se solicitó
    if ((o as any).geometry && disposeGeometry) {
      (o as any).geometry.dispose?.();
    }

    // Liberar material(es) si está(n) presente(s) y se solicitó
    if ((o as any).material && disposeMaterial) {
      const mat = (o as any).material as THREE.Material | THREE.Material[];

      // Manejar tanto materiales individuales como arrays de materiales
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose?.());
      } else {
        mat.dispose?.();
      }
    }
  });
}
