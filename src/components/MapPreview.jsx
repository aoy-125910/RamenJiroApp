import { StatusPill } from './StatusPill';

function projectToCanvas(lat, lng) {
  const minLat = 30;
  const maxLat = 43;
  const minLng = 129;
  const maxLng = 142;

  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;

  return {
    left: `${Math.max(6, Math.min(94, x))}%`,
    top: `${Math.max(6, Math.min(94, y))}%`
  };
}

export function MapPreview({ stores, selectedStoreId, onSelect }) {
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];

  return (
    <section className="section-card map-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Map Preview</p>
          <h2>地図ビューのたたき台</h2>
        </div>
        <p className="section-copy">
          今回は雛形として軽い俯瞰ビューにしてあります。あとで本格地図ライブラリへ差し替えやすい構成です。
        </p>
      </div>

      <div className="map-frame">
        <svg
          className="map-illustration"
          viewBox="0 0 320 440"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="seaGradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#fcf0df" />
              <stop offset="100%" stopColor="#f4debf" />
            </linearGradient>
          </defs>
          <rect width="320" height="440" rx="28" fill="url(#seaGradient)" />
          <g opacity="0.35" stroke="#d9bb8e" strokeWidth="1">
            <path d="M42 92H278" />
            <path d="M42 176H278" />
            <path d="M42 260H278" />
            <path d="M42 344H278" />
            <path d="M78 48V392" />
            <path d="M140 48V392" />
            <path d="M202 48V392" />
            <path d="M264 48V392" />
          </g>
          <g fill="#eed4ab" stroke="#d1a46f" strokeWidth="3">
            <path d="M220 42c17 0 28 14 28 26s-8 22-22 22c-16 0-30-12-30-24s10-24 24-24Z" />
            <path d="M205 104c16 0 29 10 34 20l12 30c8 22 17 35 30 47 7 7 8 20 0 28-8 8-22 8-30 0-14-14-26-31-34-49l-8-18-16 18c-10 11-21 23-37 34-11 8-26 7-33-4-7-10-5-24 7-32 22-16 37-31 48-48l8-12-18-6c-19-7-25-20-20-31 5-11 18-17 32-13l25 7 9-13c6-10 17-16 31-16Z" />
            <path d="M156 282c12 0 22 8 25 18s-3 20-13 23c-12 4-31-1-40-10-8-7-9-17-3-24 7-5 18-7 31-7Z" />
            <path d="M118 324c13 0 25 8 27 17 2 10-7 20-18 22-16 3-33-2-41-12-6-8-4-18 5-23 7-3 16-4 27-4Z" />
          </g>
        </svg>

        <div className="map-pins">
          {stores.map((store) => {
            const position = projectToCanvas(store.lat, store.lng);

            return (
              <button
                key={store.id}
                type="button"
                className={`map-pin is-${store.record.status} ${
                  store.id === selectedStoreId ? 'is-active' : ''
                }`}
                style={position}
                onClick={() => onSelect(store.id)}
                aria-label={`${store.name} を地図で選択`}
              >
                <span />
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-detail">
        <div>
          <p className="map-detail__label">選択中の店舗</p>
          <h3>{selectedStore.name}</h3>
          <p>
            {selectedStore.prefecture} / {selectedStore.area}
          </p>
        </div>
        <StatusPill status={selectedStore.record.status} />
      </div>
    </section>
  );
}

