const HOOK_DEFINITIONS = [
  { name: 'SessionStart', description: 'When Claude Code starts or resumes a session' },
  { name: 'UserPromptSubmit', description: 'When user submits a prompt' },
  { name: 'Stop', description: 'When Claude finishes responding' },
  { name: 'PreCompact', description: 'Before conversation context is compacted' },
  { name: 'PermissionPrompt', description: 'When Claude needs permission to use a tool' },
  { name: 'Question', description: 'When Claude asks the user a question' },
];

export function normalizeHooks(hooks = []) {
  const hookMap = new Map(hooks.map(hook => [hook.name, hook]));

  const normalizedStandardHooks = HOOK_DEFINITIONS.map(definition => {
    const existing = hookMap.get(definition.name);
    if (!existing) {
      return { ...definition, recommendations: [] };
    }

    return {
      ...existing,
      description: existing.description || definition.description,
      recommendations: Array.isArray(existing.recommendations) ? existing.recommendations : [],
    };
  });

  // Preserve unknown hook entries for forward compatibility.
  const knownHookNames = new Set(HOOK_DEFINITIONS.map(definition => definition.name));
  const unknownHooks = hooks
    .filter(hook => !knownHookNames.has(hook.name))
    .map(hook => ({
      ...hook,
      recommendations: Array.isArray(hook.recommendations) ? hook.recommendations : [],
    }));

  return [...normalizedStandardHooks, ...unknownHooks];
}

export function createEmptyHooks() {
  return HOOK_DEFINITIONS.map(h => ({ ...h, recommendations: [] }));
}

export function migrateToMultiList(data, defaultSetup) {
  if (!data) {
    return {
      lists: [{ id: 'default', name: 'Recommended', hooks: defaultSetup.hooks }],
      activeListId: 'default',
    };
  }
  if (data.lists) {
    return {
      ...data,
      lists: data.lists.map(list => ({
        ...list,
        hooks: normalizeHooks(list.hooks || []),
      })),
    };
  }
  // Old format: has hooks but no lists
  return {
    lists: [{ id: 'default', name: 'Recommended', hooks: normalizeHooks(data.hooks || []) }],
    activeListId: 'default',
  };
}

export function createList(state, name) {
  const newList = {
    id: crypto.randomUUID(),
    name,
    hooks: createEmptyHooks(),
  };
  return {
    ...state,
    lists: [...state.lists, newList],
    activeListId: newList.id,
  };
}

export function deleteList(state, listId) {
  if (listId === 'default') return state;
  const newLists = state.lists.filter(l => l.id !== listId);
  return {
    ...state,
    lists: newLists,
    activeListId: state.activeListId === listId ? 'default' : state.activeListId,
  };
}

export function renameList(state, listId, newName) {
  if (!state.lists.some(l => l.id === listId)) return state;
  return {
    ...state,
    lists: state.lists.map(l => l.id === listId ? { ...l, name: newName } : l),
  };
}

export function setActiveList(state, listId) {
  return { ...state, activeListId: listId };
}

export function getActiveList(state) {
  return state.lists.find(l => l.id === state.activeListId) || state.lists[0];
}

function updateActiveListHooks(state, hookName, updateFn) {
  return {
    ...state,
    lists: state.lists.map(list => {
      if (list.id !== (state.lists.find(l => l.id === state.activeListId) || state.lists[0]).id) return list;
      return {
        ...list,
        hooks: list.hooks.map(hook => hook.name === hookName ? updateFn(hook) : hook),
      };
    }),
  };
}

export function addRecommendation(state, hookName, rec) {
  return updateActiveListHooks(state, hookName, hook => {
    if (hook.recommendations.some(r => r.audioUrl === rec.audioUrl)) return hook;
    return { ...hook, recommendations: [...hook.recommendations, rec] };
  });
}

export function removeRecommendation(state, hookName, audioUrl) {
  return updateActiveListHooks(state, hookName, hook => ({
    ...hook,
    recommendations: hook.recommendations.filter(r => r.audioUrl !== audioUrl),
  }));
}

export function moveRecommendation(state, fromHookName, toHookName, rec) {
  const activeList = getActiveList(state);
  return {
    ...state,
    lists: state.lists.map(list => {
      if (list.id !== activeList.id) return list;
      return {
        ...list,
        hooks: list.hooks.map(hook => {
          if (hook.name === fromHookName) {
            return { ...hook, recommendations: hook.recommendations.filter(r => r.audioUrl !== rec.audioUrl) };
          }
          if (hook.name === toHookName) {
            if (hook.recommendations.some(r => r.audioUrl === rec.audioUrl)) return hook;
            return { ...hook, recommendations: [...hook.recommendations, rec] };
          }
          return hook;
        }),
      };
    }),
  };
}

export function reorderRecommendations(state, hookName, oldIndex, newIndex) {
  return updateActiveListHooks(state, hookName, hook => {
    const newRecs = [...hook.recommendations];
    const [removed] = newRecs.splice(oldIndex, 1);
    newRecs.splice(newIndex, 0, removed);
    return { ...hook, recommendations: newRecs };
  });
}
