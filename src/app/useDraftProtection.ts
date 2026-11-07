import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
/** The router holds links and Back/Forward until the user confirms discarding a P3 draft. */
export function useDraftProtection(dirty: boolean, busy: boolean, editing: boolean, editingChanged: (value: boolean) => void) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search || currentLocation.hash !== nextLocation.hash));
  useEffect(() => { editingChanged(editing || busy); return () => editingChanged(false); }, [editing, busy, editingChanged]);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (!busy && window.confirm('Ungespeicherte Änderungen verwerfen?')) blocker.proceed();
    else blocker.reset();
  }, [blocker, busy]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [dirty, busy]);
}
