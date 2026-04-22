import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem { id: number; type: ToastType; message: string; }

let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;
let _id = 0;

export function toast(message: string, type: ToastType = 'info') {
  _setToasts?.(prev => [...prev, { id: ++_id, type, message }]);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  _setToasts = setToasts;

  const remove = (id: number) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} item={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = item.type === 'success' ? CheckCircle : item.type === 'error' ? XCircle : Info;

  return (
    <div className={`toast toast-${item.type}`}>
      <Icon size={16} />
      <span>{item.message}</span>
      <button className="toast-close" onClick={onClose}><X size={14} /></button>
    </div>
  );
}
