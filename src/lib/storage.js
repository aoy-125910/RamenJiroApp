const RECORDS_STORAGE_KEY = 'ramen-jiro-records-v1';
const RANKING_STORAGE_KEY = 'ramen-jiro-ranking-v1';

const validStatuses = new Set(['not_visited', 'wishlist', 'visited']);

export function createEmptyRecord() {
  return {
    status: 'not_visited',
    firstVisitedOn: '',
    lastVisitedOn: '',
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
    note:
      typeof record.note === 'string' ? record.note.trim().slice(0, 240) : ''
  };
}

function loadRawRecords() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function normalizeRankingIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const uniqueIds = [];

  ids.forEach((value) => {
    if (typeof value !== 'string' || value.length === 0) {
      return;
    }

    if (!uniqueIds.includes(value)) {
      uniqueIds.push(value);
    }
  });

  return uniqueIds;
}

function buildLegacyRanking(rawRecords) {
  return Object.entries(rawRecords)
    .filter(([, record]) => {
      return record?.status === 'visited' && normalizeRank(record?.rank) !== '';
    })
    .sort((left, right) => {
      const rankDiff =
        Number(normalizeRank(left[1]?.rank)) - Number(normalizeRank(right[1]?.rank));

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return left[0].localeCompare(right[0], 'ja');
    })
    .map(([storeId]) => storeId);
}

export function normalizeRecordInput(record) {
  return normalizeRecord(record);
}

export function loadRecords() {
  const rawRecords = loadRawRecords();

  return Object.fromEntries(
    Object.entries(rawRecords).map(([storeId, record]) => [
      storeId,
      normalizeRecord(record)
    ])
  );
}

export function loadRanking() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RANKING_STORAGE_KEY);

    if (raw) {
      return normalizeRankingIds(JSON.parse(raw));
    }
  } catch {
    return [];
  }

  return buildLegacyRanking(loadRawRecords());
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

  window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(normalized));
}

export function saveRanking(rankingStoreIds) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    RANKING_STORAGE_KEY,
    JSON.stringify(normalizeRankingIds(rankingStoreIds))
  );
}
