/**
 * block_defs.ts - Definiciones de Materiales de Bloques
 *
 * Archivo centralizado que define las propiedades visuales de cada tipo de bloque
 * del motor de voxels. Cada bloque tiene asociado un material Three.js con su
 * textura o color, y parámetros opcionales.
 *
 * Para agregar un nuevo bloque:
 * 1. Agregar enum en block_types.ts (ej: Block.NewBlock)
 * 2. Agregar entrada en DEFAULT_BLOCKS con textura y parámetros
 * 3. La textura se carga automáticamente desde /public
 */

import * as THREE from 'three';
import { BlockRegistry } from './blocks';
import { createStandardMaterial } from './materials';
import { Block } from './block_types';

/**
 * Definición de material para un tipo de bloque
 */
export type BlockMaterialDef = {
  type: Block;              // Tipo de bloque del enum Block
  name: string;             // Nombre descriptivo del bloque
  texture: string;          // URL de textura (ej: "/grass.jpg") o color hex (ej: "#003A4A")
  params?: Partial<THREE.MeshStandardMaterialParameters> | Partial<THREE.MeshDepthMaterialParameters>; // Parámetros opcionales del material
};

/**
 * Lista centralizada de bloques y sus materiales.
 *
 * Configuraciones especiales:
 * - Flores: DoubleSide + transparent para renderizado por ambos lados
 * - Gizmos: Material semi-transparente para overlays de debug
 * - Bloques sólidos: MeshStandardMaterial estándar con texturas
 */
export const DEFAULT_BLOCKS: BlockMaterialDef[] = [
  // Bloques sólidos con texturas
  { type: Block.Grass,       name: 'Grass',        texture: '/grass.jpg' },
  { type: Block.Dirt,        name: 'Dirt',         texture: '/dirt.png' },
  { type: Block.Stone,       name: 'Stone',        texture: '/stone.png' },

  // Flores - renderizado de doble cara para billboards
  { type: Block.RedFlower,   name: 'Red Flower',   texture: '/flower_red.png',   params: { side: THREE.DoubleSide, transparent: true } },
  { type: Block.OrangeFlower,name: 'Orange Flower',texture: '/flower_orange.png',params: { side: THREE.DoubleSide, transparent: true } },
  { type: Block.PinkFlower,  name: 'Pink Flower',  texture: '/flower_pink.png',  params: { side: THREE.DoubleSide, transparent: true } },
  { type: Block.WhiteFlower, name: 'White Flower', texture: '/flower_white.png', params: { side: THREE.DoubleSide, transparent: true } },

  // Material de utilidad para overlays y debug
  { type: Block.Gizmos,      name: 'Gizmos',       texture: '#003A4A', params: {
      opacity: 0.1,              // Muy transparente
      depthWrite: false,         // No escribir en depth buffer
      depthTest: true,           // Pero sí testear profundidad
      blending: THREE.LessDepth as any, // Blending especial
      side: THREE.FrontSide,     // Solo cara frontal
      transparent: true,         // Habilitar transparencia
    }
  },
];

/**
 * Construye un BlockRegistry a partir de una lista de definiciones de materiales.
 *
 * Proceso:
 * 1. Crear instancia vacía de BlockRegistry
 * 2. Para cada definición de bloque:
 *    - Crear material usando createStandardMaterial
 *    - Registrar el bloque con su material
 * 3. Retornar registry completo
 *
 * @param loader TextureLoader de Three.js para cargar texturas
 * @param defs Lista de definiciones de bloques (default: DEFAULT_BLOCKS)
 * @returns BlockRegistry con todos los materiales cargados
 */
export function createDefaultBlockRegistry(
  loader: THREE.TextureLoader,
  defs: BlockMaterialDef[] = DEFAULT_BLOCKS
): BlockRegistry {
  const registry = new BlockRegistry();

  // Crear y registrar material para cada bloque
  for (const def of defs) {
    const mat = createStandardMaterial(def.texture, loader, def.params);
    registry.register({ type: def.type, name: def.name, material: mat });
  }

  return registry;
}
