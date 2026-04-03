import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { StatusPill } from './StatusPill';

const statusLabels = {
  not_visited: '未訪問',
  wishlist: '行きたい',
  visited: '訪問済み'
};

function createMarkerIcon(status, isActive) {
  return L.divIcon({
    className: 'map-marker-shell',
    html: `<span class="map-marker-icon is-${status} ${
      isActive ? 'is-active' : ''
    }"></span>`,
    iconSize: [24, 36],
    iconAnchor: [12, 34],
    popupAnchor: [0, -26]
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

export function MapPreview({
  stores,
  selectedStore,
  selectedStoreId,
  onSelect,
  onOpen
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const hasFittedBoundsRef = useRef(false);

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

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      markerLayerRef.current = null;
      mapRef.current = null;
      hasFittedBoundsRef.current = false;
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

    const positions = stores.map((store) => [store.lat, store.lng]);
    const isFirstFit = !hasFittedBoundsRef.current;

    stores.forEach((store) => {
      const marker = L.marker([store.lat, store.lng], {
        icon: createMarkerIcon(store.record.status, store.id === selectedStoreId),
        keyboard: true,
        title: store.name
      });

      marker.bindPopup(createPopupContent(store), {
        closeButton: false,
        offset: [0, -20]
      });

      marker.on('click', () => {
        onSelect(store.id);
      });

      marker.addTo(markerLayer);
    });

    if (positions.length > 0 && isFirstFit) {
      map.fitBounds(positions, {
        padding: [20, 20],
        maxZoom: 6
      });
      hasFittedBoundsRef.current = true;
    }

    if (!selectedStore) {
      return;
    }

    const selectedPosition = L.latLng(selectedStore.lat, selectedStore.lng);

    if (!isFirstFit) {
      map.flyTo(selectedPosition, Math.max(map.getZoom(), 6), {
        animate: true,
        duration: 0.7
      });
    }

    markerLayer.eachLayer((layer) => {
      if (!(layer instanceof L.Marker)) {
        return;
      }

      const { lat, lng } = layer.getLatLng();

      if (lat === selectedStore.lat && lng === selectedStore.lng) {
        layer.openPopup();
      }
    });
  }, [onSelect, selectedStore, selectedStoreId, stores]);

  if (!selectedStore) {
    return null;
  }

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

      <div className="map-frame">
        <div
          ref={mapElementRef}
          className="map-canvas"
          aria-label="ラーメン二郎店舗マップ"
        />
      </div>

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
            onClick={() => onOpen(selectedStore.id)}
          >
            記録を開く
          </button>
        </div>
      </div>
    </section>
  );
}
