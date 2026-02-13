import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuoteLine from '../QuoteLine';
import { getFactionStyles } from '../../utils/factionStyles';

function SortableRecommendation({ rec, hook, hookNames, onMoveRecommendation, onRemoveRecommendation }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rec.audioUrl });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/rec border-b border-white/10 last:border-b-0">
      <div className="flex items-center gap-2 px-3 pt-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className={`rounded px-2 py-0.5 text-xs ${getFactionStyles(rec.race).badgeBg} ${getFactionStyles(rec.race).primaryClass}`}>
          {rec.unit}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/rec:opacity-100">
          {hookNames.filter((name) => name !== hook.name).map((targetHook) => (
            <button
              key={targetHook}
              type="button"
              onClick={() => onMoveRecommendation?.(hook.name, targetHook, rec)}
              className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-500/40"
              title={`Move to ${targetHook}`}
            >
              {targetHook}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onRemoveRecommendation?.(hook.name, rec.audioUrl)}
            className="rounded p-1 hover:bg-red-500/20"
            title="Remove from recommendations"
          >
            <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <QuoteLine quote={{ text: rec.text, audioUrl: rec.audioUrl }} race={rec.race} unitName={rec.unit} categoryName={hook.name} />
    </div>
  );
}

export default function RecommendedHooksPanel({ hooks, onMoveRecommendation, onRemoveRecommendation, onReorderRecommendations }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hookNames = hooks.map((hook) => hook.name);
  const leftColumnHooks = hooks.filter((_, idx) => idx % 2 === 0);
  const rightColumnHooks = hooks.filter((_, idx) => idx % 2 === 1);

  const handleDragEnd = (hookName) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const hook = hooks.find((entry) => entry.name === hookName);
    const oldIndex = hook.recommendations.findIndex((rec) => rec.audioUrl === active.id);
    const newIndex = hook.recommendations.findIndex((rec) => rec.audioUrl === over.id);
    onReorderRecommendations?.(hookName, oldIndex, newIndex);
  };

  const renderHook = (hook) => (
    <section key={hook.name} id={`hook-${hook.name}`} className="mb-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-amber-400">{hook.name}</h2>
        <p className="text-sm text-slate-500">{hook.description}</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(hook.name)}>
        <SortableContext items={hook.recommendations.map((rec) => rec.audioUrl)} strategy={verticalListSortingStrategy}>
          <div className="surface-panel rounded-xl">
            {hook.recommendations.map((rec) => (
              <SortableRecommendation
                key={rec.audioUrl}
                rec={rec}
                hook={hook}
                hookNames={hookNames}
                onMoveRecommendation={onMoveRecommendation}
                onRemoveRecommendation={onRemoveRecommendation}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div>{leftColumnHooks.map(renderHook)}</div>
      <div>{rightColumnHooks.map(renderHook)}</div>
    </div>
  );
}
