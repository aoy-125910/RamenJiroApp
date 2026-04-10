export function JourneyCard({ journey }) {
  return (
    <section className="journey-card" aria-label="現在の称号">
      <p className="eyebrow">Journey Title</p>
      <strong>{journey.title}</strong>
      <p className="journey-card__description">{journey.description}</p>

      <div className="journey-card__stats">
        <span>
          訪問 {journey.visitedActiveCount} / {journey.activeStoreCount}
        </span>
        <span>
          都道府県 {journey.visitedPrefectureCount} / {journey.prefectureCount}
        </span>
      </div>

      <div className="journey-card__meter" aria-hidden="true">
        <span style={{ width: `${journey.progressToNext}%` }} />
      </div>

      <p className="journey-card__next">{journey.nextLabel}</p>
    </section>
  );
}
