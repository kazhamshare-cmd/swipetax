// CSV マッパー エクスポート

export * from './types';
export { freeeMapper } from './freee-mapper';
export { moneyforwardMapper } from './moneyforward-mapper';
export { yayoiMapper } from './yayoi-mapper';
export { genericJapaneseMapper } from './generic-japanese-mapper';

import { freeeMapper } from './freee-mapper';
import { moneyforwardMapper } from './moneyforward-mapper';
import { yayoiMapper } from './yayoi-mapper';
import { genericJapaneseMapper } from './generic-japanese-mapper';
import type { CSVMapper } from './types';

// 全マッパーのリスト（自動判定で使用）
// 汎用マッパーは最後に配置（特定サービスを優先）
export const ALL_MAPPERS: CSVMapper[] = [
    freeeMapper,
    moneyforwardMapper,
    yayoiMapper,
    genericJapaneseMapper,
];

// サービスIDからマッパーを取得
export function getMapperById(serviceId: string): CSVMapper | undefined {
    return ALL_MAPPERS.find(m => m.config.serviceId === serviceId);
}
