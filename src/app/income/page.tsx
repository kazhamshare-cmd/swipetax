'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Briefcase,
    Banknote,
    Building2,
    FileText,
    Plus,
    Trash2,
    Check,
    HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    IncomeEntry,
    IncomeType,
    PensionType,
    INCOME_TYPE_INFO,
    PENSION_TYPE_INFO,
} from '@/lib/types';
import {
    saveIncomeEntry,
    getIncomeEntries,
    deleteIncomeEntry,
    getIncomeByType,
} from '@/lib/income-service';
import { getBusinessProfile, isAge65OrOlder } from '@/lib/business-profile-service';

export default function IncomePage() {
    const router = useRouter();
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // 現在選択中のタブ
    const [activeTab, setActiveTab] = useState<IncomeType>('pension');

    // 収入エントリー一覧
    const [entries, setEntries] = useState<IncomeEntry[]>([]);
    const [birthDate, setBirthDate] = useState<string | undefined>();

    // フォームデータ
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        sourceName: '',
        withholdingTax: '',
        pensionType: 'kosei' as PensionType,
        salaryMonth: new Date().toISOString().slice(0, 7),
        notes: '',
    });

    // データ読み込み
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const [incomeEntries, profile] = await Promise.all([
                    getIncomeEntries(user.uid, fiscalYear),
                    getBusinessProfile(user.uid, fiscalYear),
                ]);
                setEntries(incomeEntries);
                setBirthDate(profile?.birthDate);

                // 年金受給者なら年金タブをデフォルトに、それ以外は事業タブ
                if (profile?.businessType === 'pensioner' || profile?.businessType === 'pensioner_with_work') {
                    setActiveTab('pension');
                } else {
                    setActiveTab('business');
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError('データの読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, fiscalYear]);

    // フォームリセット
    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            sourceName: '',
            withholdingTax: '',
            pensionType: 'kosei',
            salaryMonth: new Date().toISOString().slice(0, 7),
            notes: '',
        });
    };

    // 収入追加
    const handleSubmit = async () => {
        if (!user) return;

        const amount = parseInt(formData.amount.replace(/,/g, '')) || 0;
        if (amount <= 0 || !formData.sourceName.trim()) {
            setError('金額と支払元を入力してください');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const withholdingTax = parseInt(formData.withholdingTax.replace(/,/g, '')) || 0;

            await saveIncomeEntry(user.uid, {
                fiscalYear,
                incomeType: activeTab,
                date: formData.date,
                amount,
                sourceName: formData.sourceName.trim(),
                withholdingTax: withholdingTax > 0 ? withholdingTax : undefined,
                pensionType: activeTab === 'pension' ? formData.pensionType : undefined,
                salaryMonth: activeTab === 'salary' ? formData.salaryMonth : undefined,
                notes: formData.notes.trim() || undefined,
            });

            // リロード
            const updatedEntries = await getIncomeEntries(user.uid, fiscalYear);
            setEntries(updatedEntries);
            resetForm();
            setSuccess('収入を登録しました');

            // 3秒後にメッセージを消す
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving income:', err);
            setError('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    // 収入削除
    const handleDelete = async (id: string) => {
        if (!user) return;

        try {
            await deleteIncomeEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Error deleting income:', err);
            setError('削除に失敗しました');
        }
    };

    // 金額フォーマット
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ja-JP').format(amount);
    };

    // タブアイコン
    const getTabIcon = (type: IncomeType) => {
        switch (type) {
            case 'business': return Briefcase;
            case 'salary': return Banknote;
            case 'pension': return Building2;
            case 'miscellaneous': return FileText;
        }
    };

    // フィルター済みエントリー
    const filteredEntries = entries.filter(e => e.incomeType === activeTab);
    const tabTotal = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
    const tabWithholding = filteredEntries.reduce((sum, e) => sum + (e.withholdingTax || 0), 0);

    // 65歳以上かどうか
    const isOver65 = isAge65OrOlder(birthDate, new Date(fiscalYear, 11, 31));

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
                    <Link href="/auth/login" className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium">
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* ヘッダー */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
                    <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="flex-1 text-center font-bold text-gray-800">
                        収入入力
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            {/* タブ */}
            <div className="sticky top-[52px] bg-white border-b border-gray-200 z-10">
                <div className="max-w-lg mx-auto px-2">
                    <div className="flex">
                        {(['pension', 'salary', 'business', 'miscellaneous'] as IncomeType[]).map((type) => {
                            const Icon = getTabIcon(type);
                            const info = INCOME_TYPE_INFO[type];
                            const isActive = activeTab === type;
                            const count = entries.filter(e => e.incomeType === type).length;

                            return (
                                <button
                                    key={type}
                                    onClick={() => setActiveTab(type)}
                                    className={`flex-1 py-3 px-2 text-center transition-colors relative ${
                                        isActive
                                            ? 'text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="relative">
                                            <Icon className="w-5 h-5" />
                                            {count > 0 && (
                                                <span className="absolute -top-1 -right-2 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                                    {count}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium">{info.nameJa}</span>
                                    </div>
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="max-w-lg mx-auto px-4 py-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">読み込み中...</p>
                    </div>
                ) : (
                    <>
                        {/* エラー・成功メッセージ */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <span className="text-sm text-red-700">{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span className="text-sm text-emerald-700">{success}</span>
                            </div>
                        )}

                        {/* 合計表示 */}
                        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">
                                    {INCOME_TYPE_INFO[activeTab].nameJa}合計
                                </span>
                                <span className="text-xl font-bold text-blue-600">
                                    {formatCurrency(tabTotal)}円
                                </span>
                            </div>
                            {tabWithholding > 0 && (
                                <div className="flex justify-between items-center mt-2 text-sm">
                                    <span className="text-gray-500">源泉徴収税額</span>
                                    <span className="text-emerald-600 font-medium">
                                        {formatCurrency(tabWithholding)}円
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 入力フォーム */}
                        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
                            <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-500" />
                                {INCOME_TYPE_INFO[activeTab].nameJa}を追加
                            </h3>

                            <div className="space-y-4">
                                {/* 支払元 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        {activeTab === 'pension' ? '年金の種類' : '支払元'}
                                    </label>
                                    {activeTab === 'pension' ? (
                                        <div className="space-y-2">
                                            <select
                                                value={formData.pensionType}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    pensionType: e.target.value as PensionType,
                                                    sourceName: PENSION_TYPE_INFO[e.target.value as PensionType].nameJa,
                                                }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                                style={{ fontSize: '16px' }}
                                            >
                                                {(Object.keys(PENSION_TYPE_INFO) as PensionType[]).map((type) => (
                                                    <option key={type} value={type}>
                                                        {PENSION_TYPE_INFO[type].nameJa}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={formData.sourceName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sourceName: e.target.value }))}
                                                placeholder="支払者名（日本年金機構など）"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData.sourceName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sourceName: e.target.value }))}
                                            placeholder={activeTab === 'salary' ? '例：株式会社○○' : '例：○○商事'}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                            style={{ fontSize: '16px' }}
                                        />
                                    )}
                                </div>

                                {/* 金額 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        {activeTab === 'pension' ? '年金支給額（年額）' : '金額'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.amount}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    amount: val ? formatCurrency(parseInt(val)) : '',
                                                }));
                                            }}
                                            placeholder="0"
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right text-lg"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>

                                {/* 源泉徴収税額 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        源泉徴収税額（任意）
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formData.withholdingTax}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    withholdingTax: val ? formatCurrency(parseInt(val)) : '',
                                                }));
                                            }}
                                            placeholder="0"
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                </div>

                                {/* 給与の場合は対象月 */}
                                {activeTab === 'salary' && (
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">対象月</label>
                                        <input
                                            type="month"
                                            value={formData.salaryMonth}
                                            onChange={(e) => setFormData(prev => ({ ...prev, salaryMonth: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            style={{ fontSize: '16px' }}
                                        />
                                    </div>
                                )}

                                {/* 日付 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        {activeTab === 'pension' ? '受給日' : '受取日'}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>

                                {/* 備考 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">備考（任意）</label>
                                    <input
                                        type="text"
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="メモがあれば入力"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>

                                {/* 追加ボタン */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            追加
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 年金の場合のヘルプ */}
                        {activeTab === 'pension' && (
                            <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                <div className="flex items-start gap-2">
                                    <HelpCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-emerald-800 mb-1">公的年金等控除について</h4>
                                        <p className="text-sm text-emerald-700">
                                            {isOver65 ? (
                                                <>
                                                    65歳以上の場合、年金収入110万円以下は全額控除されます。
                                                    110万円超330万円以下の場合は110万円が控除されます。
                                                </>
                                            ) : (
                                                <>
                                                    65歳未満の場合、年金収入60万円以下は全額控除されます。
                                                    60万円超130万円以下の場合は60万円が控除されます。
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 登録済み一覧 */}
                        {filteredEntries.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-medium text-gray-700 mb-2">登録済み</h3>
                                {filteredEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-800">{entry.sourceName}</div>
                                            <div className="text-sm text-gray-500">
                                                {entry.date} {entry.pensionType && `・${PENSION_TYPE_INFO[entry.pensionType].nameJa}`}
                                            </div>
                                            <div className="text-blue-600 font-bold">
                                                {formatCurrency(entry.amount)}円
                                                {entry.withholdingTax && entry.withholdingTax > 0 && (
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        (源泉: {formatCurrency(entry.withholdingTax)}円)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 確定申告要否チェックへのリンク */}
                        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                            <Link
                                href="/filing-check"
                                className="flex items-center justify-between"
                            >
                                <div>
                                    <div className="font-medium text-gray-800">確定申告が必要かチェック</div>
                                    <div className="text-sm text-gray-500">年金収入と他の所得から判定します</div>
                                </div>
                                <div className="text-blue-600">→</div>
                            </Link>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
