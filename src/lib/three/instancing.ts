/**
 * instancing.ts - Constructor de Chunks con Renderizado Instanciado
 *
 * Módulo que construye meshes instanciados (InstancedMesh) para renderizar chunks de voxels
 * de forma altamente optimizada. En lugar de crear geometrías individuales para cada bloque,
 * usa una geometría compartida y múltiples instancias transformadas.
 *
 * Técnica clave:
 * - Un InstancedMesh por tipo de bloque (césped, tierra, piedra, etc.)
 * - Una sola geometría de cubo compartida por todas las instancias
 * - Matrices de transformación para posicionar cada bloque
 * - Soporte de billboards para elementos planos como flores
 *
 * Beneficios de rendimiento:
 * - Reduce draw calls drásticamente (1 por tipo de bloque vs miles)
 * - Minimiza uso de memoria (1 geometría compartida vs cientos)
 * - GPU-friendly: procesamiento en paralelo de instancias
 */

import * as THREE from 'three';
import { Block } from './block_types';
import { BlockRegistry } from './blocks';

/**
 * Resultado de la construcción del chunk instanciado
 */
export type InstancingResult = {
  group: THREE.Group;                                      // Grupo contenedor de todos los meshes
  meshes: Partial<Record<Block, THREE.InstancedMesh>>;    // Meshes instanciados por tipo de bloque
};

/**
 * Cuenta cuántas instancias de cada tipo de bloque están presentes en el grid.
 * Usado para pre-asignar la capacidad exacta de cada InstancedMesh.
 *
 * @param grid Array 1D de bloques (Uint8Array con índices de Block)
 * @param CHUNK Tamaño del chunk (típicamente 16)
 * @returns Record con el conteo de cada tipo de bloque
 */
export function countBlocks(grid: Uint8Array, CHUNK: number) {
  // Inicializar contadores para todos los tipos de bloques
  const counts: Record<Block, number> = {
    [Block.Air]: 0,
    [Block.Grass]: 0,
    [Block.Gizmos]: 0,
    [Block.Dirt]: 0,
    [Block.Stone]: 0,
    [Block.RedFlower]: 0,
    [Block.OrangeFlower]: 0,
    [Block.PinkFlower]: 0,
    [Block.WhiteFlower]: 0,
  };

  const totalBlocks = CHUNK * CHUNK * CHUNK; // Total de bloques en el chunk (ej: 16³ = 4096)

  // Recorrer todo el grid y contar cada tipo de bloque
  for (let i = 0; i < totalBlocks; i++) {
    const block = grid[i] as Block;
    counts[block]++;
  }

  return counts;
}

/**
 * Construye InstancedMeshes por tipo de bloque y configura matrices de transformación por posición.
 * El grupo resultante está centrado respecto al origen local del chunk.
 *
 * Proceso:
 * 1. Contar bloques de cada tipo para pre-asignar capacidad
 * 2. Crear un InstancedMesh por cada tipo de bloque con material específico
 * 3. Iterar el grid y asignar matrices de transformación a cada instancia
 * 4. Centrar el chunk aplicando offset de -CHUNK/2 + 0.5
 *
 * @param grid Array 1D de bloques del chunk
 * @param CHUNK Tamaño del chunk (lado del cubo)
 * @param cubeGeo Geometría de cubo compartida (1x1x1)
 * @param registry Registro de materiales de bloques
 * @returns Grupo con todos los meshes instanciados y referencia a cada mesh
 */
