'use client';

import { ExpenseCategory, EXPENSE_CATEGORIES, DeductionType, FilingType, FILING_TYPE_INFO } from '@/lib/types';

// 確定申告書のデータ型
export interface TaxReturnFormData {
    // 基本情報
    fiscalYear: number;
    filingType?: FilingType;      // 申告種別
    name: string;
    address: string;
    occupation: string;

    // 収入金額等（ア〜ク）
    businessRevenue: number;      // ア: 事業（営業等）収入
    salaryRevenue: number;        // カ: 給与収入
    pensionRevenue?: number;      // キ: 公的年金等（Phase C）
    miscRevenue?: number;         // ク: その他（雑所得）

    // 青色申告特別控除
    blueDeduction?: number;       // 青色申告特別控除額

    // 所得金額等
    businessIncome: number;       // ①: 事業所得（青色申告特別控除後）
    salaryIncome: number;         // ⑥: 給与所得
    pensionIncome?: number;       // ⑧: 雑所得（公的年金等）（Phase C）
    miscIncome?: number;          // ⑧: 雑所得（その他）
    totalIncome: number;          // ⑫: 合計所得金額

    // 経費内訳
    expenses: Partial<Record<ExpenseCategory, number>>;
    totalExpenses: number;

    // 所得控除
    deductions: {
        socialInsurance: number;  // ⑬: 社会保険料控除
        lifeInsurance: number;    // ⑮: 生命保険料控除
        earthquakeInsurance: number; // ⑯: 地震保険料控除
        spouse: number;           // ㉑: 配偶者控除
        dependent: number;        // ㉓: 扶養控除
        basic: number;            // ㉔: 基礎控除
        medical: number;          // 医療費控除
        donation: number;         // 寄附金控除
    };
    totalDeductions: number;      // ㉕: 所得控除合計

    // 控除額情報（Phase C）
    salaryDeduction?: number;     // 給与所得控除額
    pensionDeduction?: number;    // 公的年金等控除額

    // 仮想通貨の実現損益
    cryptoGain?: number;          // 仮想通貨の売却益（雑所得に含まれる）

    // 税金計算
    taxableIncome: number;        // ㉖: 課税される所得金額
    incomeTax: number;            // ㉗: 所得税額
    reconstructionTax: number;    // ㊱: 復興特別所得税
    totalTax: number;             // ㊲: 所得税及び復興特別所得税
    withholdingTax: number;       // ㊹: 源泉徴収税額
    finalTaxDue: number;          // ㊺: 申告納税額（正:納付、負:還付）
}

interface TaxReturnFormProps {
    data: TaxReturnFormData;
    className?: string;
}

