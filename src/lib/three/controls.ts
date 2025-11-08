/**
 * controls.ts - Controladores de Cámara
 *
 * Módulo que proporciona wrappers configurados para diferentes tipos de controles
 * de cámara de Three.js, adaptados para el motor de voxels.
 *
 * Controladores disponibles:
 * - OrbitControls: Órbita alrededor de un punto con restricciones (modo espectador)
 * - FlyControls: Vuelo libre estilo editor (6 grados de libertad)
 * - PointerLockControls: Controles FPS con bloqueo de puntero (primera persona)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * Resultado del controlador Orbit
 */
export type OrbitController = {
  controls: OrbitControls;   // Instancia de OrbitControls
  dispose: () => void;       // Función de limpieza
};

/**
 * Opciones de configuración para OrbitControls
 */
export type OrbitOptions = {
  enableZoom?: boolean;           // Permitir zoom con scroll (default: false)
  minDistance?: number;           // Distancia mínima al target
  maxDistance?: number;           // Distancia máxima al target
  yawRange?: [number, number];    // Rango de yaw relativo a la azimuth actual (radianes)
  pitchRangeDeg?: [number, number]; // Rango de pitch relativo en grados
  damping?: number;               // Factor de suavizado (0-1, típicamente 0.05-0.15)
  enablePan?: boolean;            // Permitir paneo con clic derecho
}

/**
 * Crea OrbitControls con límites relativos a la orientación inicial de la cámara.
 *
 * Características:
 * - Damping suave para movimiento natural
 * - Restricciones de distancia configurables
 * - Límites de ángulos de rotación
 * - Paneo y zoom opcionales
 *
 * Uso:
 * 1. Llamar a controls.update() en el game loop
 * 2. Llamar a controls.update() después de cada resize
 *
 * @param renderer Renderizador WebGL
 * @param camera Cámara de perspectiva a controlar
 * @param target Punto central de órbita (típicamente centro del mundo)
 * @param opts Opciones de configuración
 * @returns Controller con controles y función de dispose
 */
export function createOrbitController(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  opts?: OrbitOptions
): OrbitController {
  const {
    enableZoom = false,
    enablePan = false,
    minDistance = 2,
    maxDistance = 1000,
    pitchRangeDeg = [-18, 18],  // Rango vertical de -18° a +18°
    damping = 0.08,
  } = opts || {};

  // Crear controles orbit con el canvas del renderizador
  const controls = new OrbitControls(camera, renderer.domElement);

  // Configurar punto de órbita
  controls.target.copy(target);

  // Habilitar damping para movimiento suave e inercial
  controls.enableDamping = true;
  controls.dampingFactor = damping;

  // Configurar capacidades de interacción
  controls.enablePan = enablePan;
  controls.enableZoom = enableZoom;

  // Configurar restricciones de distancia
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;

  // Configurar límites de rotación
  controls.minAzimuthAngle = -Infinity;  // Sin límite horizontal
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = 0;            // Desde arriba (0°)
  controls.maxPolarAngle = Math.PI;      // Hasta abajo (180°)

  // Actualizar controles para aplicar configuración inicial
  controls.update();

  const dispose = () => controls.dispose();
  return { controls, dispose };
}

/**
 * Opciones de configuración para FlyControls
 */
export type FlyOptions = {
  movementSpeed?: number;   // Velocidad de movimiento (unidades/segundo)
  rollSpeed?: number;       // Velocidad de rotación (radianes/segundo)
  dragToLook?: boolean;     // Requiere arrastrar mouse para mirar
  autoForward?: boolean;    // Movimiento automático hacia adelante
};

/**
 * Wrapper sobre FlyControls de Three.js con configuración por defecto sensata.
 *
 * Características:
 * - 6 grados de libertad (movimiento y rotación completa)
 * - Ideal para modo editor o espectador libre
 * - Requiere actualización manual con delta time
 *
 * Uso:
 * En el game loop: controls.update(deltaTimeInSeconds)
 *
 * @param camera Cámara de perspectiva a controlar
 * @param renderer Renderizador WebGL
 * @param options Opciones de configuración
 * @returns Objeto con instancia de controls
 */
export const createFlyCameraController = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  options: FlyOptions = {}
) => {
  const controls = new FlyControls(camera, renderer.domElement);

  // Configurar velocidades
  controls.movementSpeed = options.movementSpeed ?? 20;    // 20 unidades/segundo
  controls.rollSpeed = options.rollSpeed ?? Math.PI / 12;  // 15° por segundo

  // Configurar comportamiento de interacción
  controls.dragToLook = options.dragToLook ?? true;        // Arrastrar para mirar (más seguro)
  controls.autoForward = options.autoForward ?? false;     // Sin auto-avance

  return { controls };
};

/**
 * Crea un controlador FPS con bloqueo de puntero (PointerLock).
 *
 * Características:
 * - Controles de primera persona (FPS-style)
 * - Requiere gesto del usuario para activar (seguridad del navegador)
 * - El mouse controla la dirección de la vista
 * - Movimiento manual via WASD u otro sistema externo
 *
 * Propiedades útiles de controls:
 * - controls.isLocked: booleano que indica si el pointer está bloqueado
 * - controls.moveRight(distance): mueve la cámara hacia la derecha
 * - controls.moveForward(distance): mueve la cámara hacia adelante
 *
 * Uso:
 * 1. Llamar a enable() en respuesta a un evento del usuario (ej: click)
 * 2. El navegador pedirá permiso al usuario para bloquear el puntero
 * 3. Presionar ESC libera el puntero automáticamente
 * 4. Usar controls.moveRight() y controls.moveForward() para movimiento
 *
 * @param camera Cámara de perspectiva a controlar
 * @param renderer Renderizador WebGL
 * @returns Objeto con controls, enable y disable
 */
export const createPointerLockController = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) => {
  const controls = new PointerLockControls(camera, renderer.domElement);

  // Función para activar el pointer lock (debe llamarse desde evento de usuario)
  const enable = () => controls.lock();

  // Función para desactivar el pointer lock
  const disable = () => controls.unlock();

  return { controls, enable, disable };
};
