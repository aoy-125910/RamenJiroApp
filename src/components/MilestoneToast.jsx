export function MilestoneToast({ milestone, onClose }) {
  if (!milestone) {
    return null;
  }

  return (
    <aside
      className={`milestone-toast ${milestone.kind === 'complete' ? 'is-complete' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="milestone-toast__eyebrow">
        {milestone.kind === 'complete' ? 'Full Complete' : 'Milestone'}
      </p>
      <strong>{milestone.title}</strong>
      <p className="milestone-toast__headline">{milestone.reachedLabel}</p>
      <p className="milestone-toast__copy">{milestone.description}</p>

      <div className="milestone-toast__footer">
        <span>{milestone.nextLabel}</span>
        <button
          type="button"
          className="milestone-toast__close"
          onClick={onClose}
          aria-label="マイルストーン演出を閉じる"
        >
          閉じる
        </button>
      </div>
    </aside>
  );
}
