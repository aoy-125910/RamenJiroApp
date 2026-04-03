const tabs = [
  { id: 'map', label: '地図' },
  { id: 'stores', label: '店舗' },
  { id: 'ranking', label: 'ランキング' },
  { id: 'notes', label: 'メモ' }
];

export function BottomTabBar({ activeTab, onChange }) {
  return (
    <nav className="bottom-tab-bar" aria-label="メインタブ">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-tab-bar__item ${
            activeTab === tab.id ? 'is-active' : ''
          }`}
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

