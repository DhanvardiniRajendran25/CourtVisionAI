import { useEffect } from 'react';

export default function ErrorToast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-950/95 border border-red-500/40 text-red-100 text-sm px-4 py-3 rounded-xl shadow-2xl max-w-sm flex items-start gap-3 backdrop-blur">
      <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-200 shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
