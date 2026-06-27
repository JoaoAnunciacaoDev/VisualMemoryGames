import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from '@/components/Toast/Toast';

type ToastType = 'success' | 'error' | 'info';
type ToastPosition = 'bottom-right' | 'top-center';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({
  children,
  position = 'bottom-right',
}: {
  children: ReactNode;
  position?: ToastPosition;
}) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          position={position}
        />
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);