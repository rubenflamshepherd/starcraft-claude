import { useState } from 'react';

export default function AppShell({ sidebar, title, subtitle, children, contentClassName = '' }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="hidden lg:flex lg:w-80 lg:shrink-0 lg:border-r lg:border-white/10">
        {sidebar}
      </div>

      {isSidebarOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            aria-label="Close navigation"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-80 border-r border-white/10 bg-slate-950 lg:hidden">
            {sidebar}
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 lg:hidden"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-white">{title}</h1>
              {subtitle ? <p className="truncate text-sm text-slate-400">{subtitle}</p> : null}
            </div>
          </div>
        </header>

        <main className={`min-h-0 flex-1 overflow-hidden ${contentClassName}`}>{children}</main>
      </div>
    </div>
  );
}