export function TaxReturnForm({ data, className = '' }: TaxReturnFormProps) {
    const formatAmount = (amount: number | undefined) => {
        if (!amount || amount === 0) return '';
        return new Intl.NumberFormat('ja-JP').format(Math.abs(amount));
    };

    const formatAmountWithSign = (amount: number | undefined) => {
        if (!amount || amount === 0) return '';
        const formatted = new Intl.NumberFormat('ja-JP').format(Math.abs(amount));
        return amount < 0 ? `△${formatted}` : formatted;
    };

    return (
        <div className={`bg-white border-2 border-gray-800 text-xs ${className}`}>
            {/* ヘッダー */}
            <div className="bg-gray-100 border-b-2 border-gray-800 p-2 text-center">
                <div className="text-lg font-bold">令和{data.fiscalYear - 2018}年分の所得税及び復興特別所得税の</div>
                <div className="text-2xl font-bold tracking-widest">確定申告書B</div>
                <div className="text-sm mt-1">（第一表）</div>
            </div>

            {/* 基本情報 */}
            <div className="border-b border-gray-400 p-2 grid grid-cols-2 gap-2">
                <div>
                    <span className="text-gray-500">氏名</span>
                    <div className="font-medium border-b border-dotted border-gray-400 min-h-[1.5rem]">
                        {data.name || '　'}
                    </div>
                </div>
                <div>
                    <span className="text-gray-500">職業</span>
                    <div className="font-medium border-b border-dotted border-gray-400 min-h-[1.5rem]">
                        {data.occupation || '　'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2">
                {/* 左側：収入金額等・所得金額等 */}
                <div className="border-r border-gray-800">
                    {/* 収入金額等 */}
                    <div className="bg-blue-50 border-b border-gray-800 p-1 font-bold text-center">
                        収入金額等
                    </div>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">ア</td>
                                <td className="p-1 border-r border-gray-300">事業（営業等）</td>
                                <td className="p-1 text-right w-24">{formatAmount(data.businessRevenue)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">カ</td>
                                <td className="p-1 border-r border-gray-300">給与</td>
                                <td className="p-1 text-right w-24">{formatAmount(data.salaryRevenue)}</td>
                            </tr>
                            {(data.pensionRevenue ?? 0) > 0 && (
                                <tr className="border-b border-gray-300">
                                    <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">キ</td>
                                    <td className="p-1 border-r border-gray-300">公的年金等</td>
                                    <td className="p-1 text-right w-24">{formatAmount(data.pensionRevenue)}</td>
                                </tr>
                            )}
                            {(data.miscRevenue ?? 0) > 0 && (
                                <tr className="border-b border-gray-300">
                                    <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">ク</td>
                                    <td className="p-1 border-r border-gray-300">その他</td>
                                    <td className="p-1 text-right w-24">{formatAmount(data.miscRevenue)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* 青色申告特別控除（該当する場合） */}
                    {data.blueDeduction && data.blueDeduction > 0 && (
                        <>
                            <div className="bg-blue-100 border-b border-t border-blue-400 p-1 text-center">
                                <span className="text-xs font-medium text-blue-800">
                                    青色申告特別控除: {formatAmount(data.blueDeduction)}円
                                    {data.filingType && ` (${FILING_TYPE_INFO[data.filingType].nameJa})`}
                                </span>
                            </div>
                        </>
                    )}

                    {/* 所得金額等 */}
                    <div className="bg-green-50 border-b border-t border-gray-800 p-1 font-bold text-center">
                        所得金額等
                    </div>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">①</td>
                                <td className="p-1 border-r border-gray-300">事業（営業等）</td>
                                <td className="p-1 text-right w-24">{formatAmount(data.businessIncome)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">⑥</td>
                                <td className="p-1 border-r border-gray-300">給与</td>
                                <td className="p-1 text-right w-24">{formatAmount(data.salaryIncome)}</td>
                            </tr>
                            {((data.pensionIncome ?? 0) > 0 || (data.miscIncome ?? 0) > 0) && (
                                <tr className="border-b border-gray-300">
                                    <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">⑧</td>
                                    <td className="p-1 border-r border-gray-300">雑（年金等）</td>
                                    <td className="p-1 text-right w-24">{formatAmount((data.pensionIncome ?? 0) + (data.miscIncome ?? 0))}</td>
                                </tr>
                            )}
                            <tr className="border-b border-gray-800 bg-yellow-50">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-100">⑫</td>
                                <td className="p-1 border-r border-gray-300 font-bold">合計</td>
                                <td className="p-1 text-right w-24 font-bold">{formatAmount(data.totalIncome)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 右側：所得から差し引かれる金額 */}
                <div>
                    <div className="bg-purple-50 border-b border-gray-800 p-1 font-bold text-center">
                        所得から差し引かれる金額
                    </div>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">⑬</td>
                                <td className="p-1 border-r border-gray-300">社会保険料控除</td>
                                <td className="p-1 text-right w-20">{formatAmount(data.deductions.socialInsurance)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">⑮</td>
                                <td className="p-1 border-r border-gray-300">生命保険料控除</td>
                                <td className="p-1 text-right w-20">{formatAmount(data.deductions.lifeInsurance)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">⑯</td>
                                <td className="p-1 border-r border-gray-300">地震保険料控除</td>
                                <td className="p-1 text-right w-20">{formatAmount(data.deductions.earthquakeInsurance)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㉑</td>
                                <td className="p-1 border-r border-gray-300">配偶者控除</td>
                                <td className="p-1 text-right w-20">{formatAmount(data.deductions.spouse)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㉓</td>
                                <td className="p-1 border-r border-gray-300">扶養控除</td>
                                <td className="p-1 text-right w-20">{formatAmount(data.deductions.dependent)}</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㉔</td>
                                <td className="p-1 border-r border-gray-300">基礎控除</td>
                                <td className="p-1 text-right w-20">{formatAmount(data.deductions.basic)}</td>
                            </tr>
                            <tr className="border-b border-gray-800 bg-yellow-50">
                                <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-100">㉕</td>
                                <td className="p-1 border-r border-gray-300 font-bold">合計</td>
                                <td className="p-1 text-right w-20 font-bold">{formatAmount(data.totalDeductions)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 税金の計算 */}
            <div className="border-t-2 border-gray-800">
                <div className="bg-red-50 border-b border-gray-800 p-1 font-bold text-center">
                    税金の計算
                </div>
                <table className="w-full border-collapse">
                    <tbody>
                        <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㉖</td>
                            <td className="p-1 border-r border-gray-300">課税される所得金額</td>
                            <td className="p-1 text-right w-28 font-medium">{formatAmount(data.taxableIncome)}</td>
                            <td className="p-1 w-8"></td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㉗</td>
                            <td className="p-1 border-r border-gray-300">上の㉖に対する税額</td>
                            <td className="p-1 text-right w-28">{formatAmount(data.incomeTax)}</td>
                            <td className="p-1 w-8"></td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㊱</td>
                            <td className="p-1 border-r border-gray-300">復興特別所得税額</td>
                            <td className="p-1 text-right w-28">{formatAmount(data.reconstructionTax)}</td>
                            <td className="p-1 w-8"></td>
                        </tr>
                        <tr className="border-b border-gray-300 bg-orange-50">
                            <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-100">㊲</td>
                            <td className="p-1 border-r border-gray-300 font-bold">所得税及び復興特別所得税の額</td>
                            <td className="p-1 text-right w-28 font-bold">{formatAmount(data.totalTax)}</td>
                            <td className="p-1 w-8"></td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="p-1 border-r border-gray-300 w-8 text-center bg-gray-50">㊹</td>
                            <td className="p-1 border-r border-gray-300">源泉徴収税額</td>
                            <td className="p-1 text-right w-28">{formatAmount(data.withholdingTax)}</td>
                            <td className="p-1 w-8"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 申告納税額・還付金 */}
            <div className="border-t-2 border-gray-800 bg-gradient-to-r from-blue-100 to-red-100">
                <table className="w-full border-collapse">
                    <tbody>
                        <tr>
                            <td className="p-2 border-r border-gray-800 w-1/2">
                                <div className="text-center">
                                    <div className="text-sm font-bold mb-1">㊺ 申告納税額</div>
                                    <div className="text-lg font-bold text-blue-700">
                                        {data.finalTaxDue > 0 ? `¥${formatAmount(data.finalTaxDue)}` : '-'}
                                    </div>
                                </div>
                            </td>
                            <td className="p-2 w-1/2">
                                <div className="text-center">
                                    <div className="text-sm font-bold mb-1">㊻ 還付される税金</div>
                                    <div className="text-lg font-bold text-red-600">
                                        {data.finalTaxDue < 0 ? `¥${formatAmount(Math.abs(data.finalTaxDue))}` : '-'}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* フッター */}
            <div className="border-t border-gray-400 p-1 text-center text-gray-500 text-[10px]">
                ※ この書類はSwipeTaxで作成した参考資料です。正式な申告はe-Taxをご利用ください。
            </div>
        </div>
    );
}

// 経費内訳コンポーネント
export function ExpenseBreakdown({ expenses }: { expenses: Partial<Record<ExpenseCategory, number>> }) {
    const formatAmount = (amount: number | undefined) => {
        if (!amount || amount === 0) return '-';
        return `¥${new Intl.NumberFormat('ja-JP').format(amount)}`;
    };

    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);

    return (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-2 font-bold text-sm border-b border-gray-300">
                必要経費の内訳
            </div>
            <table className="w-full text-sm">
                <tbody>
                    {EXPENSE_CATEGORIES.map((cat, idx) => {
                        const amount = expenses[cat.id];
                        if (!amount || amount === 0) return null;
                        return (
                            <tr key={cat.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="p-2 border-b border-gray-200">{cat.nameJa}</td>
                                <td className="p-2 border-b border-gray-200 text-right">{formatAmount(amount)}</td>
                            </tr>
                        );
                    })}
                    <tr className="bg-yellow-50 font-bold">
                        <td className="p-2">合計</td>
                        <td className="p-2 text-right">{formatAmount(totalExpenses)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
