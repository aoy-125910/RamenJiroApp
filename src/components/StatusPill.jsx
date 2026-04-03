const labels = {
  not_visited: '未訪問',
  wishlist: '行きたい',
  visited: '訪問済み'
};

export function StatusPill({ status }) {
  return (
    <span className={`status-pill is-${status}`}>{labels[status] ?? labels.not_visited}</span>
  );
}

