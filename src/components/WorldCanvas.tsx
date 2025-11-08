/**
 * WorldCanvas.tsx
 *
 * Componente principal del motor de voxels 3D que renderiza un mundo infinito
 * estilo Minecraft con carga dinámica de chunks y controles en primera persona.
 *
 * Características principales:
 * - Streaming infinito de chunks basado en la posición de la cámara
 * - Controles FPS con PointerLock (WASD + mouse)
 * - Generación procedural de terreno con API o fallback local
 * - Renderizado optimizado mediante instancias de Three.js
 * - Sistema de caché para chunks remotos
 */

'use client';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import {
  Block,
  buildInstancedChunk,
  fitRendererAndCamera,
  disposeObject,
  generateChunk,
  WorldConfiguraton,
  createPointerLockController,
  setupRenderer,
  createBlockGeometry,
  createSceneContext,
  createKeyTracker,
  updateSunFromCamera,
} from '@/lib/three';

import { PaintLayer, TerrainRelief } from '@/lib/three/surface_details';

type WorldCanvasProps = { className?: string };

// --- Configuración del mundo ---
const CHUNK = WorldConfiguraton.CHUNK; // Tamaño de cada chunk (16x16x16 por defecto)
const TARGET = new THREE.Vector3(0, 0, 0); // Punto central de la escena
const CAMERA_INITIAL_POSITION = WorldConfiguraton.CAMERA_INITIAL_POSITION; // Posición inicial de la cámara
const BASE_BLOCK = WorldConfiguraton.WORLD_BASE_BLOCK; // Bloque base del mundo (piedra)
const WORLD_SEED = '1'; // Semilla para generación procedural determinista
const VIEW_RADIUS = 6; // Radio de visión en chunks (6 = área de 13x13 chunks)

/**
 * Componente React que contiene el canvas 3D y gestiona todo el ciclo de vida
 * del motor de voxels (inicialización, game loop, limpieza de memoria).
 */
