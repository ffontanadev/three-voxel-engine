/**
 * resize.ts - Utilidad de Redimensionamiento de Renderizador y Cámara
 *
 * Módulo que ajusta el tamaño del renderizador y la cámara para encajar
 * correctamente el mundo de voxels en el viewport.
 */

import * as THREE from 'three';

/**
 * Ajusta el renderizador y la cámara para encuadrar el mundo de voxels.
 *
 * Funcionalidades:
 * - Redimensiona el renderizador al tamaño del contenedor
 * - Actualiza el aspect ratio de la cámara
 * - Calcula distancia óptima de la cámara basada en FOV y tamaño del chunk
 * - Posiciona y orienta la cámara hacia el punto de mira
 *
 * @param container Elemento HTML contenedor del canvas
 * @param renderer Renderizador WebGL a redimensionar
 * @param camera Cámara de perspectiva a ajustar
 * @param lookAt Punto hacia donde debe mirar la cámara (centro del mundo)
 * @param CHUNK Tamaño del chunk (para calcular distancia de encuadre)
 * @param initialPosition Posición inicial de la cámara (opcional, se calcula si no se provee)
 */
export function fitRendererAndCamera(
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  lookAt: THREE.Vector3,
  CHUNK: number,
  initialPosition?: THREE.Vector3
) {
  // Obtener dimensiones del contenedor
  const { width, height } = container.getBoundingClientRect();

  // Redimensionar renderizador (false = no actualizar style CSS)
  renderer.setSize(width, height, false);

  // Convertir FOV de grados a radianes
  const fov = camera.fov * (Math.PI / 180);

  // Calcular distancia de la cámara para encuadrar el chunk
  const cubeSize = CHUNK;
  const dist = (cubeSize * 0.54) / Math.tan(fov / 2);

  // Actualizar aspect ratio de la cámara
  camera.aspect = width / height;

  // Posicionar cámara (usar initialPosition si se provee, sino calcular)
  camera.position.set(
    initialPosition?.x ?? 0,            // X: centro horizontal
    initialPosition?.y ?? CHUNK / 2,    // Y: mitad de altura del chunk
    initialPosition?.z ?? dist * 2      // Z: distancia calculada * 2
  );

  // Orientar cámara hacia el punto de mira
  camera.lookAt(lookAt);

  // Actualizar matriz de proyección con nuevo aspect ratio
  camera.updateProjectionMatrix();
}
