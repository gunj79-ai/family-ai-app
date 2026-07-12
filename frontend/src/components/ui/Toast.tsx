import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Global toast state — simple singleton pattern
let addToastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type);
}

export const toastSuccess = (msg: string) => toast(msg, 'success');
export const toastError = (msg: string) => toast(msg, 'error');
export const toastInfo = (msg: string) => toast(msg, 'info');

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    addToastFn = add;
    return () => {
      addToastFn = null;
    };
  }, [add]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
    info: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm',
              'bg-white dark:bg-gray-800 border pointer-events-auto',
              t.type === 'error' && 'border-red-200 dark:border-red-700',
              t.type === 'success' && 'border-green-200 dark:border-green-700',
              t.type === 'info' && 'border-blue-200 dark:border-blue-700'
            )}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {icons[t.type]}
            <span className="text-gray-700 dark:text-gray-200">{t.message}</span>
            <button
              onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
