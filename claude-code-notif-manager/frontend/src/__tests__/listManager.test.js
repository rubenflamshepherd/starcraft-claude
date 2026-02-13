import { describe, it, expect } from 'vitest';
import {
  migrateToMultiList,
  createEmptyHooks,
  normalizeHooks,
  createList,
  deleteList,
  renameList,
  setActiveList,
  getActiveList,
  addRecommendation,
  removeRecommendation,
  moveRecommendation,
  reorderRecommendations,
} from '../utils/listManager';

const defaultSetup = {
  hooks: [
    { name: 'SessionStart', description: 'When Claude Code starts', recommendations: [{ text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' }] },
    { name: 'Stop', description: 'When Claude finishes', recommendations: [] },
  ],
};

function makeState(overrides = {}) {
  return {
    lists: [
      {
        id: 'default',
        name: 'Recommended',
        hooks: [
          { name: 'SessionStart', description: 'When Claude Code starts', recommendations: [{ text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' }] },
          { name: 'Stop', description: 'When Claude finishes', recommendations: [] },
        ],
      },
    ],
    activeListId: 'default',
    ...overrides,
  };
}

function makeStateWithTwo() {
  return {
    lists: [
      {
        id: 'default',
        name: 'Recommended',
        hooks: [
          { name: 'SessionStart', description: 'desc', recommendations: [{ text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' }] },
          { name: 'Stop', description: 'desc', recommendations: [] },
        ],
      },
      {
        id: 'custom-1',
        name: 'My List',
        hooks: [
          { name: 'SessionStart', description: 'desc', recommendations: [] },
          { name: 'Stop', description: 'desc', recommendations: [{ text: 'Bye', unit: 'Marine', race: 'terran', audioUrl: 'http://b.mp3' }] },
        ],
      },
    ],
    activeListId: 'custom-1',
  };
}

// ─── migrateToMultiList ────────────────────────────────────────────────────────

describe('migrateToMultiList', () => {
  it('wraps old format (has hooks, no lists) into new format', () => {
    const oldData = { hooks: [{ name: 'SessionStart', description: 'd', recommendations: [] }] };
    const result = migrateToMultiList(oldData, defaultSetup);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].id).toBe('default');
    expect(result.lists[0].name).toBe('Recommended');
    expect(result.lists[0].hooks).toHaveLength(6);
    expect(result.lists[0].hooks.map(h => h.name)).toEqual([
      'SessionStart',
      'UserPromptSubmit',
      'Stop',
      'PreCompact',
      'PermissionPrompt',
      'Question',
    ]);
    expect(result.activeListId).toBe('default');
  });

  it('normalizes new format lists by adding missing standard hooks', () => {
    const newData = makeState();
    const result = migrateToMultiList(newData, defaultSetup);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].hooks).toHaveLength(6);
    expect(result.lists[0].hooks.find(h => h.name === 'SessionStart').recommendations).toHaveLength(1);
  });

  it('keeps existing recommendations while adding missing hooks', () => {
    const oldData = {
      hooks: [
        { name: 'Stop', description: 'When Claude finishes', recommendations: [{ text: 'Done', unit: 'SCV', race: 'terran', audioUrl: 'http://done.mp3' }] },
      ],
    };
    const result = migrateToMultiList(oldData, defaultSetup);
    const stopHook = result.lists[0].hooks.find(h => h.name === 'Stop');
    expect(stopHook.recommendations).toHaveLength(1);
    expect(stopHook.recommendations[0].audioUrl).toBe('http://done.mp3');
  });

  it('returns default setup wrapped as multi-list when data is null', () => {
    const result = migrateToMultiList(null, defaultSetup);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].hooks).toEqual(defaultSetup.hooks);
    expect(result.activeListId).toBe('default');
  });

  it('returns default setup wrapped as multi-list when data is undefined', () => {
    const result = migrateToMultiList(undefined, defaultSetup);
    expect(result.lists).toHaveLength(1);
    expect(result.activeListId).toBe('default');
  });
});

// ─── normalizeHooks ────────────────────────────────────────────────────────────

describe('normalizeHooks', () => {
  it('returns all standard hooks and preserves existing hook data', () => {
    const hooks = normalizeHooks([
      { name: 'Stop', description: 'desc', recommendations: [{ text: 'Done', unit: 'SCV', race: 'terran', audioUrl: 'http://done.mp3' }] },
    ]);

    expect(hooks).toHaveLength(6);
    expect(hooks.map(h => h.name)).toEqual([
      'SessionStart',
      'UserPromptSubmit',
      'Stop',
      'PreCompact',
      'PermissionPrompt',
      'Question',
    ]);
    expect(hooks.find(h => h.name === 'Stop').recommendations).toHaveLength(1);
  });
});

// ─── createEmptyHooks ──────────────────────────────────────────────────────────

describe('createEmptyHooks', () => {
  it('returns 6 hooks with empty recommendations', () => {
    const hooks = createEmptyHooks();
    expect(hooks).toHaveLength(6);
    hooks.forEach(hook => {
      expect(hook.recommendations).toEqual([]);
      expect(hook.name).toBeTruthy();
      expect(hook.description).toBeTruthy();
    });
  });

  it('includes all standard hook names', () => {
    const hooks = createEmptyHooks();
    const names = hooks.map(h => h.name);
    expect(names).toEqual([
      'SessionStart',
      'UserPromptSubmit',
      'Stop',
      'PreCompact',
      'PermissionPrompt',
      'Question',
    ]);
  });
});

// ─── createList ────────────────────────────────────────────────────────────────

describe('createList', () => {
  it('adds a new list with empty hooks and sets it as active', () => {
    const state = makeState();
    const result = createList(state, 'My Custom');
    expect(result.lists).toHaveLength(2);
    expect(result.lists[1].name).toBe('My Custom');
    expect(result.lists[1].hooks).toHaveLength(6);
    result.lists[1].hooks.forEach(h => expect(h.recommendations).toEqual([]));
    expect(result.activeListId).toBe(result.lists[1].id);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    createList(state, 'New');
    expect(state).toEqual(original);
  });

  it('generates a unique id for each new list', () => {
    const state = makeState();
    const r1 = createList(state, 'A');
    const r2 = createList(state, 'B');
    expect(r1.lists[1].id).not.toBe(r2.lists[1].id);
  });
});

// ─── deleteList ────────────────────────────────────────────────────────────────

describe('deleteList', () => {
  it('removes a custom list and falls back active to default', () => {
    const state = makeStateWithTwo();
    const result = deleteList(state, 'custom-1');
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].id).toBe('default');
    expect(result.activeListId).toBe('default');
  });

  it('prevents deleting the default list', () => {
    const state = makeState();
    const result = deleteList(state, 'default');
    expect(result.lists).toHaveLength(1);
    expect(result).toEqual(state);
  });

  it('does not mutate the input state', () => {
    const state = makeStateWithTwo();
    const original = JSON.parse(JSON.stringify(state));
    deleteList(state, 'custom-1');
    expect(state).toEqual(original);
  });

  it('keeps active list unchanged if deleting a non-active list', () => {
    const state = makeStateWithTwo();
    state.activeListId = 'default';
    const result = deleteList(state, 'custom-1');
    expect(result.activeListId).toBe('default');
  });
});

// ─── renameList ────────────────────────────────────────────────────────────────

describe('renameList', () => {
  it('renames a list', () => {
    const state = makeState();
    const result = renameList(state, 'default', 'All Protoss');
    expect(result.lists[0].name).toBe('All Protoss');
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    renameList(state, 'default', 'New Name');
    expect(state).toEqual(original);
  });

  it('returns state unchanged for non-existent list id', () => {
    const state = makeState();
    const result = renameList(state, 'nonexistent', 'Foo');
    expect(result).toEqual(state);
  });
});

// ─── setActiveList ─────────────────────────────────────────────────────────────

describe('setActiveList', () => {
  it('switches the active list', () => {
    const state = makeStateWithTwo();
    const result = setActiveList(state, 'default');
    expect(result.activeListId).toBe('default');
  });

  it('does not mutate the input state', () => {
    const state = makeStateWithTwo();
    const original = JSON.parse(JSON.stringify(state));
    setActiveList(state, 'default');
    expect(state).toEqual(original);
  });
});

// ─── getActiveList ─────────────────────────────────────────────────────────────

describe('getActiveList', () => {
  it('returns the active list object', () => {
    const state = makeState();
    const active = getActiveList(state);
    expect(active.id).toBe('default');
    expect(active.name).toBe('Recommended');
  });

  it('returns the correct list when active is a custom list', () => {
    const state = makeStateWithTwo();
    const active = getActiveList(state);
    expect(active.id).toBe('custom-1');
    expect(active.name).toBe('My List');
  });

  it('falls back to first list if activeListId is invalid', () => {
    const state = makeState({ activeListId: 'bogus' });
    const active = getActiveList(state);
    expect(active.id).toBe('default');
  });
});

// ─── addRecommendation ─────────────────────────────────────────────────────────

describe('addRecommendation', () => {
  it('adds a recommendation to the active list hook', () => {
    const state = makeState();
    const rec = { text: 'Go', unit: 'Zealot', race: 'protoss', audioUrl: 'http://z.mp3' };
    const result = addRecommendation(state, 'Stop', rec);
    const activeList = getActiveList(result);
    const stopHook = activeList.hooks.find(h => h.name === 'Stop');
    expect(stopHook.recommendations).toHaveLength(1);
    expect(stopHook.recommendations[0]).toEqual(rec);
  });

  it('does not add duplicate (same audioUrl)', () => {
    const state = makeState();
    const rec = { text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' };
    const result = addRecommendation(state, 'SessionStart', rec);
    const activeList = getActiveList(result);
    const hook = activeList.hooks.find(h => h.name === 'SessionStart');
    expect(hook.recommendations).toHaveLength(1);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    addRecommendation(state, 'Stop', { text: 'x', unit: 'y', race: 'z', audioUrl: 'http://new.mp3' });
    expect(state).toEqual(original);
  });
});

// ─── removeRecommendation ──────────────────────────────────────────────────────

describe('removeRecommendation', () => {
  it('removes a recommendation by audioUrl from the active list', () => {
    const state = makeState();
    const result = removeRecommendation(state, 'SessionStart', 'http://a.mp3');
    const activeList = getActiveList(result);
    const hook = activeList.hooks.find(h => h.name === 'SessionStart');
    expect(hook.recommendations).toHaveLength(0);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    removeRecommendation(state, 'SessionStart', 'http://a.mp3');
    expect(state).toEqual(original);
  });
});

// ─── moveRecommendation ────────────────────────────────────────────────────────

describe('moveRecommendation', () => {
  it('moves a recommendation from one hook to another in the active list', () => {
    const state = makeState();
    const rec = { text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' };
    const result = moveRecommendation(state, 'SessionStart', 'Stop', rec);
    const activeList = getActiveList(result);
    expect(activeList.hooks.find(h => h.name === 'SessionStart').recommendations).toHaveLength(0);
    expect(activeList.hooks.find(h => h.name === 'Stop').recommendations).toHaveLength(1);
    expect(activeList.hooks.find(h => h.name === 'Stop').recommendations[0].audioUrl).toBe('http://a.mp3');
  });

  it('does not add duplicate in target hook', () => {
    const state = makeState();
    // Add the same rec to Stop first
    const rec = { text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' };
    const withDup = addRecommendation(state, 'Stop', rec);
    const result = moveRecommendation(withDup, 'SessionStart', 'Stop', rec);
    const activeList = getActiveList(result);
    expect(activeList.hooks.find(h => h.name === 'Stop').recommendations).toHaveLength(1);
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    moveRecommendation(state, 'SessionStart', 'Stop', { text: 'Hello', unit: 'Probe', race: 'protoss', audioUrl: 'http://a.mp3' });
    expect(state).toEqual(original);
  });
});

// ─── reorderRecommendations ────────────────────────────────────────────────────

describe('reorderRecommendations', () => {
  it('reorders recommendations within a hook in the active list', () => {
    const state = makeState();
    // Add a second recommendation so we have something to reorder
    const rec2 = { text: 'World', unit: 'Zealot', race: 'protoss', audioUrl: 'http://b.mp3' };
    const stateWith2 = addRecommendation(state, 'SessionStart', rec2);
    const result = reorderRecommendations(stateWith2, 'SessionStart', 0, 1);
    const activeList = getActiveList(result);
    const hook = activeList.hooks.find(h => h.name === 'SessionStart');
    expect(hook.recommendations[0].audioUrl).toBe('http://b.mp3');
    expect(hook.recommendations[1].audioUrl).toBe('http://a.mp3');
  });

  it('does not mutate the input state', () => {
    const state = makeState();
    const rec2 = { text: 'World', unit: 'Zealot', race: 'protoss', audioUrl: 'http://b.mp3' };
    const stateWith2 = addRecommendation(state, 'SessionStart', rec2);
    const original = JSON.parse(JSON.stringify(stateWith2));
    reorderRecommendations(stateWith2, 'SessionStart', 0, 1);
    expect(stateWith2).toEqual(original);
  });
});