export function buildInstancedChunk(
  grid: Uint8Array,
  CHUNK: number,
  cubeGeo: THREE.BufferGeometry,
  registry: BlockRegistry
): InstancingResult {

  const group = new THREE.Group();
  const counts = countBlocks(grid, CHUNK); // Pre-calcular capacidades necesarias

  /**
   * Factory para crear un InstancedMesh configurado
   * @param block Tipo de bloque
   * @returns InstancedMesh con material y capacidad apropiados
   */
  const makeMesh = (block: Block) => {
    const meshMaterial = registry.materialOf(block); // Obtener material del registro

    // Crear mesh instanciado con capacidad exacta (mínimo 1 para evitar errores)
    const mesh = new THREE.InstancedMesh(cubeGeo, meshMaterial, Math.max(1, counts[block]));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Optimización para actualizaciones dinámicas
    return mesh;
  };

  // Crear un mesh instanciado por cada tipo de bloque
  const grassMesh = makeMesh(Block.Grass);
  const dirtMesh = makeMesh(Block.Dirt);
  const gizmosMesh = makeMesh(Block.Gizmos);
  const stoneMesh = makeMesh(Block.Stone);
  const redFlowerMesh = makeMesh(Block.RedFlower);
  const orangeFlowerMesh = makeMesh(Block.OrangeFlower);
  const pinkFlowerMesh = makeMesh(Block.PinkFlower);
  const whiteFlowerMesh = makeMesh(Block.WhiteFlower);

  // Agregar todos los meshes al grupo
  group.add(grassMesh);
  group.add(dirtMesh);
  group.add(gizmosMesh);
  group.add(stoneMesh);
  group.add(redFlowerMesh);
  group.add(orangeFlowerMesh);
  group.add(pinkFlowerMesh);
  group.add(whiteFlowerMesh);

  // Objetos temporales para evitar asignaciones en el loop (optimización)
  const tempMatrix = new THREE.Matrix4();
  const tempPosition = new THREE.Vector3();

  // Cursores para trackear la próxima instancia disponible de cada tipo
  const cursor: Record<Block, number> = {
    [Block.Air]: 0, [Block.Grass]: 0, [Block.Gizmos]: 0, [Block.Dirt]: 0, [Block.Stone]: 0,
    [Block.RedFlower]: 0, [Block.OrangeFlower]: 0, [Block.PinkFlower]: 0, [Block.WhiteFlower]: 0,
  };

  // Calcular offset para centrar el chunk en el origen local
  // +0.5 para que cada bloque esté centrado en su coordenada entera
  const GRID_HALF = CHUNK / 2;
  const offset = new THREE.Vector3(-GRID_HALF + 0.5, -GRID_HALF + 0.5, -GRID_HALF + 0.5);

  // Iterar el grid en orden Z-Y-X y asignar matrices de transformación
  for (let z = 0; z < CHUNK; z++) {
    for (let y = 0; y < CHUNK; y++) {
      for (let x = 0; x < CHUNK; x++) {
        // Calcular índice 1D: x + y*CHUNK + z*CHUNK²
        const i = x + y * CHUNK + z * CHUNK * CHUNK;
        const b = grid[i] as Block;

        // Saltar bloques de aire (no se renderizan)
        if (b === Block.Air) continue;

        // Calcular posición centrada
        tempPosition.set(x, y, z).add(offset);
        tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z);

        // Asignar matriz a la próxima instancia disponible del tipo correcto
        switch (b) {
          case Block.Grass:  grassMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.Gizmos: gizmosMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.Dirt:   dirtMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.Stone:  stoneMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.RedFlower:   redFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.OrangeFlower: orangeFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.PinkFlower:   pinkFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
          case Block.WhiteFlower:  whiteFlowerMesh.setMatrixAt(cursor[b]++, tempMatrix); break;
        }
      }
    }
  }

  // Marcar todas las matrices de instancias como actualizadas para que Three.js las envíe a la GPU
  grassMesh.instanceMatrix.needsUpdate = true;
  gizmosMesh.instanceMatrix.needsUpdate = true;
  dirtMesh.instanceMatrix.needsUpdate = true;
  stoneMesh.instanceMatrix.needsUpdate = true;
  redFlowerMesh.instanceMatrix.needsUpdate = true;
  orangeFlowerMesh.instanceMatrix.needsUpdate = true;
  pinkFlowerMesh.instanceMatrix.needsUpdate = true;
  whiteFlowerMesh.instanceMatrix.needsUpdate = true;

  return {
    group,
    meshes: {
      [Block.Grass]: grassMesh,
      [Block.Dirt]: dirtMesh,
      [Block.Stone]: stoneMesh,
      [Block.RedFlower]: redFlowerMesh,
      [Block.OrangeFlower]: orangeFlowerMesh,
      [Block.PinkFlower]: pinkFlowerMesh,
      [Block.WhiteFlower]: whiteFlowerMesh,
      [Block.Gizmos]: gizmosMesh
    }
  };
}

/**
 * Opciones para construcción de billboards (sprites 2D en mundo 3D)
 */
type BillboardBuildOpts = {
  layout?: 'xzy' | 'xyz';           // Orden de indexación del grid
  air?: number;                     // ID del bloque aire (típicamente 0)
  frameOf?: (blockId: number) => number;           // Mapea bloque a frame del atlas de texturas
  sizeOf?: (blockId: number) => { w: number; h: number }; // Mapea bloque a tamaño en unidades mundiales
  yOffset?: number;                 // Altura sobre el bloque soporte
};

