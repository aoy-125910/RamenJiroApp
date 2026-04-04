import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { BottomTabBar } from './components/BottomTabBar';
import { MapPreview } from './components/MapPreview';
import { RankingTab } from './components/RankingTab';
import { RecordDrawer } from './components/RecordDrawer';
import { StatusPill } from './components/StatusPill';
import { StoreCard } from './components/StoreCard';
import { storeDataMeta, stores } from './data/stores';
import { createBackupPayload, parseBackupText } from './lib/backup';
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

  return [store.name, store.prefecture, store.area, store.address ?? '']
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function formatDateLabel(value) {
  return value ? String(value).slice(0, 10) : '';
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
  const [backupFeedback, setBackupFeedback] = useState(null);
  const importInputRef = useRef(null);
  const validStoreIds = new Set(stores.map((store) => store.id));

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
  const activeStores = storesWithRecords.filter(
    (store) => store.storeStatus !== 'closed'
  );
  const visitedStoreIds = storesWithRecords
    .filter((store) => store.record.status === 'visited')
    .map((store) => store.id);

  const visitedCount = storesWithRecords.filter(
    (store) => store.record.status === 'visited'
  ).length;
  const visitedActiveCount = activeStores.filter(
    (store) => store.record.status === 'visited'
  ).length;
  const wishlistCount = storesWithRecords.filter(
    (store) => store.record.status === 'wishlist'
  ).length;
  const prefectureCount = new Set(
    storesWithRecords.map((store) => store.prefecture)
  ).size;
  const activeStoreCount = activeStores.length;
  const archivedStoreCount = storesWithRecords.length - activeStoreCount;
  const completionRate =
    activeStoreCount === 0 ? 0 : (visitedActiveCount / activeStoreCount) * 100;

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
      note: `現行店達成率 ${formatPercent(completionRate)}`
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
      note: `現行${activeStoreCount}店 / 履歴${archivedStoreCount}店`
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

  async function handleExportBackup() {
    try {
      const payload = createBackupPayload({
        records,
        rankingStoreIds,
        storeDataMeta
      });
      const serialized = JSON.stringify(payload, null, 2);
      const filename = `jiro-log-backup-${formatDateLabel(
        new Date().toISOString()
      )}.json`;
      const blob = new Blob([serialized], {
        type: 'application/json'
      });

      if (
        typeof File !== 'undefined' &&
        typeof navigator !== 'undefined'
      ) {
        const file = new File([blob], filename, {
          type: 'application/json'
        });

        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: '二郎訪問ログのバックアップ',
              files: [file]
            });
            setBackupFeedback({
              tone: 'success',
              message:
                '共有シートを開きました。ファイルアプリなどに保存しておくと安心です。'
            });
            return;
          } catch (error) {
            if (error?.name === 'AbortError') {
              return;
            }
          }
        }
      }

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 0);

      setBackupFeedback({
        tone: 'success',
        message: 'JSONバックアップを保存しました。'
      });
    } catch {
      setBackupFeedback({
        tone: 'error',
        message: 'バックアップの書き出しに失敗しました。'
      });
    }
  }

  function openImportPicker() {
    importInputRef.current?.click();
  }

  async function handleImportBackup(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const nextData = parseBackupText(text, validStoreIds);
      const nextVisitedCount = Object.values(nextData.records).filter(
        (record) => record.status === 'visited'
      ).length;
      const shouldReplace = window.confirm(
        `${file.name} の内容で現在の記録を置き換えますか？`
      );

      if (!shouldReplace) {
        return;
      }

      setRecords(nextData.records);
      setRankingStoreIds(nextData.rankingStoreIds);
      setBackupFeedback({
        tone: 'success',
        message: `${file.name} を読み込みました。訪問済み ${nextVisitedCount} 店舗です。`
      });
    } catch (error) {
      setBackupFeedback({
        tone: 'error',
        message: error?.message ?? 'バックアップの読み込みに失敗しました。'
      });
    } finally {
      event.target.value = '';
    }
  }

  return (
    <>
      <main className="app-shell">
        {activeTab === 'map' && (
          <>
            <header className="hero-card">
              <div className="hero-card__stamp">
                Current {activeStoreCount} Stores
              </div>

              <div className="hero-grid">
                <div className="hero-copy">
                  <p className="eyebrow">Map First Jiro Log</p>
                  <h1>二郎訪問ログ</h1>
                  <p className="hero-lead">
                    店舗の位置を地図で見比べながら、訪問済み・行きたい・ランキングを1つのアプリで整理できます。
                    iPhoneのホーム画面に追加しても使いやすいよう、片手操作を前提に整えています。
                    現在は現行45店舗を基準にしつつ、履歴店も一緒に記録できます。
                  </p>
                </div>

                <div className="hero-aside">
                  <div className="hero-meter">
                    <p className="hero-meter__label">全体の達成率</p>
                    <div className="hero-meter__ring">
                      <strong>{formatPercent(completionRate)}</strong>
                      <span>
                        {visitedActiveCount} / {activeStoreCount} 現行店舗
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
                          <small>
                            {filteredStores.length} 店舗を表示中 / 更新 {storeDataMeta.verifiedOn}
                          </small>
                        </div>
                        {selectedStore.storeStatus === 'closed' && (
                          <p className="hero-note__store-status">
                            {selectedStore.statusNote ?? '閉店済みの履歴店です。'}
                          </p>
                        )}
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

            <section className="utility-card backup-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Backup</p>
                  <h3>バックアップ</h3>
                </div>
                <p className="section-copy">
                  JSONで記録を書き出し・読み込みできます。iPhoneでは共有シート優先、非対応環境では通常ダウンロードに切り替わります。
                </p>
              </div>

              <div className="backup-card__meta">
                <p>現行 {activeStoreCount} 店 / 履歴 {archivedStoreCount} 店</p>
                <p>店舗データ確認日 {storeDataMeta.verifiedOn}</p>
                <p>{prefectureCount} 都道府県を掲載</p>
              </div>

              <div className="backup-card__actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleExportBackup}
                >
                  JSONを保存
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={openImportPicker}
                >
                  JSONを読み込む
                </button>
              </div>

              {backupFeedback && (
                <p
                  className={`backup-card__feedback is-${backupFeedback.tone}`}
                  aria-live="polite"
                >
                  {backupFeedback.message}
                </p>
              )}

              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                onChange={handleImportBackup}
              />
            </section>

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
                    {store.storeStatus === 'closed' && (
                      <span className="store-state-badge is-closed">
                        {store.statusNote ?? '閉店済み'}
                      </span>
                    )}
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
