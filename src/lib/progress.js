const journeyStageBlueprints = [
  {
    threshold: 0,
    title: '暖簾の前',
    description: '最初の一杯を記録すると、ここから旅が動き出します。'
  },
  {
    threshold: 1,
    title: 'ファーストロット',
    description: 'まずは勢い重視。近場から少しずつ塗っていきましょう。'
  },
  {
    threshold: 3,
    title: '湯気コレクター',
    description: '気になる店舗が線でつながり始める、ちょうど楽しい頃です。'
  },
  {
    ratio: 0.2,
    title: '巡礼モード',
    description: 'エリアの偏りが見えて、遠征計画も面白くなってきます。'
  },
  {
    ratio: 0.4,
    title: '連食マスター',
    description: '訪問ログが自分だけの地図として、かなり育ってきました。'
  },
  {
    ratio: 0.6,
    title: '遠征ハンター',
    description: '日帰り遠征も視野に入る、かなり良いペースです。'
  },
  {
    ratio: 0.8,
    title: '全店制覇目前',
    description: 'ここまで来たら残り店舗も見えてきます。'
  },
  {
    ratio: 1,
    title: '現行店コンプリート',
    description: '現行店舗の完走おめでとうございます。次はメモと順位の磨き込みです。'
  }
];

function buildJourneyStages(activeStoreCount) {
  const normalizedCount = Math.max(0, activeStoreCount);
  const stageByThreshold = new Map();

  journeyStageBlueprints.forEach((blueprint) => {
    const threshold =
      typeof blueprint.threshold === 'number'
        ? blueprint.threshold
        : Math.ceil(normalizedCount * blueprint.ratio);
    const clampedThreshold = Math.min(normalizedCount, Math.max(0, threshold));

    stageByThreshold.set(clampedThreshold, {
      threshold: clampedThreshold,
      title: blueprint.title,
      description: blueprint.description
    });
  });

  return [...stageByThreshold.values()].sort(
    (left, right) => left.threshold - right.threshold
  );
}

export function getJourneyStops({ visitedActiveCount, activeStoreCount }) {
  const normalizedActiveStoreCount = Math.max(0, activeStoreCount);
  const normalizedVisitedActiveCount = Math.max(
    0,
    Math.min(visitedActiveCount, normalizedActiveStoreCount)
  );
  const stages = buildJourneyStages(normalizedActiveStoreCount).filter(
    (stage) => stage.threshold > 0
  );
  const currentStage =
    stages.filter((stage) => normalizedVisitedActiveCount >= stage.threshold).at(-1) ??
    null;
  const nextStage =
    stages.find((stage) => normalizedVisitedActiveCount < stage.threshold) ?? null;

  return stages.map((stage) => ({
    ...stage,
    label: `${stage.threshold}店`,
    positionPercent:
      normalizedActiveStoreCount === 0
        ? 0
        : (stage.threshold / normalizedActiveStoreCount) * 100,
    remainingCount: Math.max(stage.threshold - normalizedVisitedActiveCount, 0),
    isReached: normalizedVisitedActiveCount >= stage.threshold,
    isCurrent: currentStage?.threshold === stage.threshold,
    isNext: nextStage?.threshold === stage.threshold
  }));
}

export function getLatestJourneyMilestone({
  previousVisitedActiveCount,
  visitedActiveCount,
  activeStoreCount
}) {
  const normalizedActiveStoreCount = Math.max(0, activeStoreCount);
  const previous = Math.max(
    0,
    Math.min(previousVisitedActiveCount, normalizedActiveStoreCount)
  );
  const next = Math.max(0, Math.min(visitedActiveCount, normalizedActiveStoreCount));

  if (normalizedActiveStoreCount === 0 || next <= previous) {
    return null;
  }

  const crossedStages = buildJourneyStages(normalizedActiveStoreCount).filter(
    (stage) => stage.threshold > 0 && stage.threshold > previous && stage.threshold <= next
  );

  return crossedStages.at(-1) ?? null;
}

