import { useEffect, useState } from 'react';

function getPreferredStop(stops) {
  return (
    stops.find((stop) => stop.isCurrent) ??
    stops.find((stop) => stop.isNext) ??
    stops.at(-1) ??
    null
  );
}

export function ProgressRouteCard({ completionRate, journey, journeyStops }) {
  const [activeStopThreshold, setActiveStopThreshold] = useState(
    () => getPreferredStop(journeyStops)?.threshold ?? null
  );

  useEffect(() => {
    setActiveStopThreshold((current) => {
      if (current && journeyStops.some((stop) => stop.threshold === current)) {
        return current;
      }

      return getPreferredStop(journeyStops)?.threshold ?? null;
    });
  }, [journeyStops]);

  const activeStop =
    journeyStops.find((stop) => stop.threshold === activeStopThreshold) ??
    getPreferredStop(journeyStops);
  const activeStopLabel = activeStop
    ? activeStop.isCurrent
      ? '現在地'
      : activeStop.isReached
        ? '通過済みの節目'
        : '次の停車駅'
    : '進捗の節目';

  return (
    <section className="progress-route-card" aria-label="全体の達成率">
      <div className="progress-route-card__heading">
        <p className="hero-meter__label">全体の達成率</p>
        <span className="progress-route-card__hint">節目をタップで詳細</span>
      </div>

      <div className="progress-route-card__summary">
        <div className="progress-route-card__value">
          <strong>{Math.round(completionRate)}%</strong>
          <p>
            現行 {journey.visitedActiveCount} / {journey.activeStoreCount} 店舗
          </p>
        </div>

        <div className="progress-route-card__stats">
          <span>{journey.title}</span>
          <span>
            都道府県 {journey.visitedPrefectureCount} / {journey.prefectureCount}
          </span>
        </div>
      </div>

      <div className="progress-route-card__rail" aria-hidden="true">
        <div className="progress-route-card__rail-track">
          <span
            className="progress-route-card__rail-fill"
            style={{ width: `${completionRate}%` }}
          />
          {journeyStops.map((stop) => (
            <span
              key={stop.threshold}
              className={`progress-route-card__stop-dot ${
                stop.isReached ? 'is-reached' : ''
              } ${stop.isCurrent ? 'is-current' : ''} ${stop.isNext ? 'is-next' : ''}`}
              style={{ left: `${stop.positionPercent}%` }}
            />
          ))}
          <span
            className="progress-route-card__tracker"
            style={{ left: `clamp(12px, ${completionRate}%, calc(100% - 12px))` }}
          />
        </div>
      </div>

      <div className="progress-route-card__stop-list">
        {journeyStops.map((stop) => (
          <button
            key={stop.threshold}
            type="button"
            className={`progress-route-card__stop-chip ${
              activeStop?.threshold === stop.threshold ? 'is-active' : ''
            } ${stop.isReached ? 'is-reached' : ''} ${stop.isNext ? 'is-next' : ''}`}
            onClick={() => setActiveStopThreshold(stop.threshold)}
            aria-pressed={activeStop?.threshold === stop.threshold}
          >
            {stop.label}
          </button>
        ))}
      </div>

      {activeStop && (
        <div className="progress-route-card__detail">
          <p className="progress-route-card__detail-label">{activeStopLabel}</p>
          <strong>{activeStop.title}</strong>
          <p className="progress-route-card__detail-copy">{activeStop.description}</p>
          <div className="progress-route-card__detail-meta">
            <span>
              {activeStop.isReached
                ? `${activeStop.threshold} 店に到達済み`
                : `あと ${activeStop.remainingCount} 店で到達`}
            </span>
            <span>{journey.nextLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}
