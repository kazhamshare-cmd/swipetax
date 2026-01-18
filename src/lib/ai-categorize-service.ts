// AI カテゴリ分類サービス
import { ExpenseCategory } from './types';

// 飲食店向けカテゴリ推定ルール
const CATEGORY_RULES: {
    patterns: RegExp[];
    category: ExpenseCategory;
    confidence: number;
    reasoning: string;
}[] = [
    // 仕入れ（原価）
    {
        patterns: [/米/, /肉/, /魚/, /野菜/, /青果/, /鮮魚/, /精肉/, /卸/, /市場/, /仕入/],
        category: 'supplies',
        confidence: 95,
        reasoning: '飲食店の仕入れ（材料費）',
    },
    {
        patterns: [/酒/, /ビール/, /ワイン/, /焼酎/, /日本酒/, /リカー/, /酒店/, /酒類/],
        category: 'supplies',
        confidence: 92,
        reasoning: '酒類仕入れ',
    },
    // 決済手数料
    {
        patterns: [/PayPay.*手数料/, /決済手数料/, /クレジット.*手数料/, /VISA.*手数料/, /JCB.*手数料/],
        category: 'fees',
        confidence: 98,
        reasoning: '決済手数料',
    },
    // 水道光熱費
    {
        patterns: [/電気/, /ガス/, /水道/, /東京電力/, /関西電力/, /東京ガス/, /大阪ガス/],
        category: 'utilities',
        confidence: 98,
        reasoning: '水道光熱費',
    },
    // 地代家賃
    {
        patterns: [/家賃/, /賃料/, /不動産/, /リース/, /テナント/],
        category: 'rent',
        confidence: 95,
        reasoning: '店舗家賃・リース',
    },
    // 通信費
    {
        patterns: [/NTT/, /docomo/, /au/, /ソフトバンク/, /通信/, /インターネット/, /Wi-?Fi/i],
        category: 'communication',
        confidence: 95,
        reasoning: '通信費',
    },
    // 接待交際費
    {
        patterns: [/ゴルフ/, /カントリー/, /接待/, /ラウンド/],
        category: 'entertainment',
        confidence: 85,
        reasoning: '接待ゴルフ',
    },
    {
        patterns: [/居酒屋/, /レストラン/, /料亭/, /会食/, /懇親/],
        category: 'entertainment',
        confidence: 70,
        reasoning: '接待飲食（私的利用の可能性あり）',
    },
    // 旅費交通費
    {
        patterns: [/JR/, /電車/, /バス/, /タクシー/, /Suica/, /PASMO/, /ICカード/, /交通/],
        category: 'travel',
        confidence: 90,
        reasoning: '交通費',
    },
    {
        patterns: [/ガソリン/, /燃料/, /ENEOS/, /出光/, /コスモ/, /駐車場/],
        category: 'travel',
        confidence: 88,
        reasoning: '車両関連費',
    },
    // 消耗品費
    {
        patterns: [/文具/, /事務用品/, /コピー/, /印刷/, /洗剤/, /消耗品/, /100均/, /ダイソー/],
        category: 'supplies',
        confidence: 85,
        reasoning: '消耗品',
    },
    {
        patterns: [/Amazon/, /楽天/, /ヨドバシ/, /ビック/, /ホームセンター/],
        category: 'supplies',
        confidence: 60,
        reasoning: '通販購入（用途要確認）',
    },
    // 広告宣伝費
    {
        patterns: [/広告/, /チラシ/, /看板/, /ぐるなび/, /食べログ/, /ホットペッパー/, /PR/],
        category: 'advertising',
        confidence: 92,
        reasoning: '広告宣伝費',
    },
    // 新聞図書費
    {
        patterns: [/新聞/, /雑誌/, /書籍/, /本/, /図書/],
        category: 'books',
        confidence: 85,
        reasoning: '新聞図書費',
    },
    // 保険料
    {
        patterns: [/保険/, /火災/, /損害/, /賠償/],
        category: 'insurance',
        confidence: 90,
        reasoning: '保険料',
    },
    // 外注費
    {
        patterns: [/清掃/, /クリーニング/, /制服/, /おしぼり/, /レンタル/],
        category: 'outsourcing',
        confidence: 88,
        reasoning: '外注サービス',
    },
    {
        patterns: [/会計事務所/, /税理士/, /社労士/, /顧問/],
        category: 'outsourcing',
        confidence: 95,
        reasoning: '専門家報酬',
    },
    // 収入（入金）パターン
    {
        patterns: [/PayPay.*入金/, /QR.*入金/, /クレジット.*入金/, /VISA.*入金/, /売上入金/],
        category: 'miscellaneous', // 収入は経費カテゴリではないのでmiscellaneous
        confidence: 99,
        reasoning: '売上入金（収入）',
    },
];

// 収入判定パターン
const INCOME_PATTERNS = [
    /入金/,
    /振込[^手数料]/,
    /売上/,
    /PayPay.*入金/,
    /クレジット.*入金/,
    /QR.*入金/,
];

export interface CategoryEstimation {
    category: ExpenseCategory | null;
    confidence: number;
    reasoning: string;
    isIncome: boolean;
}

/**
 * 取引からカテゴリを推定（ルールベース）
 */
export function estimateCategory(
    merchant: string,
    description?: string,
    amount?: number
): CategoryEstimation {
    const text = `${merchant} ${description || ''}`.toLowerCase();
    const textOriginal = `${merchant} ${description || ''}`;

    // 収入判定
    const isIncome = INCOME_PATTERNS.some(p => p.test(textOriginal)) || (amount !== undefined && amount < 0);

    // 収入の場合
    if (isIncome) {
        return {
            category: null,
            confidence: 95,
            reasoning: '売上入金（収入として処理）',
            isIncome: true,
        };
    }

    // ルールマッチング
    for (const rule of CATEGORY_RULES) {
        if (rule.patterns.some(p => p.test(textOriginal))) {
            return {
                category: rule.category,
                confidence: rule.confidence,
                reasoning: rule.reasoning,
                isIncome: false,
            };
        }
    }

    // マッチしない場合
    return {
        category: 'miscellaneous',
        confidence: 30,
        reasoning: 'カテゴリ判定困難（手動確認推奨）',
        isIncome: false,
    };
}

/**
 * 複数の取引をバッチでカテゴリ推定
 */
export function estimateCategoriesBatch(
    transactions: Array<{ merchant: string; description?: string; amount?: number }>
): CategoryEstimation[] {
    return transactions.map(tx => estimateCategory(tx.merchant, tx.description, tx.amount));
}

/**
 * 飲食店向け経費カテゴリの説明
 */
export const RESTAURANT_CATEGORY_DESCRIPTIONS: Record<ExpenseCategory, string> = {
    travel: '交通費・ガソリン代・駐車場代',
    communication: '電話・インターネット代',
    entertainment: '接待ゴルフ・会食・贈答品',
    supplies: '食材仕入れ・消耗品・酒類',
    books: '業界誌・レシピ本',
    advertising: 'グルメサイト・チラシ・看板',
    outsourcing: '清掃・おしぼり・会計士',
    rent: '店舗家賃・機器リース',
    utilities: '電気・ガス・水道',
    fees: '決済手数料・振込手数料',
    insurance: '火災保険・賠償保険',
    depreciation: '厨房設備・内装工事',
    miscellaneous: 'その他経費',
};
