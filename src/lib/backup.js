import { normalizeRecordInput } from './storage';

export const BACKUP_VERSION = 1;

function normalizeRankingStoreIds(ids, validStoreIds) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const uniqueIds = [];

  ids.forEach((storeId) => {
    if (typeof storeId !== 'string' || !validStoreIds.has(storeId)) {
      return;
    }

    if (!uniqueIds.includes(storeId)) {
      uniqueIds.push(storeId);
    }
  });

  return uniqueIds;
}

function normalizeRecordEntries(records, validStoreIds) {
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(records)
      .filter(([storeId]) => validStoreIds.has(storeId))
      .map(([storeId, record]) => [storeId, normalizeRecordInput(record)])
  );
}

export function createBackupPayload({
  records,
  rankingStoreIds,
  storeDataMeta,
  exportedAt = new Date().toISOString()
}) {
  return {
    app: '二郎訪問ログ',
    backupVersion: BACKUP_VERSION,
    exportedAt,
    storeData: {
      verifiedOn: storeDataMeta.verifiedOn,
      activeStoreCount: storeDataMeta.activeStoreCount,
      archivedStoreCount: storeDataMeta.archivedStoreCount
    },
    records: Object.fromEntries(
      Object.entries(records).map(([storeId, record]) => [
        storeId,
        normalizeRecordInput(record)
      ])
    ),
    rankingStoreIds: [...rankingStoreIds]
  };
}

export function parseBackupText(text, validStoreIds) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSONの読み込みに失敗しました。');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('バックアップ形式が正しくありません。');
  }

  if (!('records' in parsed) && !('rankingStoreIds' in parsed)) {
    throw new Error('このJSONはバックアップとして読み込めません。');
  }

  const normalizedRecords = normalizeRecordEntries(parsed.records, validStoreIds);
  const normalizedRanking = normalizeRankingStoreIds(
    parsed.rankingStoreIds,
    validStoreIds
  );

  return {
    records: normalizedRecords,
    rankingStoreIds: normalizedRanking,
    backupVersion:
      typeof parsed.backupVersion === 'number' ? parsed.backupVersion : null,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null
  };
}
