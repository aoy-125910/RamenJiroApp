const STORAGE_KEY = 'ramen-jiro-records-v1';

const validStatuses = new Set(['not_visited', 'wishlist', 'visited']);

export function createEmptyRecord() {
  return {
    status: 'not_visited',
    firstVisitedOn: '',
    lastVisitedOn: '',
    rank: '',
    note: ''
  };
}

function normalizeRank(rank) {
  if (rank === '' || rank === null || rank === undefined) {
    return '';
  }

  const value = Number(rank);

  if (!Number.isInteger(value) || value < 1) {
    return '';
  }

  return String(value);
}

function normalizeRecord(record = {}) {
  const fallback = createEmptyRecord();

  return {
    status: validStatuses.has(record.status) ? record.status : fallback.status,
    firstVisitedOn:
      typeof record.firstVisitedOn === 'string' ? record.firstVisitedOn : '',
    lastVisitedOn:
      typeof record.lastVisitedOn === 'string' ? record.lastVisitedOn : '',
    rank: normalizeRank(record.rank),
    note:
      typeof record.note === 'string' ? record.note.trim().slice(0, 240) : ''
  };
}

export function normalizeRecordInput(record) {
  return normalizeRecord(record);
}

export function loadRecords() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([storeId, record]) => [
        storeId,
        normalizeRecord(record)
      ])
    );
  } catch {
    return {};
  }
}

export function saveRecords(records) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = Object.fromEntries(
    Object.entries(records).map(([storeId, record]) => [
      storeId,
      normalizeRecord(record)
    ])
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

