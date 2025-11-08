/**
 * scene.ts - Configuración de Escena 3D
 *
 * Módulo que crea y configura la escena 3D completa para el mundo de voxels,
 * incluyendo cámara, iluminación, niebla y registro de materiales de bloques.
 *
 * Componentes creados:
 * - Scene con niebla exponencial para atmósfera realista
 * - PerspectiveCamera configurada
 * - DirectionalLight (sol) con sombras de alta calidad
 * - HemisphereLight para iluminación ambiental suave
 * - AmbientLight para relleno general
 * - BlockRegistry con todos los materiales de bloques cargados
 * - WorldGroup para contener todos los chunks
 */

import * as THREE from 'three';
import { BlockRegistry } from './blocks';
import { createDefaultBlockRegistry, DEFAULT_BLOCKS } from './block_defs';

/**
 * Contexto completo de la escena - retornado por createSceneContext
 */
export type SceneContext = {
  scene: THREE.Scene;                   // Escena principal de Three.js
  camera: THREE.PerspectiveCamera;      // Cámara de perspectiva
  worldGroup: THREE.Group;              // Grupo contenedor de todos los chunks del mundo
  sun: THREE.DirectionalLight;          // Luz direccional principal (sol)
  loader: THREE.TextureLoader;          // Cargador de texturas compartido
  registry: BlockRegistry;              // Registro de materiales de bloques
};

/**
 * Crea una escena típica de exterior para el mundo de voxels.
 *
 * Configuración incluida:
 * - Niebla exponencial para profundidad atmosférica
 * - Luz solar con sombras suaves de alta resolución
 * - Iluminación hemisférica (cielo/suelo) para ambiente natural
 * - Luz ambiental para relleno de sombras
 * - Cámara de perspectiva con FOV configurable
 * - Grupo contenedor para todos los meshes del mundo
 * - Registro de bloques con materiales precargados
 *
 * @param fov Campo de visión de la cámara en grados (default: 60)
 * @param near Plano cercano de la cámara (default: 0.1)
 * @param far Plano lejano de la cámara (default: 1000)
 * @param fogColor Color de la niebla (default: '#666157' - gris cálido)
 * @param fogDensity Densidad de la niebla (default: 0.01)
 * @returns Contexto completo de la escena con todos los componentes
 */
export function createSceneContext(
  {
    fov = 60,
    near = 0.1,
    far = 1000,
    fogColor = '#666157',
    fogDensity = 0.01,
  }: {
    fov?: number;
    near?: number;
    far?: number;
    fogColor?: string | number;
    fogDensity?: number;
  } = {}
): SceneContext {
  // Crear escena con niebla exponencial (densidad aumenta cuadráticamente con distancia)
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(fogColor as any, fogDensity);

  // Cargador de texturas compartido para todos los bloques
  const loader = new THREE.TextureLoader();

  // Registro centralizado de bloques y materiales
  const registry: BlockRegistry = createDefaultBlockRegistry(loader, DEFAULT_BLOCKS);

  // Cámara de perspectiva (FOV, aspect ratio, near plane, far plane)
  const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, near, far);

  // Grupo contenedor para todos los chunks del mundo (facilita transformaciones globales)
  const worldGroup = new THREE.Group();

  // --- Configuración de la luz solar (DirectionalLight) ---
  const sun = new THREE.DirectionalLight(0xffffff, 1.0); // Blanco puro, intensidad 1.0
  sun.castShadow = true; // Habilitar proyección de sombras

  // Configuración de sombras de alta calidad
  sun.shadow.mapSize.set(2048, 2048);  // Resolución del shadow map
  sun.shadow.bias = -0.0005;           // Prevenir shadow acne (artefactos visuales)
  sun.shadow.normalBias = 0.02;        // Bias basado en normales para mejor calidad

  // Iluminación hemisférica: simula luz del cielo (azul claro) y rebote del suelo (marrón)
  const hemi = new THREE.HemisphereLight(0xdfefff, 0x3f2e21, 0.35);

  // Luz ambiental suave para rellenar sombras oscuras
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);

  // Configurar frustum ortográfico de la cámara de sombras
  // Debe cubrir el área jugable completa para evitar que las sombras se corten
  const d = 60; // Tamaño del frustum
  const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -d;
  cam.right = d;
  cam.top = d;
  cam.bottom = -d;
  cam.near = 1;
  cam.far = 600;
  cam.updateProjectionMatrix();

  // Agregar todos los elementos a la escena
  scene.add(sun, sun.target, worldGroup, hemi, ambientLight);

  return { scene, camera, sun, worldGroup, loader, registry };
}

/**
 * Reposiciona la luz direccional para que orbite alrededor del target siguiendo
 * la dirección de la cámara. Esto mantiene el sol "detrás" de la cámara para
 * iluminación consistente.
 *
 * Técnica simple pero efectiva: usa el vector cámara->target como proxy de la
 * dirección del sol, manteniendo la iluminación natural sin importar hacia dónde
 * mire el jugador.
 *
 * @param sun Luz direccional a reposicionar
 * @param camera Cámara de referencia
 * @param target Punto central del mundo (típicamente Vector3(0, 0, 0))
 * @param scalar Distancia del sol al target (default: 1)
 */
export function updateSunFromCamera(
  sun: THREE.DirectionalLight,
  camera: THREE.Camera,
  target: THREE.Vector3,
  scalar = 1
) {
  // Calcular dirección normalizada desde el target hacia la cámara
  const dir = new THREE.Vector3().copy(camera.position).sub(target).normalize();

  // Posicionar el sol en esa dirección, escalado por la distancia deseada
  sun.position.copy(dir.multiplyScalar(scalar).add(target));
}
