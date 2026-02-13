import { useMemo, useState } from 'react';
import ModalDialog from '../ui/ModalDialog';

export default function SetupActionsPanel({
  lists,
  activeListId,
  hooks,
  isSaving,
  isDownloading,
  downloadProgress,
  saveResult,
  onSetActiveList,
  onCreateList,
  onRenameList,
  onDeleteList,
  onSaveToSounds,
  onDownloadAll,
  onExportSetup,
  onImportSetup,
}) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId),
    [lists, activeListId]
  );

  const totalSounds = hooks.reduce((sum, hook) => sum + hook.recommendations.length, 0);

  const openCreateDialog = () => {
    setDialogMode('create');
    setInputValue('');
  };

  const openRenameDialog = () => {
    setDialogMode('rename');
    setInputValue(activeList?.name || '');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setInputValue('');
  };

  const submitDialog = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (dialogMode === 'create') onCreateList?.(trimmed);
    if (dialogMode === 'rename') onRenameList?.(activeListId, trimmed);
    closeDialog();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <select
              value={activeListId}
              onChange={(e) => onSetActiveList?.(e.target.value)}
              className="rounded-lg border border-amber-500/40 bg-transparent px-2 py-1 text-xl font-semibold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id} className="bg-slate-900 text-amber-300">
                  {list.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={openCreateDialog}
              className="rounded-lg bg-amber-500/20 p-1.5 text-amber-300 hover:bg-amber-500/30"
              title="Create list"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openRenameDialog}
              className="rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
              title="Rename list"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setDialogMode('delete')}
              disabled={activeListId === 'default'}
              className="rounded-lg bg-white/10 p-1.5 text-slate-300 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              title={activeListId === 'default' ? 'Default list cannot be deleted' : 'Delete list'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-slate-400">
            {totalSounds} sounds across {hooks.length} hooks.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveToSounds}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-green-500/20 px-4 py-2 text-green-300 transition-colors hover:bg-green-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Sync to .claude'}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettingsMenu((prev) => !prev)}
              className="rounded-lg bg-white/10 p-2 text-slate-300 hover:bg-white/20"
              title="More options"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettingsMenu ? (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} aria-label="Close settings" />
                <div className="surface-panel-strong absolute right-0 top-full z-50 mt-2 w-52 rounded-lg py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadAll?.();
                      setShowSettingsMenu(false);
                    }}
                    disabled={isDownloading}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60"
                  >
                    {isDownloading ? `Downloading ${downloadProgress.current}/${downloadProgress.total}` : 'Download ZIP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExportSetup?.();
                      setShowSettingsMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                  >
                    Export Setup JSON
                  </button>
                  <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                    Import Setup JSON
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(event) => {
                        onImportSetup?.(event);
                        setShowSettingsMenu(false);
                      }}
                    />
                  </label>
                </div>
              </>
            ) : null}
          </div>

          {saveResult ? (
            <div className={`absolute -bottom-10 right-0 rounded px-3 py-1.5 text-sm ${saveResult.success ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
              {saveResult.success
                ? `Synced: ${saveResult.saved} new, ${saveResult.skipped} existing, ${saveResult.deleted} removed`
                : `Error: ${saveResult.error}`}
            </div>
          ) : null}
        </div>
      </div>

      <ModalDialog
        open={dialogMode === 'create' || dialogMode === 'rename'}
        title={dialogMode === 'create' ? 'Create List' : 'Rename List'}
        onClose={closeDialog}
        footer={(
          <>
            <button type="button" onClick={closeDialog} className="rounded-md border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/10">
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDialog}
              className="rounded-md bg-amber-500/25 px-3 py-1.5 text-amber-200 hover:bg-amber-500/35"
            >
              Save
            </button>
          </>
        )}
      >
        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Name</label>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          placeholder="List name"
          autoFocus
        />
      </ModalDialog>

      <ModalDialog
        open={dialogMode === 'delete'}
        title="Delete List"
        onClose={closeDialog}
        footer={(
          <>
            <button type="button" onClick={closeDialog} className="rounded-md border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/10">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteList?.(activeListId);
                closeDialog();
              }}
              className="rounded-md bg-red-500/25 px-3 py-1.5 text-red-100 hover:bg-red-500/35"
            >
              Delete
            </button>
          </>
        )}
      >
        Delete <span className="font-semibold text-white">{activeList?.name}</span>? This cannot be undone.
      </ModalDialog>
    </>
  );
}
