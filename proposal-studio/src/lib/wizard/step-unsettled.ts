/**
 * Señal de "hay una acción mutante manual en vuelo" (duplicateItem,
 * confirmRemove, reorder) compartida por Alternativas/Beneficios y leída por
 * `waitForAutosaveToSettle` (proposal-wizard.tsx) antes de cambiar de paso.
 *
 * A diferencia de `stepMeta.autosaveStatus` -- que llega a la store recién
 * después de un ciclo state -> render -> `useEffect` -> `setStepMeta` --, este
 * contador vive fuera de React y se actualiza de forma síncrona en el mismo
 * tick en que la acción arranca/termina. Eso cierra la ventana de carrera en
 * la que dos clicks casi simultáneos (duplicar + Siguiente) corren dentro del
 * mismo ciclo de eventos del browser: el efecto que reportaría "saving"
 * todavía no se ejecutó cuando `waitForAutosaveToSettle` ya está leyendo el
 * estado.
 */
let unsettledCount = 0;

function beginUnsettledAction(): () => void {
  unsettledCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    unsettledCount -= 1;
  };
}

function isStepUnsettled(): boolean {
  return unsettledCount > 0;
}

export { beginUnsettledAction, isStepUnsettled };
