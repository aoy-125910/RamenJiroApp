import { useEffect, useState } from 'react';
import { MapPreview } from './components/MapPreview';
import { RecordDrawer } from './components/RecordDrawer';
import { StatusPill } from './components/StatusPill';
import { StoreCard } from './components/StoreCard';
import { stores } from './data/stores';
import {
  createEmptyRecord,
  loadRecords,
  normalizeRecordInput,
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

export default function App() {
  const [records, setRecords] = useState(() => loadRecords());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? null);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [selectionSource, setSelectionSource] = useState('initial');

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const storesWithRecords = stores.map((store) => ({
    ...store,
    record: {
      ...createEmptyRecord(),
      ...(records[store.id] ?? {})
    }
  }));

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

  const filteredStores = storesWithRecords.filter(
    (store) => matchesFilter(statusFilter, store) && includesQuery(query, store)
  );

  const rankedStores = storesWithRecords
    .filter((store) => store.record.status === 'visited' && store.record.rank)
    .sort((left, right) => {
      const rankDiff = Number(left.record.rank) - Number(right.record.rank);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return left.name.localeCompare(right.name, 'ja');
    });

  const noteStores = storesWithRecords.filter((store) => store.record.note).slice(0, 3);

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
      note: '順位メモあり'
    },
    {
      label: '都府県',
      value: prefectureCount,
      note: '掲載エリア'
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

  return (
    <>
      <main className="app-shell">
        <header className="hero-card">
          <div className="hero-card__stamp">Local Record</div>

          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Map First Jiro Log</p>
              <h1>二郎訪問ログ</h1>
              <p className="hero-lead">
                店舗の位置を地図で見比べながら、訪問済み・行きたい・個人ランキングを1つの画面で整理できます。
                記録はこの端末だけに保存されます。
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

        <div className="map-stack">
          <MapPreview
            stores={filteredStores}
            totalStoreCount={storesWithRecords.length}
            selectedStoreId={selectedStoreId}
            selectedStore={selectedStore}
            selectionSource={selectionSource}
            onSelect={handleMapSelect}
            onOpen={openEditor}
          />

          <section className="section-card store-section">
            <div className="section-heading store-section__heading">
              <div>
                <p className="eyebrow">Store Ledger</p>
                <h2>店舗一覧</h2>
              </div>
              <p className="section-copy">
                地図で全体を見て、一覧で細かく記録する流れにしています。検索と絞り込みはスクロール中も追いかけます。
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
        </div>

        <section className="two-column record-columns">
          <article className="section-card ledger-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranking</p>
                <h2>訪問済みランキング</h2>
              </div>
            </div>

            {rankedStores.length > 0 ? (
              <ol className="ranking-list">
                {rankedStores.map((store) => (
                  <li key={store.id}>
                    <button type="button" onClick={() => openEditor(store.id)}>
                      <span className="ranking-list__index">#{store.record.rank}</span>
                      <span>
                        <strong>{store.name}</strong>
                        <small>
                          {store.prefecture} / {store.area}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">
                訪問済み店舗に順位を付けると、ここにランキングが出ます。
              </p>
            )}
          </article>

          <article className="section-card ledger-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Notes</p>
                <h2>最近のメモ</h2>
              </div>
            </div>

            {noteStores.length > 0 ? (
              <div className="note-list">
                {noteStores.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    className="note-card"
                    onClick={() => openEditor(store.id)}
                  >
                    <strong>{store.name}</strong>
                    <p>{store.record.note}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                店舗メモを書き始めると、ここにすぐ見返せる形で並びます。
              </p>
            )}
          </article>
        </section>
      </main>

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
