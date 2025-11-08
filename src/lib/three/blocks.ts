/**
 * blocks.ts - Registro de Bloques y Materiales
 *
 * Clase BlockRegistry que actúa como un registro centralizado para gestionar
 * todos los tipos de bloques y sus materiales asociados en el motor de voxels.
 *
 * Responsabilidades:
 * - Mapear tipos de bloques (enum Block) a sus materiales Three.js
 * - Proporcionar acceso rápido a materiales por tipo
 * - Facilitar iteración de materiales para limpieza de memoria
 */

import * as THREE from 'three';
import { Block } from './block_types';

/**
 * Tipo auxiliar para las claves del enum Block
 */
export type BlockKey = keyof typeof Block;

/**
 * Descriptor completo de un bloque con su material
 */
export interface BlockDescriptor {
  type: Block;              // Tipo de bloque del enum
  name: string;             // Nombre descriptivo (ej: "Grass", "Stone")
  material: THREE.Material; // Material Three.js asociado
}

/**
 * Registro centralizado de bloques y materiales.
 *
 * Proporciona mapeo eficiente de tipo de bloque a material Three.js,
 * esencial para el sistema de renderizado instanciado.
 *
 * Uso típico:
 * ```typescript
 * const registry = new BlockRegistry();
 * registry.register({ type: Block.Grass, name: 'Grass', material: grassMat });
 * const mat = registry.materialOf(Block.Grass); // Obtener material
 * ```
 */
export class BlockRegistry {
  // Mapa interno: Block enum -> BlockDescriptor
  private byType = new Map<Block, BlockDescriptor>();

  /**
   * Registra un nuevo tipo de bloque con su material.
   *
   * @param desc Descriptor del bloque (tipo, nombre, material)
   */
  register(desc: BlockDescriptor) {
    this.byType.set(desc.type, desc);
  }

  /**
   * Obtiene el material Three.js asociado a un tipo de bloque.
   *
   * @param type Tipo de bloque (enum Block)
   * @returns Material Three.js correspondiente
   * @throws Error si el bloque no está registrado
   */
  materialOf(type: Block): THREE.Material {
    const d = this.byType.get(type);
    if (!d) throw new Error(`Material no registrado para Block ${type}`);
    return d.material;
  }

  /**
   * Retorna todos los materiales registrados.
   * Útil para iterar y liberar memoria al desmontar la escena.
   *
   * @returns Array de todos los materiales Three.js
   */
  allMaterials(): THREE.Material[] {
    return [...this.byType.values()].map(d => d.material);
  }
}
