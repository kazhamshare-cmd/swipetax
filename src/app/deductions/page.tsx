'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Heart,
    Shield,
    Umbrella,
    Home,
    Gift,
    Users,
    Baby,
    Check,
    Save,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BASIC_DEDUCTION } from '@/lib/types';
import { getDeductions, saveDeductions, DEFAULT_DEDUCTIONS, DeductionData } from '@/lib/deduction-service';

// 控除項目のキー（DeductionDataのdeductionsオブジェクトのキーに対応）
type DeductionKey = keyof DeductionData['deductions'];

interface DeductionItem {
    id: DeductionKey;
    nameJa: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    maxAmount?: number;
    placeholder: string;
    helpText?: string;
}

const DEDUCTION_ITEMS: DeductionItem[] = [
    {
        id: 'socialInsurance',
        nameJa: '社会保険料控除',
        description: '国民健康保険、国民年金など',
        icon: Shield,
        placeholder: '0',
        helpText: '支払った全額が控除対象',
    },
    {
        id: 'lifeInsurance',
        nameJa: '生命保険料控除',
        description: '生命保険、介護医療保険、個人年金保険',
        icon: Umbrella,
        maxAmount: 120000,
        placeholder: '最大12万円',
        helpText: '一般・介護医療・個人年金の合計',
    },
    {
        id: 'earthquakeInsurance',
        nameJa: '地震保険料控除',
        description: '地震保険料',
        icon: Home,
        maxAmount: 50000,
        placeholder: '最大5万円',
    },
    {
        id: 'medical',
        nameJa: '医療費控除',
        description: '年間10万円を超える医療費',
        icon: Heart,
        placeholder: '0',
        helpText: '(支払医療費 - 保険補填額 - 10万円)',
    },
    {
        id: 'donation',
        nameJa: '寄附金控除',
        description: 'ふるさと納税、認定NPO法人への寄付',
        icon: Gift,
        placeholder: '0',
        helpText: '(寄附金額 - 2,000円) が控除対象',
    },
    {
        id: 'spouse',
        nameJa: '配偶者控除',
        description: '配偶者の所得が48万円以下の場合',
        icon: Users,
        maxAmount: 380000,
        placeholder: '最大38万円',
        helpText: '配偶者の所得により金額が変動',
    },
    {
        id: 'dependent',
        nameJa: '扶養控除',
        description: '扶養家族がいる場合',
        icon: Baby,
        placeholder: '0',
        helpText: '16歳以上の扶養親族1人につき38万円〜',
    },
];

export default function DeductionsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deductions, setDeductions] = useState<DeductionData['deductions']>(DEFAULT_DEDUCTIONS);

    const fiscalYear = new Date().getFullYear();

    // 控除データをFirestoreから読み込み
    useEffect(() => {
        if (!user) return;

        const loadDeductions = async () => {
            try {
                setLoading(true);
                const data = await getDeductions(user.uid, fiscalYear);
                if (data) {
                    setDeductions(data.deductions);
                }
            } catch (err) {
                console.error('Error loading deductions:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadDeductions();
    }, [user, fiscalYear]);

    const handleAmountChange = (id: DeductionKey, value: string) => {
        // カンマを除去して数値に変換
        const amount = parseInt(value.replace(/,/g, '')) || 0;

        // 上限チェック
        const item = DEDUCTION_ITEMS.find(i => i.id === id);
        const finalAmount = item?.maxAmount ? Math.min(amount, item.maxAmount) : amount;

        setDeductions(prev => ({
            ...prev,
            [id]: finalAmount,
        }));
        setSaved(false);
    };

    const calculateTotal = () => {
        return Object.entries(deductions).reduce((sum, [key, val]) => {
            // 基礎控除は別表示なのでスキップ
            if (key === 'basic') return sum;
            return sum + (val || 0);
        }, 0) + BASIC_DEDUCTION;
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        setError(null);

        try {
            await saveDeductions(user.uid, fiscalYear, 'blue_etax', deductions);
            setSaved(true);
        } catch (err) {
            console.error('Error saving deductions:', err);
            setError('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndReturn = async () => {
        await handleSave();
        if (!error) {
            router.push('/summary');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP').format(amount);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <Link
                        href="/auth/login"
                        className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium"
                    >
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-purple-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/summary" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        控除情報入力
                    </h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="p-2 -mr-2 rounded-full hover:bg-gray-100"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : saved ? (
                            <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <Save className="w-5 h-5 text-gray-600" />
                        )}
                    </button>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6">
                {/* 年度表示 */}
                <div className="text-center mb-6">
                    <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {fiscalYear}年分 所得控除
                    </span>
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">読み込み中...</p>
                    </div>
                ) : (
                    <>
                        {/* 基礎控除（固定） */}
                        <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium text-purple-800">基礎控除</h3>
                                    <p className="text-xs text-purple-600">全員に適用される控除（所得2,400万円以下）</p>
                                </div>
                                <span className="text-lg font-bold text-purple-700">
                                    ¥{formatCurrency(BASIC_DEDUCTION)}
                                </span>
                            </div>
                        </div>

                        {/* 各控除項目 */}
                        <div className="space-y-4 mb-6">
                            {DEDUCTION_ITEMS.map(item => {
                                const Icon = item.icon;
                                const value = deductions[item.id] || 0;
                                return (
                                    <div
                                        key={item.id}
                                        className="p-4 bg-white rounded-xl border border-gray-200"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="p-2 bg-gray-100 rounded-lg">
                                                <Icon className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-800">{item.nameJa}</h3>
                                                <p className="text-xs text-gray-500">{item.description}</p>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                ¥
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={value > 0 ? formatCurrency(value) : ''}
                                                onChange={(e) => handleAmountChange(item.id, e.target.value)}
                                                placeholder={item.placeholder}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                                            />
                                        </div>

                                        <div className="flex justify-between mt-1">
                                            {item.helpText && (
                                                <p className="text-xs text-gray-400">{item.helpText}</p>
                                            )}
                                            {item.maxAmount && (
                                                <p className="text-xs text-gray-400 ml-auto">
                                                    上限: ¥{formatCurrency(item.maxAmount)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 合計 */}
                        <div className="mb-6 p-5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">控除合計</span>
                                <span className="text-2xl font-bold">
                                    ¥{formatCurrency(calculateTotal())}
                                </span>
                            </div>
                            <p className="text-xs text-purple-200 mt-1">
                                基礎控除 ¥{formatCurrency(BASIC_DEDUCTION)} + その他控除
                            </p>
                        </div>

                        {/* アクションボタン */}
                        <div className="space-y-3">
                            <button
                                onClick={handleSaveAndReturn}
                                disabled={saving}
                                className="w-full py-4 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        保存中...
                                    </>
                                ) : (
                                    '保存して戻る'
                                )}
                            </button>

                            <Link
                                href="/summary"
                                className="w-full py-3 text-gray-600 text-center block"
                            >
                                キャンセル
                            </Link>
                        </div>

                        {/* ヘルプ */}
                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <h3 className="font-medium text-amber-800 mb-2">入力のヒント</h3>
                            <ul className="text-sm text-amber-700 space-y-1">
                                <li>• 源泉徴収票や保険料控除証明書を参照してください</li>
                                <li>• 金額は1円単位で入力できます</li>
                                <li>• 上限がある項目は自動的に調整されます</li>
                            </ul>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
