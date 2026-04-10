import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStoresWithRecords,
  getJourneyStops,
  getLatestJourneyMilestone,
  getJourneyState,
  getProgressSnapshot
} from '../src/lib/progress.js';

function createEmptyRecord() {
  return {
    status: 'not_visited',
    firstVisitedOn: '',
    lastVisitedOn: '',
    note: ''
  };
}

const stores = [
  {
    id: 'mita',
    name: '三田本店',
    prefecture: '東京都',
    area: '港区',
    storeStatus: 'open'
  },
  {
    id: 'meguro',
    name: '目黒店',
    prefecture: '東京都',
    area: '目黒区',
    storeStatus: 'open'
  },
  {
    id: 'kyoto',
    name: '京都店',
    prefecture: '京都府',
    area: '左京区',
    storeStatus: 'closed'
  }
];

test('buildStoresWithRecords merges records and ranking positions', () => {
  const storesWithRecords = buildStoresWithRecords(
    stores,
    {
      meguro: {
        status: 'visited',
        firstVisitedOn: '2026-03-01',
        lastVisitedOn: '2026-03-05',
        note: 'うまい'
      }
    },
    ['meguro'],
    createEmptyRecord
  );

  assert.equal(storesWithRecords[0].record.status, 'not_visited');
  assert.equal(storesWithRecords[1].record.status, 'visited');
  assert.equal(storesWithRecords[1].rankingPosition, 1);
});

test('getProgressSnapshot computes visit counts and note ordering', () => {
  const storesWithRecords = buildStoresWithRecords(
    stores,
    {
      mita: {
        status: 'visited',
        firstVisitedOn: '2026-03-01',
        lastVisitedOn: '2026-03-10',
        note: '非乳化'
      },
      kyoto: {
        status: 'visited',
        firstVisitedOn: '2026-02-01',
        lastVisitedOn: '2026-02-05',
        note: '遠征'
      }
    },
    ['mita', 'kyoto'],
    createEmptyRecord
  );
  const snapshot = getProgressSnapshot(storesWithRecords, ['mita', 'kyoto']);

  assert.equal(snapshot.visitedCount, 2);
  assert.equal(snapshot.visitedActiveCount, 1);
  assert.equal(snapshot.activeStoreCount, 2);
  assert.equal(snapshot.archivedStoreCount, 1);
  assert.equal(snapshot.rankedStores.length, 2);
  assert.equal(snapshot.noteStores[0].id, 'mita');
  assert.equal(snapshot.visitedPrefectureCount, 2);
});

test('getJourneyState returns milestone and completion labels', () => {
  const midJourney = getJourneyState({
    visitedActiveCount: 9,
    activeStoreCount: 45,
    visitedPrefectureCount: 4,
    prefectureCount: 10
  });
  const completeJourney = getJourneyState({
    visitedActiveCount: 45,
    activeStoreCount: 45,
    visitedPrefectureCount: 10,
    prefectureCount: 10
  });

  assert.equal(midJourney.title, '巡礼モード');
  assert.match(midJourney.nextLabel, /次の称号/);
  assert.equal(completeJourney.title, '現行店コンプリート');
  assert.equal(completeJourney.progressToNext, 100);
});

test('getLatestJourneyMilestone returns the latest crossed stage only on forward progress', () => {
  const milestone = getLatestJourneyMilestone({
    previousVisitedActiveCount: 8,
    visitedActiveCount: 10,
    activeStoreCount: 45
  });
  const noMilestone = getLatestJourneyMilestone({
    previousVisitedActiveCount: 10,
    visitedActiveCount: 10,
    activeStoreCount: 45
  });

  assert.equal(milestone?.title, '巡礼モード');
  assert.equal(milestone?.threshold, 9);
  assert.equal(noMilestone, null);
});

test('getJourneyStops marks current and next milestones for the route card', () => {
  const stops = getJourneyStops({
    visitedActiveCount: 10,
    activeStoreCount: 45
  });

  assert.equal(stops[0].label, '1店');
  assert.equal(stops.find((stop) => stop.isCurrent)?.threshold, 9);
  assert.equal(stops.find((stop) => stop.isNext)?.threshold, 18);
  assert.equal(stops.at(-1)?.positionPercent, 100);
});