/**
 * Construye una capa de billboards (elementos 2D planos) desde un grid de voxels.
 * Útil para renderizar elementos como flores, pasto alto o arbustos que no necesitan
 * ser cubos completos.
 *
 * Características:
 * - Usa geometría de quad (plano 2D) en lugar de cubo
 * - Cada instancia mira automáticamente a la cámara (billboard)
 * - Atributos custom por instancia: tamaño (w, h) y frame del atlas
 * - IMPORTANTE: Muta el grid original, convirtiendo bloques procesados en aire
 *
 * Proceso:
 * 1. Primer paso: contar cuántas instancias se necesitan
 * 2. Crear InstancedMesh de quads con material de shader
 * 3. Segundo paso: asignar posiciones y atributos custom
 * 4. Marcar celdas procesadas como aire para evitar doble renderizado
 *
 * @param voxels Grid de voxels (se mutará, convirtiendo detalles en aire)
 * @param size Tamaño del chunk
 * @param detailSet Array de IDs de bloques que deben convertirse en billboards
 * @param material ShaderMaterial que renderiza los billboards (debe soportar aSize y aFrame)
 * @param opts Opciones de configuración
 * @returns InstancedMesh de billboards o null si no hay ninguno
 */
export function buildBillboardLayerFromVoxels(
  voxels: Uint16Array | number[],
  size: number,
  detailSet: number[],              // Ej: [Block.FlowerRed, Block.FlowerBlue, Block.TallGrass]
  material: THREE.ShaderMaterial,
  {
    layout = 'xzy',
    air = (window as any).Block?.Air ?? 0,
    frameOf = () => 0,
    sizeOf = () => ({ w: 0.9, h: 1.2 }),
    yOffset = 1
  }: BillboardBuildOpts = {}
) {
  // Funciones de indexación según layout
  const idx_xzy = (x:number,y:number,z:number)=> x + z*size + y*size*size;
  const idx_xyz = (x:number,y:number,z:number)=> x + y*size + z*size*size;
  const IDX = layout === 'xzy' ? idx_xzy : idx_xyz;

  // --- Primer paso: contar instancias necesarias ---
  let count = 0;
  for (let y=0; y<size; y++) {
    for (let z=0; z<size; z++) {
      for (let x=0; x<size; x++) {
        const i = IDX(x,y,z);
        if (detailSet.includes(voxels[i])) count++;
      }
    }
  }
  if (!count) return null; // No hay billboards, retornar null

  // Geometría: quad unitario en el plano XY centrado en origen
  // El tamaño real se escala en el shader usando el atributo aSize
  const quad = new THREE.PlaneGeometry(1, 1, 1, 1);

  const mesh = new THREE.InstancedMesh(quad, material, count);
  const m = new THREE.Matrix4();

  // Atributos custom por instancia:
  const aSize = new Float32Array(count * 2);  // 2 floats por instancia: ancho y alto
  const aFrame = new Float32Array(count);     // 1 float por instancia: índice del frame en atlas

  // --- Segundo paso: asignar transformaciones y atributos ---
  let n = 0; // Contador de instancias procesadas
  for (let y=0; y<size; y++) {
    for (let z=0; z<size; z++) {
      for (let x=0; x<size; x++) {
        const i = IDX(x,y,z);
        const id = voxels[i];
        if (!detailSet.includes(id)) continue; // Saltar si no es un detalle

        // Centrar en el voxel y elevar para que se pose sobre el bloque soporte
        m.makeTranslation(x + 0.5, y + yOffset - 0.5, z + 0.5);
        mesh.setMatrixAt(n, m);

        // Asignar tamaño del billboard
        const { w, h } = sizeOf(id);
        aSize[n*2 + 0] = w; // Ancho
        aSize[n*2 + 1] = h; // Alto

        // Asignar frame del atlas de texturas
        aFrame[n] = frameOf(id);

        // IMPORTANTE: Convertir este voxel en aire para evitar que el renderizador
        // de cubos dibuje un bloque sólido en esta posición
        voxels[i] = air;
        n++;
      }
    }
  }

  // Marcar matriz de instancias como actualizada
  mesh.instanceMatrix.needsUpdate = true;

  // Agregar atributos custom a la geometría (accesibles en el shader)
  mesh.geometry.setAttribute('aSize',  new THREE.InstancedBufferAttribute(aSize, 2));
  mesh.geometry.setAttribute('aFrame', new THREE.InstancedBufferAttribute(aFrame, 1));

  // Renderizar después de los voxels sólidos para mejor orden de renderizado
  // (billboards semi-transparentes deben dibujarse después de objetos opacos)
  mesh.renderOrder = 2;

  return mesh;
}
