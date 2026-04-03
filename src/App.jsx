import { useDeferredValue, useEffect, useState } from 'react';
import { BottomTabBar } from './components/BottomTabBar';
import { MapPreview } from './components/MapPreview';
import { RankingTab } from './components/RankingTab';
import { RecordDrawer } from './components/RecordDrawer';
import { StatusPill } from './components/StatusPill';
import { StoreCard } from './components/StoreCard';
import { stores } from './data/stores';
import {
  createEmptyRecord,
  loadRanking,
  loadRecords,
  normalizeRecordInput,
  saveRanking,
  saveRecords
} from './lib/storage';

const filterOptions = [
  { id: 'all', label: 'すべて' },
  { id: 'visited', label: '行った' },
  { id: 'wishlist', label: '行きたい' },
  { id: 'not_visited', label: '未訪問' }
];

function matchesFilter(statusFilter, store) {
  if (statusFilter === 'all') {
    return true;
  }

  return store.record.status === statusFilter;
}

function includesQuery(query, store) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();

  return [store.name, store.prefecture, store.area]
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function areSameOrder(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export default function App() {
  const [records, setRecords] = useState(() => loadRecords());
  const [rankingStoreIds, setRankingStoreIds] = useState(() => loadRanking());
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('map');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? null);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [selectionSource, setSelectionSource] = useState('initial');

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    saveRanking(rankingStoreIds);
  }, [rankingStoreIds]);

  const rankingPositionByStoreId = new Map(
    rankingStoreIds.map((storeId, index) => [storeId, index + 1])
  );

  const storesWithRecords = stores.map((store) => ({
    ...store,
    record: {
      ...createEmptyRecord(),
      ...(records[store.id] ?? {})
    },
    rankingPosition: rankingPositionByStoreId.get(store.id) ?? null
  }));

  const storeMap = new Map(storesWithRecords.map((store) => [store.id, store]));
  const visitedStoreIds = storesWithRecords
    .filter((store) => store.record.status === 'visited')
    .map((store) => store.id);

  const visitedCount = storesWithRecords.filter(
    (store) => store.record.status === 'visited'
  ).length;
  const wishlistCount = storesWithRecords.filter(
    (store) => store.record.status === 'wishlist'
  ).length;
  const prefectureCount = new Set(
    storesWithRecords.map((store) => store.prefecture)
  ).size;
  const completionRate = stores.length === 0 ? 0 : (visitedCount / stores.length) * 100;

  useEffect(() => {
    setRankingStoreIds((current) => {
      const next = [
        ...current.filter((storeId) => visitedStoreIds.includes(storeId)),
        ...visitedStoreIds.filter((storeId) => !current.includes(storeId))
      ];

      return areSameOrder(current, next) ? current : next;
    });
  }, [visitedStoreIds.join('|')]);

  const filteredStores = storesWithRecords.filter(
    (store) =>
      matchesFilter(statusFilter, store) && includesQuery(deferredQuery, store)
  );

  const rankedStores = rankingStoreIds
    .map((storeId) => storeMap.get(storeId))
    .filter((store) => store?.record.status === 'visited');

  const noteStores = storesWithRecords
    .filter((store) => store.record.note)
    .sort((left, right) => {
      const dateLeft = left.record.lastVisitedOn || left.record.firstVisitedOn || '';
      const dateRight = right.record.lastVisitedOn || right.record.firstVisitedOn || '';

      if (dateLeft !== dateRight) {
        return dateRight.localeCompare(dateLeft);
      }

      return left.name.localeCompare(right.name, 'ja');
    });

  useEffect(() => {
    if (filteredStores.length === 0) {
      return;
    }

    const isSelectedVisible = filteredStores.some(
      (store) => store.id === selectedStoreId
    );

    if (!isSelectedVisible) {
      setSelectedStoreId(filteredStores[0].id);
      setSelectionSource('filter');
    }
  }, [filteredStores, selectedStoreId]);

  const selectedStore =
    filteredStores.find((store) => store.id === selectedStoreId) ?? filteredStores[0] ?? null;
  const editingStore =
    storesWithRecords.find((store) => store.id === editingStoreId) ?? null;
  const heroSummaryItems = [
    {
      label: '訪問済み',
      value: visitedCount,
      note: `達成率 ${formatPercent(completionRate)}`
    },
    {
      label: '行きたい',
      value: wishlistCount,
      note: wishlistCount > 0 ? '気になる店舗を保存中' : 'あとで追加できます'
    },
    {
      label: 'ランキング',
      value: rankedStores.length,
      note: '並び替えで管理'
    },
    {
      label: 'メモ',
      value: noteStores.length,
      note: `${prefectureCount} 都府県を掲載`
    }
  ];

  function handleMapSelect(storeId) {
    setSelectionSource('map');
    setSelectedStoreId(storeId);
  }

  function openEditor(storeId, source = 'list') {
    setSelectionSource(source);
    setSelectedStoreId(storeId);
    setEditingStoreId(storeId);
  }

  function handleSave(storeId, nextRecord) {
    setRecords((current) => ({
      ...current,
      [storeId]: normalizeRecordInput(nextRecord)
    }));
  }

  function handleReset(storeId) {
    setRecords((current) => {
      const next = { ...current };
      delete next[storeId];
      return next;
    });
  }

  function handleRankingReorder(nextStoreIds) {
    setRankingStoreIds(nextStoreIds);
  }

  return (
    <>
      <main className="app-shell">
        {activeTab === 'map' && (
          <>
            <header className="hero-card">
              <div className="hero-card__stamp">Home Screen Ready</div>

              <div className="hero-grid">
                <div className="hero-copy">
                  <p className="eyebrow">Map First Jiro Log</p>
                  <h1>二郎訪問ログ</h1>
                  <p className="hero-lead">
                    店舗の位置を地図で見比べながら、訪問済み・行きたい・ランキングを1つのアプリで整理できます。
                    iPhoneのホーム画面に追加しても使いやすいよう、片手操作を前提に整えています。
                  </p>
                </div>

                <div className="hero-aside">
                  <div className="hero-meter">
                    <p className="hero-meter__label">全体の達成率</p>
                    <div className="hero-meter__ring">
                      <strong>{formatPercent(completionRate)}</strong>
                      <span>
                        {visitedCount} / {stores.length} 店舗
                      </span>
                    </div>
                  </div>

                  <div className="hero-note">
                    <p className="hero-note__label">現在のフォーカス</p>
                    {selectedStore ? (
                      <>
                        <strong>{selectedStore.name}</strong>
                        <span>
                          {selectedStore.prefecture} / {selectedStore.area}
                        </span>
                        <div className="hero-note__meta">
                          <StatusPill status={selectedStore.record.status} />
                          <small>{filteredStores.length} 店舗を表示中</small>
                        </div>
                      </>
                    ) : (
                      <>
                        <strong>該当店舗なし</strong>
                        <span>検索や絞り込み条件を調整してください</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="hero-strip" aria-label="概要サマリー">
                {heroSummaryItems.map((item) => (
                  <article key={item.label} className="summary-card summary-card--compact">
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                    <span>{item.note}</span>
                  </article>
                ))}
              </div>
            </header>

            <MapPreview
              stores={filteredStores}
              totalStoreCount={storesWithRecords.length}
              selectedStoreId={selectedStoreId}
              selectedStore={selectedStore}
              selectionSource={selectionSource}
              onSelect={handleMapSelect}
              onOpen={openEditor}
            />
          </>
        )}

        {activeTab === 'stores' && (
          <section className="section-card tab-screen">
            <div className="section-heading store-section__heading">
              <div>
                <p className="eyebrow">Store Ledger</p>
                <h2>店舗一覧</h2>
              </div>
              <p className="section-copy">
                検索や絞り込みを使いながら、各店舗の訪問状態やメモを手早く更新できます。
              </p>
            </div>

            <div className="toolbar">
              <label className="search-field">
                <span className="visually-hidden">店舗検索</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="店舗名、都道府県、エリアで検索"
                />
              </label>

              <div className="filter-row">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`filter-chip ${
                      statusFilter === option.id ? 'is-selected' : ''
                    }`}
                    onClick={() => setStatusFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="store-grid">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} onOpen={openEditor} />
              ))}
            </div>

            {filteredStores.length === 0 && (
              <p className="empty-state">条件に合う店舗がまだありません。</p>
            )}
          </section>
        )}

        {activeTab === 'ranking' && (
          <RankingTab
            stores={rankedStores}
            visitedCount={visitedCount}
            onOpen={openEditor}
            onReorder={handleRankingReorder}
            onNavigateStores={() => setActiveTab('stores')}
          />
        )}

        {activeTab === 'notes' && (
          <section className="section-card tab-screen ledger-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Notes</p>
                <h2>店舗メモ</h2>
              </div>
              <p className="section-copy">
                最近書いたメモをまとめて見返せます。気になった店舗はそのまま編集画面へ開けます。
              </p>
            </div>

            {noteStores.length > 0 ? (
              <div className="note-list">
                {noteStores.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    className="note-card"
                    onClick={() => openEditor(store.id, 'notes')}
                  >
                    <div className="note-card__top">
                      <strong>{store.name}</strong>
                      <StatusPill status={store.record.status} />
                    </div>
                    <p>{store.record.note}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                店舗メモを書き始めると、ここにまとめて並びます。
              </p>
            )}
          </section>
        )}
      </main>

      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />

      <RecordDrawer
        store={editingStore}
        record={editingStore?.record ?? createEmptyRecord()}
        onClose={() => setEditingStoreId(null)}
        onSave={handleSave}
        onReset={handleReset}
      />
    </>
  );
}
