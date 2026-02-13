import CustomSelect from './CustomSelect';

export default function HeaderNav({
  onGoHome,
  onGoToActiveList,
  lists,
  activeListId,
  onSetActiveList,
  onSyncToClaude,
  isSyncing,
  syncResult,
}) {
  return (
    <header className="border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGoHome}
          className="mr-3 flex items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-white/5"
          title="Go to home"
        >
          <img src="/claude-notif-logo.svg" alt="Claude Code Notif logo" className="h-12 w-12" />
          <p className="text-sm font-semibold text-white">Claude Code Notif Settings</p>
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-300">Active list is</span>
          <CustomSelect
            value={activeListId}
            onChange={onSetActiveList}
            options={lists.map((list) => ({ value: list.id, label: list.name }))}
            buttonClassName="px-3 py-2 text-sm min-w-[12rem] border-amber-500/40 bg-gray-900/70 hover:bg-gray-800/80 hover:border-amber-400/60"
          />
          <button
            type="button"
            onClick={onGoToActiveList}
            className="rounded-lg border border-amber-500/40 bg-gray-900/70 p-2 text-amber-300 transition-colors hover:border-amber-400/60 hover:bg-gray-800/80"
            title="Go to active list page"
            aria-label="Go to active list page"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7m0 0H9m8 0v8" />
            </svg>
          </button>
          <button
            onClick={onSyncToClaude}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            title="Save directly to ~/.claude/sounds/"
          >
            {isSyncing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span>Sync to Claude</span>
              </>
            )}
          </button>
          {syncResult && (
            <span className={`rounded px-2 py-1 text-xs ${syncResult.success ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
              {syncResult.success
                ? `Synced ${syncResult.saved} new, ${syncResult.skipped} existing`
                : `Sync failed: ${syncResult.error}`
              }
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
