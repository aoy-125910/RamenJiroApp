import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { StatusPill } from './StatusPill';

const statusLabels = {
  not_visited: '未訪問',
  wishlist: '行きたい',
  visited: '訪問済み'
};

const INITIAL_FIT_MAX_ZOOM = 7;
const LIST_SELECTION_ZOOM = 13;
const SINGLE_STORE_ZOOM = 11;

function createMarkerIcon(status, isActive) {
  return L.divIcon({
    className: 'map-marker-shell',
    html: `
      <span class="map-marker-icon is-${status} ${isActive ? 'is-active' : ''}">
        <span class="map-marker-icon__shape is-${status}"></span>
      </span>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -26]
  });
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const sizeClass =
    count < 10 ? 'is-small' : count < 25 ? 'is-medium' : 'is-large';
  const size = count < 10 ? 46 : count < 25 ? 52 : 58;

  return L.divIcon({
    className: 'map-cluster-shell',
    html: `<span class="map-cluster ${sizeClass}">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function createPopupContent(store) {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-popup';

  const title = document.createElement('strong');
  title.textContent = store.name;

  const area = document.createElement('p');
  area.textContent = `${store.prefecture} / ${store.area}`;

  const status = document.createElement('p');
  status.className = 'map-popup__status';
  status.textContent = statusLabels[store.record.status] ?? statusLabels.not_visited;

  wrapper.append(title, area, status);

  return wrapper;
}

function fitMapToStores(map, stores, options = {}) {
  const {
    animate = true,
    maxZoom = INITIAL_FIT_MAX_ZOOM,
    singleStoreZoom = SINGLE_STORE_ZOOM
  } = options;

  if (stores.length === 0) {
    return;
  }

  if (stores.length === 1) {
    const [store] = stores;
    map.flyTo([store.lat, store.lng], singleStoreZoom, {
      animate,
      duration: 0.7
    });
    return;
  }

  map.fitBounds(
    stores.map((store) => [store.lat, store.lng]),
    {
      padding: [20, 20],
      maxZoom,
      animate
    }
  );
}

export function MapPreview({
  stores,
  totalStoreCount,
  selectedStore,
  selectedStoreId,
  selectionSource,
  onSelect,
  onOpen
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const previousStoreKeyRef = useRef('');
  const previousSelectedStoreIdRef = useRef(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      minZoom: 4,
      maxZoom: 16
    });

    L.control
      .zoom({
        position: 'bottomright'
      })
      .addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markerLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      disableClusteringAtZoom: 10,
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true
    }).addTo(map);
    mapRef.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      markerMapRef.current = new Map();
      markerLayerRef.current = null;
      mapRef.current = null;
      previousStoreKeyRef.current = '';
      previousSelectedStoreIdRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();
    markerMapRef.current = new Map();

    const storeKey = stores.map((store) => store.id).join('|');
    const storesChanged = previousStoreKeyRef.current !== storeKey;
    const selectedChanged = previousSelectedStoreIdRef.current !== selectedStoreId;

    stores.forEach((store) => {
      const marker = L.marker([store.lat, store.lng], {
        icon: createMarkerIcon(store.record.status, store.id === selectedStoreId),
        keyboard: true,
        riseOnHover: true,
        title: store.name
      });

      marker.bindPopup(createPopupContent(store), {
        closeButton: false,
        offset: [0, -22]
      });

      marker.on('click', () => {
        onSelect(store.id);
      });

      markerLayer.addLayer(marker);
      markerMapRef.current.set(store.id, marker);
    });

    if (stores.length === 0) {
      previousStoreKeyRef.current = storeKey;
      previousSelectedStoreIdRef.current = selectedStoreId;
      return;
    }

    const selectedMarker = selectedStoreId
      ? markerMapRef.current.get(selectedStoreId)
      : null;

    if (storesChanged) {
      fitMapToStores(map, stores, {
        animate: previousStoreKeyRef.current !== '',
        maxZoom: INITIAL_FIT_MAX_ZOOM
      });

      if (
        previousStoreKeyRef.current !== '' &&
        selectedStore &&
        selectedMarker
      ) {
        markerLayer.zoomToShowLayer(selectedMarker, () => {
          selectedMarker.openPopup();
        });
      }
    } else if (selectedChanged && selectedStore && selectedMarker) {
      if (selectionSource === 'list') {
        markerLayer.zoomToShowLayer(selectedMarker, () => {
          map.flyTo(selectedMarker.getLatLng(), LIST_SELECTION_ZOOM, {
            animate: true,
            duration: 0.8
          });
          selectedMarker.openPopup();
        });
      } else if (selectionSource === 'map') {
        map.panTo(selectedMarker.getLatLng(), {
          animate: true,
          duration: 0.45
        });
        selectedMarker.openPopup();
      }
    } else if (selectedStore && selectedMarker) {
      markerLayer.zoomToShowLayer(selectedMarker, () => {
        selectedMarker.openPopup();
      });
    }

    previousStoreKeyRef.current = storeKey;
    previousSelectedStoreIdRef.current = selectedStoreId;
  }, [onSelect, selectedStore, selectedStoreId, selectionSource, stores]);

  function handleResetView() {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    fitMapToStores(map, stores, {
      animate: true,
      maxZoom: INITIAL_FIT_MAX_ZOOM
    });
  }

  const resetLabel =
    stores.length === totalStoreCount ? '全国表示' : '表示中を俯瞰';

  return (
    <section className="section-card map-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OpenStreetMap</p>
          <h2>実地図で店舗を確認</h2>
        </div>
        <p className="section-copy">
          店舗の緯度経度からピンを配置しています。ピンをタップすると店舗を選択でき、下のボタンから記録編集に進めます。
        </p>
      </div>

      <div className="map-toolbar">
        <p>
          {stores.length} / {totalStoreCount} 店舗を地図に表示中
        </p>
        <button
          type="button"
          className="ghost-button map-toolbar__button"
          onClick={handleResetView}
          disabled={stores.length === 0}
        >
          {resetLabel}
        </button>
      </div>

      <div className="map-frame">
        <div
          ref={mapElementRef}
          className="map-canvas"
          aria-label="ラーメン二郎店舗マップ"
        />
        {stores.length === 0 && (
          <div className="map-empty-state" aria-live="polite">
            <strong>地図に表示する店舗がありません</strong>
            <p>検索や絞り込み条件を変えると、ここに対象店舗が表示されます。</p>
          </div>
        )}
      </div>

      {selectedStore ? (
        <div className="map-detail">
          <div>
            <p className="map-detail__label">選択中の店舗</p>
            <h3>{selectedStore.name}</h3>
            <p>
              {selectedStore.prefecture} / {selectedStore.area}
            </p>
          </div>
          <div className="map-detail__actions">
            <StatusPill status={selectedStore.record.status} />
            <button
              type="button"
              className="ghost-button map-detail__button"
              onClick={() => onOpen(selectedStore.id, 'map')}
            >
              記録を開く
            </button>
          </div>
        </div>
      ) : (
        <p className="empty-state">
          表示条件に合う店舗がないため、地図の詳細表示はお休み中です。
        </p>
      )}
    </section>
  );
}
