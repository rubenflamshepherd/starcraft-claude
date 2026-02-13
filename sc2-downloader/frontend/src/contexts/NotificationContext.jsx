import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

let nextId = 1;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushNotification = useCallback((message, type = 'info') => {
    const id = nextId++;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 3500);
  }, [removeNotification]);

  const value = useMemo(() => ({ pushNotification }), [pushNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-80 flex-col gap-2">
        {notifications.map((notice) => (
          <div
            key={notice.id}
            className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg ${
              notice.type === 'error'
                ? 'border-red-500/50 bg-red-950/90 text-red-100'
                : notice.type === 'success'
                  ? 'border-green-500/50 bg-green-950/90 text-green-100'
                  : 'border-slate-600/60 bg-slate-900/90 text-slate-100'
            }`}
          >
            {notice.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
