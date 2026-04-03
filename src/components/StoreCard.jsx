import { StatusPill } from './StatusPill';

export function StoreCard({ store, onOpen }) {
  const { record } = store;
  const summaryText =
    record.status === 'visited'
      ? record.lastVisitedOn
        ? `最終訪問 ${record.lastVisitedOn}`
        : '訪問記録あり'
      : record.status === 'wishlist'
        ? '次に狙っている店舗'
        : 'まだ記録なし';

  return (
    <button
      type="button"
      className="store-card"
      onClick={() => onOpen(store.id)}
      aria-label={`${store.name} の記録を開く`}
    >
      <div className="store-card__top">
        <div>
          <p className="store-card__prefecture">{store.prefecture}</p>
          <h3>{store.name}</h3>
          <p className="store-card__area">{store.area}</p>
        </div>
        <StatusPill status={record.status} />
      </div>

      <div className="store-card__meta">
        <span>{summaryText}</span>
        {record.rank && <span>個人順位 #{record.rank}</span>}
      </div>

      {record.note && <p className="store-card__note">{record.note}</p>}
    </button>
  );
}

