import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusPill } from './StatusPill';

function RankingCard({
  store,
  rank,
  isDragging,
  isOverlay = false,
  listeners = {},
  attributes = {},
  setNodeRef,
  style,
  onOpen
}) {
  const visitDate = store.record.lastVisitedOn || store.record.firstVisitedOn || '未記録';

  return (
    <article
      ref={setNodeRef}
      className={`ranking-board__item ${rank <= 3 ? `is-podium-${rank}` : ''} ${
        isDragging ? 'is-dragging' : ''
      } ${isOverlay ? 'is-overlay' : ''}`}
      style={style}
    >
      <div className="ranking-board__rank">
        <span>#{rank}</span>
      </div>

      <div className="ranking-board__body">
        <div className="ranking-board__title">
          <strong>{store.name}</strong>
          <StatusPill status={store.record.status} />
        </div>
        <p>
          {store.prefecture} / {store.area}
        </p>
        {store.storeStatus === 'closed' && (
          <small>{store.statusNote ?? '閉店済みの履歴店'}</small>
        )}
        <small>最終記録 {visitDate}</small>
        {store.record.note && <em>{store.record.note}</em>}
      </div>

      <div className="ranking-board__actions">
        {!isOverlay && (
          <button
            type="button"
            className="ghost-button ranking-board__edit"
            onClick={() => onOpen(store.id, 'ranking')}
          >
            編集
          </button>
        )}
        <button
          type="button"
          className="ranking-board__handle"
          aria-label={`${store.name} を並び替える`}
          {...attributes}
          {...listeners}
        >
          ≡
        </button>
      </div>
    </article>
  );
}

function SortableRankingCard({ store, rank, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: store.id
    });

  return (
    <RankingCard
      store={store}
      rank={rank}
      isDragging={isDragging}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      onOpen={onOpen}
    />
  );
}

export function RankingTab({
  stores,
  visitedCount,
  onOpen,
  onReorder,
  onNavigateStores
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const [activeStoreId, setActiveStoreId] = useState(null);
  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;

  function handleDragStart(event) {
    setActiveStoreId(String(event.active.id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    setActiveStoreId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = stores.findIndex((store) => store.id === active.id);
    const newIndex = stores.findIndex((store) => store.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorder(arrayMove(stores.map((store) => store.id), oldIndex, newIndex));
  }

  return (
    <section className="section-card tab-screen ranking-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>ランキング</h2>
        </div>
        <p className="section-copy">
          訪問済み店舗の並び順がそのまま順位になります。右端のハンドルを長押しして並べ替えてください。
        </p>
      </div>

      <div className="ranking-board__summary">
        <article className="summary-card summary-card--compact">
          <p>訪問済み</p>
          <strong>{visitedCount}</strong>
          <span>ランキング対象</span>
        </article>
        <article className="summary-card summary-card--compact">
          <p>現在の並び</p>
          <strong>{stores.length}</strong>
          <span>自動保存されます</span>
        </article>
      </div>

      {stores.length > 0 ? (
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveStoreId(null)}
        >
          <SortableContext
            items={stores.map((store) => store.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="ranking-board__list">
              {stores.map((store, index) => (
                <SortableRankingCard
                  key={store.id}
                  store={store}
                  rank={index + 1}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeStore ? (
              <RankingCard
                store={activeStore}
                rank={stores.findIndex((store) => store.id === activeStore.id) + 1}
                isOverlay
                onOpen={onOpen}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="ranking-board__empty">
          <p className="empty-state">
            訪問済みの店舗がまだありません。まずは店舗一覧から「行った」を付けると、ここに自動で追加されます。
          </p>
          <button
            type="button"
            className="primary-button ranking-board__empty-button"
            onClick={onNavigateStores}
          >
            店舗一覧へ移動
          </button>
        </div>
      )}
    </section>
  );
}
