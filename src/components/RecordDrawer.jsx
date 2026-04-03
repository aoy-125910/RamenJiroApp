import { useEffect, useState } from 'react';

const statusChoices = [
  { id: 'not_visited', label: '未訪問' },
  { id: 'wishlist', label: '行きたい' },
  { id: 'visited', label: '行った' }
];

export function RecordDrawer({ store, record, onClose, onSave, onReset }) {
  const [draft, setDraft] = useState(record);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  if (!store) {
    return null;
  }

  function setField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(store.id, draft);
    onClose();
  }

  function handleReset() {
    if (!window.confirm(`${store.name} の記録をリセットしますか？`)) {
      return;
    }

    onReset(store.id);
    onClose();
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        aria-modal="true"
        aria-label={`${store.name} の記録編集`}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer__handle" />

        <div className="drawer__header">
          <div>
            <p className="eyebrow">Record</p>
            <h2>{store.name}</h2>
            <p>
              {store.prefecture} / {store.area}
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <form className="record-form" onSubmit={handleSubmit}>
          <section className="field-group">
            <label className="field-label">訪問ステータス</label>
            <div className="status-choice-row">
              {statusChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`choice-chip ${
                    draft.status === choice.id ? 'is-selected' : ''
                  }`}
                  onClick={() => setField('status', choice.id)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </section>

          <section className="field-grid">
            <label className="field">
              <span className="field-label">初訪問日</span>
              <input
                type="date"
                value={draft.firstVisitedOn}
                onChange={(event) => setField('firstVisitedOn', event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">最終訪問日</span>
              <input
                type="date"
                value={draft.lastVisitedOn}
                onChange={(event) => setField('lastVisitedOn', event.target.value)}
              />
            </label>
          </section>

          <div className="field field--hint">
            <span className="field-label">ランキングについて</span>
            <p>
              順位はランキング画面で並び替えて管理します。この画面では訪問状態とメモの記録に集中できます。
            </p>
          </div>

          <label className="field">
            <span className="field-label">メモ</span>
            <textarea
              rows="5"
              maxLength="240"
              placeholder="量の好み、印象、並び時間、次回の注文メモなど"
              value={draft.note}
              onChange={(event) => setField('note', event.target.value)}
            />
          </label>

          <div className="drawer__actions">
            <button type="button" className="ghost-button" onClick={handleReset}>
              記録を消す
            </button>
            <button type="submit" className="primary-button">
              保存する
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
