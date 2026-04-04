import { StatusPill } from './StatusPill';

export function StoreCard({ store, onOpen }) {
  const { record } = store;
  const summaryText =
    store.storeStatus === 'closed'
      ? store.statusNote ?? '閉店済みの履歴店'
      : record.status === 'visited'
      ? record.lastVisitedOn
        ? `最終訪問 ${record.lastVisitedOn}`
        : '訪問記録あり'
      : record.status === 'wishlist'
        ? '気になる店舗として保存中'
        : 'まだ記録なし';

  return (
    <button
      type="button"
      className={`store-card is-${record.status} ${
        store.storeStatus === 'closed' ? 'is-store-closed' : ''
      }`}
      onClick={() => onOpen(store.id)}
      aria-label={`${store.name} の記録を開く`}
    >
      <div className="store-card__headerline">
        <p className="store-card__prefecture">{store.prefecture}</p>
        {store.rankingPosition && (
          <span className="store-card__rank">Rank #{store.rankingPosition}</span>
        )}
      </div>

      <div className="store-card__top">
        <div>
          <h3>{store.name}</h3>
          <p className="store-card__area">{store.area}</p>
        </div>
        <div className="store-card__badges">
          {store.storeStatus === 'closed' && (
            <span className="store-state-badge is-closed">閉店</span>
          )}
          <StatusPill status={record.status} />
        </div>
      </div>

      <div className="store-card__meta">
        <span>{summaryText}</span>
        {record.firstVisitedOn && record.status === 'visited' && (
          <span>初訪問 {record.firstVisitedOn}</span>
        )}
      </div>

      {record.note && <p className="store-card__note">{record.note}</p>}

      <div className="store-card__footer">
        <span className="store-card__cta">記録をひらく</span>
      </div>
    </button>
  );
}