export function getJourneyState({
  visitedActiveCount,
  activeStoreCount,
  visitedPrefectureCount = 0,
  prefectureCount = 0
}) {
  const normalizedActiveStoreCount = Math.max(0, activeStoreCount);
  const normalizedVisitedActiveCount = Math.max(
    0,
    Math.min(visitedActiveCount, normalizedActiveStoreCount)
  );

  if (normalizedActiveStoreCount === 0) {
    return {
      title: '準備中',
      description: '店舗データの準備が整うと、ここに進捗の称号が表示されます。',
      nextLabel: '店舗データを準備中です。',
      progressToNext: 0,
      visitedActiveCount: normalizedVisitedActiveCount,
      activeStoreCount: normalizedActiveStoreCount,
      visitedPrefectureCount,
      prefectureCount
    };
  }

  const stages = buildJourneyStages(normalizedActiveStoreCount);
  const currentStage =
    stages.filter((stage) => normalizedVisitedActiveCount >= stage.threshold).at(-1) ??
    stages[0];
  const nextStage =
    stages.find((stage) => normalizedVisitedActiveCount < stage.threshold) ?? null;
  const currentThreshold = currentStage?.threshold ?? 0;
  const nextThreshold = nextStage?.threshold ?? normalizedActiveStoreCount;
  const span = Math.max(nextThreshold - currentThreshold, 1);
  const progressValue = nextStage
    ? normalizedVisitedActiveCount - currentThreshold
    : span;
  const progressToNext = Math.round((progressValue / span) * 100);

  return {
    title: currentStage.title,
    description: currentStage.description,
    nextLabel: nextStage
      ? `次の称号「${nextStage.title}」まであと ${
          nextStage.threshold - normalizedVisitedActiveCount
        } 店`
      : `現行 ${normalizedActiveStoreCount} 店を制覇済みです`,
    progressToNext,
    visitedActiveCount: normalizedVisitedActiveCount,
    activeStoreCount: normalizedActiveStoreCount,
    visitedPrefectureCount,
    prefectureCount
  };
}

export function buildStoresWithRecords(
  stores,
  records,
  rankingStoreIds,
  createEmptyRecord
) {
  const rankingPositionByStoreId = new Map(
    rankingStoreIds.map((storeId, index) => [storeId, index + 1])
  );

  return stores.map((store) => ({
    ...store,
    record: {
      ...createEmptyRecord(),
      ...(records[store.id] ?? {})
    },
    rankingPosition: rankingPositionByStoreId.get(store.id) ?? null
  }));
}

export function getProgressSnapshot(storesWithRecords, rankingStoreIds) {
  const storeMap = new Map(storesWithRecords.map((store) => [store.id, store]));
  const activeStores = storesWithRecords.filter(
    (store) => store.storeStatus !== 'closed'
  );
  const visitedStores = storesWithRecords.filter(
    (store) => store.record.status === 'visited'
  );
  const visitedActiveStores = activeStores.filter(
    (store) => store.record.status === 'visited'
  );
  const visitedStoreIds = visitedStores.map((store) => store.id);
  const visitedCount = visitedStores.length;
  const visitedActiveCount = visitedActiveStores.length;
  const wishlistCount = storesWithRecords.filter(
    (store) => store.record.status === 'wishlist'
  ).length;
  const prefectureCount = new Set(
    storesWithRecords.map((store) => store.prefecture)
  ).size;
  const visitedPrefectureCount = new Set(
    visitedStores.map((store) => store.prefecture)
  ).size;
  const activeStoreCount = activeStores.length;
  const archivedStoreCount = storesWithRecords.length - activeStoreCount;
  const completionRate =
    activeStoreCount === 0 ? 0 : (visitedActiveCount / activeStoreCount) * 100;
  const rankedStores = rankingStoreIds
    .map((storeId) => storeMap.get(storeId))
    .filter((store) => store?.record.status === 'visited');
  const noteStores = storesWithRecords
    .filter((store) => store.record.note)
    .sort((left, right) => {
      const dateLeft = left.record.lastVisitedOn || left.record.firstVisitedOn || '';
      const dateRight = right.record.lastVisitedOn || right.record.firstVisitedOn || '';

      if (dateLeft !== dateRight) {
        return dateRight.localeCompare(dateLeft);
      }

      return left.name.localeCompare(right.name, 'ja');
    });

  return {
    activeStores,
    visitedStoreIds,
    visitedCount,
    visitedActiveCount,
    wishlistCount,
    prefectureCount,
    visitedPrefectureCount,
    activeStoreCount,
    archivedStoreCount,
    completionRate,
    journeyStops: getJourneyStops({
      visitedActiveCount,
      activeStoreCount
    }),
    rankedStores,
    noteStores,
    journey: getJourneyState({
      visitedActiveCount,
      activeStoreCount,
      visitedPrefectureCount,
      prefectureCount
    })
  };
}
