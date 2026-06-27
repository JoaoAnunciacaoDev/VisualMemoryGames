import { useState } from 'react';

export function useConfirmAction<T = void>() {
  const [target, setTarget] = useState<T | null>(null);

  return {
    target,
    isOpen: target !== null,
    open: (t: T) => setTarget(t),
    close: () => setTarget(null),
  };
}