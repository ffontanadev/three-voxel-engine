/**
 * input.ts - Sistema de Rastreo de Input de Teclado
 *
 * Módulo que proporciona un tracker de teclas presionadas en tiempo real,
 * optimizado para game loops donde se necesita chequear estado de teclas
 * cada frame.
 */

/**
 * Crea un sistema de tracking de teclas presionadas usando eventos keydown/keyup.
 *
 * Mantiene un objeto estable (misma referencia) que se puede consultar cada frame
 * sin overhead de eventos. Ideal para controles de movimiento WASD.
 *
 * Uso típico:
 * ```typescript
 * const { keys, dispose } = createKeyTracker(document);
 *
 * function gameLoop() {
 *   if (keys['KeyW']) moveForward();
 *   if (keys['Space']) jump();
 * }
 *
 * // Al desmontar:
 * dispose();
 * ```
 *
 * @param target Document donde escuchar eventos (default: document)
 * @returns Objeto con:
 *   - keys: Record mutable con estado actual de teclas (code -> boolean)
 *   - dispose: Función para limpiar event listeners
 */
export function createKeyTracker(target: Document = document) {
  // Objeto para almacenar estado de teclas (KeyboardEvent.code -> boolean)
  const keys: Record<string, boolean> = Object.create(null);

  // Handler para keydown: marca tecla como presionada
  const onDown = (e: KeyboardEvent) => { keys[e.code] = true; };

  // Handler para keyup: marca tecla como no presionada
  const onUp = (e: KeyboardEvent) => { keys[e.code] = false; };

  // Registrar event listeners
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);

  // Función de limpieza para remover listeners
  const dispose = () => {
    target.removeEventListener('keydown', onDown);
    target.removeEventListener('keyup', onUp);
  };

  return { keys, dispose };
}