export const WorldCanvas: React.FC<WorldCanvasProps> = ({ className}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = canvasRef.current!;

    // --- Inicialización del renderizador WebGL ---
    const renderer = new THREE.WebGLRenderer({
      canvas,
      ...WorldConfiguraton.RENDERER_CONFIG // Configuración: antialiasing, tone mapping, etc.
    });
    setupRenderer(renderer); // Configura sombras, tamaño de pixel ratio

    // --- Creación de la escena 3D ---
    // Crea la escena, cámara, luz solar, grupo mundial, cargador de texturas y registro de bloques
    const { scene, camera, sun, worldGroup, loader, registry } = createSceneContext();

    // --- Sistema de streaming de chunks ---
    const blockGeometry = createBlockGeometry(); // Geometría compartida para todos los bloques (cubo 1x1x1)
    const loaded = new Map<string, THREE.Group>(); // Mapa de chunks cargados (key: "cx,cz", value: THREE.Group)
    const inflight = new Set<string>(); // Set de chunks en proceso de carga (evita duplicados)
    let disposed = false; // Flag para evitar operaciones después de desmontar el componente

    /**
     * Genera clave única para identificar un chunk en el mapa
     * @param cx Coordenada X del chunk
     * @param cz Coordenada Z del chunk
     * @returns String en formato "cx,cz"
     */
    const keyOf = (cx: number, cz: number) => `${cx},${cz}`;

    /**
     * Carga un chunk desde el servidor API o genera uno localmente en caso de error.
     * La carga es asíncrona y evita duplicados mediante el set 'inflight'.
     *
     * @param cx Coordenada X del chunk en el grid mundial
     * @param cz Coordenada Z del chunk en el grid mundial
     */
    const loadChunkAt = async (cx: number, cz: number) => {
      const key = keyOf(cx, cz);
      // Evitar cargar chunks duplicados o después de desmontar el componente
      if (loaded.has(key) || inflight.has(key) || disposed) return;
      inflight.add(key);

      try {
        // Construir URL del endpoint API con parámetros de generación
        const url = `/api/chunk?size=${CHUNK}&seed=${encodeURIComponent(WORLD_SEED)}&base=${BASE_BLOCK}&cx=${cx}&cy=0&cz=${cz}&surfaceScale=0.04&cavesScale=0.16&cavesThreshold=0.72&grassDepth=2&dirtDepth=3`;
        const res = await fetch(url, { cache: 'force-cache' }); // Usar caché del navegador
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Obtener datos binarios del chunk (Uint8Array con índices de bloques)
        const buf = await res.arrayBuffer();
        const grid = new Uint8Array(buf);
        if (disposed) return; // Verificar si el componente fue desmontado durante la carga

        // Construir el chunk con renderizado instanciado (optimizado)
        const { group } = buildInstancedChunk(grid, CHUNK, blockGeometry, registry);

        // Agregar una caja delimitadora visual para depuración
        const half = CHUNK / 2;
        const box = new THREE.Box3(
          new THREE.Vector3(-half, -half, -half),
          new THREE.Vector3(half, half, half)
        );
        const helper = new THREE.Box3Helper(box, 0x00ffff);
        // Hacer la caja semi-transparente para mejor legibilidad
        (helper.material as THREE.LineBasicMaterial).transparent = true;
        (helper.material as THREE.LineBasicMaterial).opacity = 0.4;
        group.add(helper);

        // Posicionar el chunk en el mundo (cada chunk mide CHUNK unidades)
        group.position.set(cx * CHUNK, 0, cz * CHUNK);
        worldGroup.add(group);
        loaded.set(key, group);
      } catch (err) {
        // --- Fallback: generación local si el servidor falla ---
        const local = generateChunk(CHUNK, BASE_BLOCK);

        // Aplicar efectos de terreno (comentados por defecto):
        // TerrainRelief(local, CHUNK, { scale: 0.16, threshold: 0.72, mode: '3d', fill: Block.Air }); // Cuevas 3D
        // TerrainRelief(local, CHUNK, { scale: 0.04, mode: 'surface' }); // Heightmap de superficie

        // Pintar capas de césped y tierra
        PaintLayer(local as any, CHUNK, BASE_BLOCK, Block.Grass, 2, 'xyz', 'contiguous');
        PaintLayer(local as any, CHUNK, BASE_BLOCK, Block.Dirt, Math.random() * 4 + 1, 'xyz', 'any');

        if (!disposed) {
          const { group } = buildInstancedChunk(local, CHUNK, blockGeometry, registry);
          group.position.set(cx * CHUNK, 0, cz * CHUNK);
          worldGroup.add(group);
          loaded.set(key, group);
        }
      } finally {
        inflight.delete(key); // Remover de la lista de chunks en proceso
      }
    };

    /**
     * Asegura que todos los chunks dentro del radio de visión estén cargados
     * y elimina chunks lejanos para liberar memoria (sistema LRU).
     *
     * @param cx Coordenada X central del chunk donde está la cámara
     * @param cz Coordenada Z central del chunk donde está la cámara
     */
    const ensureChunksAround = (cx: number, cz: number) => {
      // Cargar todos los chunks en un cuadrado de (VIEW_RADIUS*2 + 1)²
      for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
        for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
          loadChunkAt(cx + dx, cz + dz);
        }
      }

      // Eliminar chunks que estén fuera del radio de visión + 1 (margen de seguridad)
      for (const [key, group] of loaded) {
        const [gx, gz] = key.split(',').map((n) => parseInt(n, 10));
        if (Math.abs(gx - cx) > VIEW_RADIUS + 1 || Math.abs(gz - cz) > VIEW_RADIUS + 1) {
          worldGroup.remove(group);
          disposeObject(group); // Liberar memoria de geometrías y materiales
          loaded.delete(key);
        }
      }
    };

    // --- Cargar chunks iniciales alrededor de la posición de la cámara ---
    ensureChunksAround(Math.round(CAMERA_INITIAL_POSITION.x / CHUNK), Math.round(CAMERA_INITIAL_POSITION.z / CHUNK));

    // --- Configurar controles de primera persona (FPS) ---
    const { controls, enable } = createPointerLockController(camera, renderer);
    canvas.addEventListener('click', enable); // Activar pointer lock al hacer clic en el canvas

    // --- Rastreo de teclas para movimiento WASD + Espacio/Shift ---
    const { keys, dispose: disposeKeys } = createKeyTracker(document);

    // --- Configuración de redimensionamiento del canvas ---
    const fit = () => fitRendererAndCamera(container, renderer, camera, TARGET, CHUNK, CAMERA_INITIAL_POSITION);
    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);

    // --- Variables del game loop ---
    let RequestFrame = 0;
    const clock = new THREE.Clock(); // Reloj para calcular delta time
    const lastCamPos = new THREE.Vector3(Infinity, Infinity, Infinity); // Última posición conocida de la cámara
    const MAX_DT = 0.05; // Delta time máximo para evitar saltos grandes
    const speed = 30; // Velocidad de movimiento en unidades/segundo
    let lastChunkX = NaN; // Último chunk X visitado
    let lastChunkZ = NaN; // Último chunk Z visitado

    /**
     * Game Loop principal - se ejecuta cada frame
     * Gestiona:
     * - Movimiento de la cámara basado en input del teclado
     * - Actualización de la posición del sol
     * - Streaming de chunks dinámico
     * - Renderizado de la escena
     */
    function updateLoop() {
      const delta = Math.min(clock.getDelta(), MAX_DT); // Limitar delta para estabilidad

      // --- Cálculo del vector de movimiento basado en teclas WASD + Espacio/Shift ---
      const vx = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0); // Derecha/Izquierda
      const vz = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0); // Adelante/Atrás
      const vy = (keys['Space'] ? 1 : 0) - (keys['ShiftLeft'] ? 1 : 0); // Arriba/Abajo

      // Normalizar el vector de movimiento y aplicar velocidad solo si hay input
      const lenSq = vx*vx + vy*vy + vz*vz;
      if (lenSq > 0 && controls.isLocked) {
        const scale = (speed * delta) / Math.sqrt(lenSq); // Normalizar y escalar por velocidad
        const dx = vx * scale;
        const dy = vy * scale;
        const dz = vz * scale;

        // Mover la cámara en el espacio local (relativo a la dirección de la vista)
        controls.moveRight(dx);
        controls.moveForward(-dz); // Invertido porque forward es hacia -Z
        camera.position.y += dy; // Movimiento vertical absoluto
      }

      // --- Actualizar sol y chunks solo si la cámara se ha movido significativamente ---
      if (lastCamPos.manhattanDistanceTo(camera.position) > 1e-4) {
        lastCamPos.copy(camera.position);

        // Actualizar posición del sol para seguir a la cámara
        updateSunFromCamera(sun, camera, TARGET, CHUNK * 2);

        // Calcular en qué chunk está actualmente la cámara
        const ccx = Math.round(camera.position.x / CHUNK);
        const ccz = Math.round(camera.position.z / CHUNK);

        // Si cambió de chunk, cargar/descargar chunks según sea necesario
        if (ccx !== lastChunkX || ccz !== lastChunkZ) {
          lastChunkX = ccx; lastChunkZ = ccz;
          ensureChunksAround(ccx, ccz);
        }
      }

      // --- Renderizar la escena ---
      renderer.render(scene, camera);
      RequestFrame = window.requestAnimationFrame(updateLoop);
    }

    // Iniciar el game loop
    updateLoop();

    // --- Función de limpieza cuando el componente se desmonta ---
    return () => {
      window.cancelAnimationFrame(RequestFrame);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('click', enable);
      disposeKeys();

      // Marcar como disposed para evitar operaciones asíncronas pendientes
      disposed = true;

      // Liberar memoria de todos los chunks cargados
      for (const [, group] of loaded) disposeObject(group);
      loaded.clear();

      // Liberar materiales del registro de bloques
      for (const mat of registry.allMaterials()) mat.dispose();

      // Limpiar escena y renderizador
      scene.remove(worldGroup, sun);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas className="z-50" ref={canvasRef} />
    </div>
  );
};
