'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Loader2,
    AlertCircle,
    Briefcase,
    FileText,
    Home,
    Receipt,
    Users,
    HelpCircle,
    Plus,
    Trash2,
    Building2,
    Shield,
    Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FilingType, FILING_TYPE_INFO, BASIC_DEDUCTION } from '@/lib/types';
import {
    BusinessType,
    BUSINESS_TYPE_INFO,
    WithholdingTaxEntry,
    InsuranceEntry,
    INSURANCE_TYPE_INFO,
    getBusinessProfile,
    saveBusinessProfile,
    markOnboardingComplete,
    calculateTotalWithholdingTax,
    calculateInsuranceDeduction,
    generateEntryId,
} from '@/lib/business-profile-service';
import {
    DeductionData,
    DEFAULT_DEDUCTIONS,
    getDeductions,
    saveDeductions,
} from '@/lib/deduction-service';

type Step = 'business' | 'filing' | 'homeoffice' | 'withholding' | 'deductions' | 'complete';

const STEPS: { id: Step; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'business', title: '事業形態', icon: Briefcase },
    { id: 'filing', title: '申告種別', icon: FileText },
    { id: 'homeoffice', title: '按分設定', icon: Home },
    { id: 'withholding', title: '源泉徴収', icon: Receipt },
    { id: 'deductions', title: '控除情報', icon: Users },
];

export default function ProfilePage() {
    const router = useRouter();
    const { user } = useAuth();
    const fiscalYear = new Date().getFullYear();

    const [currentStep, setCurrentStep] = useState<Step>('business');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // プロフィールデータ
    const [businessType, setBusinessType] = useState<BusinessType>('freelance');
    const [filingType, setFilingType] = useState<FilingType>('blue_etax');
    const [birthDate, setBirthDate] = useState<string>(''); // 生年月日（年金受給者用）
    const [homeOfficeRatio, setHomeOfficeRatio] = useState({
        rent: 0,
        utilities: 0,
        internet: 0,
    });
    // 源泉徴収（複数エントリー）
    const [withholdingTaxEntries, setWithholdingTaxEntries] = useState<WithholdingTaxEntry[]>([]);
    // 保険料控除（複数エントリー）
    const [insuranceEntries, setInsuranceEntries] = useState<InsuranceEntry[]>([]);
    const [deductions, setDeductions] = useState<DeductionData['deductions']>(DEFAULT_DEDUCTIONS);

    // 年金受給者タイプかどうか
    const isPensionerType = businessType === 'pensioner' || businessType === 'pensioner_with_work';

    // 新規エントリー入力用
    const [newWithholdingCompany, setNewWithholdingCompany] = useState('');
    const [newWithholdingAmount, setNewWithholdingAmount] = useState('');
    const [newInsuranceCompany, setNewInsuranceCompany] = useState('');
    const [newInsuranceType, setNewInsuranceType] = useState<InsuranceEntry['type']>('life');
    const [newInsuranceAmount, setNewInsuranceAmount] = useState('');

    // データ読み込み
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const [profile, deductionData] = await Promise.all([
                    getBusinessProfile(user.uid, fiscalYear),
                    getDeductions(user.uid, fiscalYear),
                ]);

                if (profile) {
                    setBusinessType(profile.businessType);
                    setFilingType(profile.filingType);
                    setBirthDate(profile.birthDate || '');
                    setHomeOfficeRatio(profile.homeOfficeRatio);
                    setWithholdingTaxEntries(profile.withholdingTaxEntries || []);
                    setInsuranceEntries(profile.insuranceEntries || []);
                }

                if (deductionData) {
                    setDeductions(deductionData.deductions);
                    if (!profile) {
                        setFilingType(deductionData.filingType);
                    }
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

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

    const handleNext = async () => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStep(STEPS[currentStepIndex + 1].id);
        } else {
            // 最後のステップ → 保存して完了
            await handleSaveAll();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(STEPS[currentStepIndex - 1].id);
        }
    };

    // 源泉徴収エントリー追加
    const handleAddWithholdingEntry = () => {
        if (!newWithholdingCompany.trim() || !newWithholdingAmount) return;

        const amount = parseInt(newWithholdingAmount.replace(/,/g, '')) || 0;
        if (amount <= 0) return;

        setWithholdingTaxEntries(prev => [
            ...prev,
            {
                id: generateEntryId(),
                companyName: newWithholdingCompany.trim(),
                amount,
            },
        ]);
        setNewWithholdingCompany('');
        setNewWithholdingAmount('');
    };

    // 源泉徴収エントリー削除
    const handleRemoveWithholdingEntry = (id: string) => {
        setWithholdingTaxEntries(prev => prev.filter(e => e.id !== id));
    };

    // 保険料エントリー追加
    const handleAddInsuranceEntry = () => {
        if (!newInsuranceCompany.trim() || !newInsuranceAmount) return;

        const amount = parseInt(newInsuranceAmount.replace(/,/g, '')) || 0;
        if (amount <= 0) return;

        setInsuranceEntries(prev => [
            ...prev,
            {
                id: generateEntryId(),
                companyName: newInsuranceCompany.trim(),
                type: newInsuranceType,
                amount,
            },
        ]);
        setNewInsuranceCompany('');
        setNewInsuranceAmount('');
    };

    // 保険料エントリー削除
    const handleRemoveInsuranceEntry = (id: string) => {
        setInsuranceEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleSaveAll = async () => {
        if (!user) return;

        setSaving(true);
        setError(null);

        try {
            // 源泉徴収の合計を計算
            const withholdingTax = calculateTotalWithholdingTax(withholdingTaxEntries);

            // 保険料控除の合計を計算して控除データに反映
            const insuranceDeduction = calculateInsuranceDeduction(insuranceEntries);
            const updatedDeductions = {
                ...deductions,
                lifeInsurance: insuranceDeduction.total,
            };

            // ビジネスプロフィールを保存
            await saveBusinessProfile(user.uid, {
                fiscalYear,
                businessType,
                filingType,
                birthDate: isPensionerType ? birthDate : undefined,
                homeOfficeRatio,
                withholdingTax,
                withholdingTaxEntries,
                insuranceEntries,
                onboardingCompleted: true,
            });

            // 控除データを保存
            await saveDeductions(user.uid, fiscalYear, filingType, updatedDeductions);

            // オンボーディング完了
            await markOnboardingComplete(user.uid, fiscalYear);

            setCurrentStep('complete');
        } catch (err) {
            console.error('Error saving data:', err);
            setError('保存に失敗しました');
        } finally {
            setSaving(false);
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
                    <Link href="/auth/login" className="inline-block py-3 px-6 bg-blue-600 text-white rounded-xl font-medium">
                        ログイン
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
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
                        プロフィール設定
                    </h1>
                    <div className="w-9" />
                </div>
            </header>

            {/* プログレスバー */}
            {currentStep !== 'complete' && (
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center gap-2">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;
                            return (
                                <div key={step.id} className="flex-1 flex items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                            isActive
                                                ? 'bg-blue-600 text-white'
                                                : isCompleted
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-200 text-gray-500'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Icon className="w-4 h-4" />
                                        )}
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-1 mx-1 rounded ${
                                                isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                                            }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-2">
                        {STEPS[currentStepIndex]?.title}（{currentStepIndex + 1}/{STEPS.length}）
                    </p>
                </div>
            )}

            <main className="max-w-lg mx-auto px-4 py-4">
                {/* エラー表示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                )}

                {/* Step 1: 事業形態 */}
                {currentStep === 'business' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">あなたの事業形態は？</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            最も近いものを選んでください
                        </p>

                        <div className="space-y-3">
                            {(Object.keys(BUSINESS_TYPE_INFO) as BusinessType[]).map((type) => {
                                const info = BUSINESS_TYPE_INFO[type];
                                const isSelected = businessType === type;
                                const isPensioner = type === 'pensioner' || type === 'pensioner_with_work';
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setBusinessType(type)}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                            isSelected
                                                ? isPensioner
                                                    ? 'border-emerald-500 bg-emerald-50'
                                                    : 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    isSelected
                                                        ? isPensioner
                                                            ? 'border-emerald-500 bg-emerald-500'
                                                            : 'border-blue-500 bg-blue-500'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">{info.nameJa}</div>
                                                <div className="text-sm text-gray-500">{info.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 年金受給者の場合は生年月日を入力 */}
                        {isPensionerType && (
                            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Calendar className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-800">生年月日</h3>
                                        <p className="text-xs text-gray-500">65歳以上かどうかで控除額が変わります</p>
                                    </div>
                                </div>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                                    style={{ fontSize: '16px' }}
                                />
                                {birthDate && (
                                    <p className="mt-2 text-sm text-emerald-700">
                                        {new Date().getFullYear() - new Date(birthDate).getFullYear() >= 65
                                            ? '65歳以上：公的年金等控除が最大110万円適用されます'
                                            : '65歳未満：公的年金等控除が最大60万円適用されます'
                                        }
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: 申告種別 */}
                {currentStep === 'filing' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">申告種別を選択</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            青色申告は節税効果が高いですが、事前に届出が必要です
                        </p>

                        <div className="space-y-3">
                            {(Object.keys(FILING_TYPE_INFO) as FilingType[]).map((type) => {
                                const info = FILING_TYPE_INFO[type];
                                const isSelected = filingType === type;
                                const isBlue = type !== 'white';
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setFilingType(type)}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                            isSelected
                                                ? isBlue
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-500 bg-gray-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                    isSelected
                                                        ? isBlue
                                                            ? 'border-blue-500 bg-blue-500'
                                                            : 'border-gray-500 bg-gray-500'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-800">{info.nameJa}</span>
                                                    {info.blueDeduction > 0 && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                            {(info.blueDeduction / 10000).toFixed(0)}万円控除
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1">{info.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-start gap-2">
                                <HelpCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-700">
                                    青色申告を初めて行う場合は、税務署への届出が必要です。
                                    届出をしていない場合は「白色申告」を選択してください。
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: 按分設定 */}
                {currentStep === 'homeoffice' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">自宅兼事務所の按分</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            自宅の一部を仕事で使用している場合、その割合を経費にできます
                        </p>

                        <div className="space-y-4">
                            {/* 家賃 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <Home className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-800">家賃・住宅ローン</h3>
                                        <p className="text-xs text-gray-500">事業で使用している面積の割合</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={homeOfficeRatio.rent}
                                        onChange={(e) =>
                                            setHomeOfficeRatio((prev) => ({
                                                ...prev,
                                                rent: parseInt(e.target.value),
                                            }))
                                        }
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                    />
                                    <span className="w-16 text-right font-bold text-teal-600">
                                        {homeOfficeRatio.rent}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    例：1LDKの1部屋を作業場として使用 → 約30〜40%
                                </p>
                            </div>

                            {/* 水道光熱費 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <Receipt className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-800">水道光熱費</h3>
                                        <p className="text-xs text-gray-500">電気・ガス・水道代</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={homeOfficeRatio.utilities}
                                        onChange={(e) =>
                                            setHomeOfficeRatio((prev) => ({
                                                ...prev,
                                                utilities: parseInt(e.target.value),
                                            }))
                                        }
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                    />
                                    <span className="w-16 text-right font-bold text-orange-600">
                                        {homeOfficeRatio.utilities}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    家賃と同じ割合か、使用時間で按分するのが一般的
                                </p>
                            </div>

                            {/* 通信費 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Receipt className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-800">インターネット・電話</h3>
                                        <p className="text-xs text-gray-500">通信費の事業使用割合</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={homeOfficeRatio.internet}
                                        onChange={(e) =>
                                            setHomeOfficeRatio((prev) => ({
                                                ...prev,
                                                internet: parseInt(e.target.value),
                                            }))
                                        }
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    />
                                    <span className="w-16 text-right font-bold text-purple-600">
                                        {homeOfficeRatio.internet}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    仕事専用なら100%、プライベートと共用なら50%程度
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700">
                                按分比率は合理的な根拠が必要です。作業部屋の面積や使用時間で計算してください。
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 4: 源泉徴収 */}
                {currentStep === 'withholding' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">源泉徴収税額</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            支払調書が届いたら、会社ごとに追加してください
                        </p>

                        {/* 登録済みエントリー一覧 */}
                        {withholdingTaxEntries.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {withholdingTaxEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-emerald-600" />
                                            <div>
                                                <p className="font-medium text-gray-800">{entry.companyName}</p>
                                                <p className="text-sm text-emerald-600">¥{formatCurrency(entry.amount)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveWithholdingEntry(entry.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {/* 合計 */}
                                <div className="p-3 bg-emerald-100 rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-emerald-800">合計</span>
                                        <span className="text-xl font-bold text-emerald-700">
                                            ¥{formatCurrency(calculateTotalWithholdingTax(withholdingTaxEntries))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 新規追加フォーム */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Plus className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-800">源泉徴収を追加</h3>
                                    <p className="text-xs text-gray-500">
                                        支払調書の内容を入力
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">会社名</label>
                                    <input
                                        type="text"
                                        value={newWithholdingCompany}
                                        onChange={(e) => setNewWithholdingCompany(e.target.value)}
                                        placeholder="例：株式会社○○"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">源泉徴収税額</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={newWithholdingAmount}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                setNewWithholdingAmount(val ? formatCurrency(parseInt(val)) : '');
                                            }}
                                            placeholder="0"
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddWithholdingEntry}
                                    disabled={!newWithholdingCompany.trim() || !newWithholdingAmount}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    追加
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <h4 className="font-medium text-emerald-800 mb-2">源泉徴収とは？</h4>
                            <ul className="text-sm text-emerald-700 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">•</span>
                                    <span>企業があなたの報酬から事前に差し引いて税務署に納付している税金です</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">•</span>
                                    <span>確定申告で精算し、払い過ぎた分は還付されます</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">•</span>
                                    <span>年末〜翌年1月に届く「支払調書」で確認できます</span>
                                </li>
                            </ul>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700">
                                <strong>後から追加OK：</strong>支払調書が届いたら、いつでもこの画面から追加できます。
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 5: 控除情報 */}
                {currentStep === 'deductions' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">控除情報</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            該当する項目があれば入力してください（後から編集可）
                        </p>

                        {/* 基礎控除 */}
                        <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium text-purple-800">基礎控除</h3>
                                    <p className="text-xs text-purple-600">全員に自動適用</p>
                                </div>
                                <span className="text-lg font-bold text-purple-700">
                                    ¥{formatCurrency(BASIC_DEDUCTION)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* 社会保険料 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    社会保険料控除
                                    <span className="text-xs text-gray-400 ml-2">国民健康保険・国民年金など</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={deductions.socialInsurance > 0 ? formatCurrency(deductions.socialInsurance) : ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value.replace(/,/g, '')) || 0;
                                            setDeductions((prev) => ({ ...prev, socialInsurance: val }));
                                        }}
                                        placeholder="0"
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                                    />
                                </div>
                            </div>

                            {/* 生命保険料控除（複数エントリー） */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <Shield className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <h3 className="font-medium text-gray-800">生命保険料控除</h3>
                                        <p className="text-xs text-gray-500">各区分最大4万円、合計最大12万円</p>
                                    </div>
                                </div>

                                {/* 登録済み保険一覧 */}
                                {insuranceEntries.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        {insuranceEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="flex items-center justify-between p-2 bg-purple-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{entry.companyName}</p>
                                                    <p className="text-xs text-purple-600">
                                                        {INSURANCE_TYPE_INFO[entry.type].nameJa} / ¥{formatCurrency(entry.amount)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveInsuranceEntry(entry.id)}
                                                    className="p-1 text-red-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {/* 控除額合計 */}
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-purple-700">控除適用額</span>
                                                <span className="font-bold text-purple-800">
                                                    ¥{formatCurrency(calculateInsuranceDeduction(insuranceEntries).total)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 新規追加フォーム */}
                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={newInsuranceCompany}
                                            onChange={(e) => setNewInsuranceCompany(e.target.value)}
                                            placeholder="保険会社名"
                                            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                        <select
                                            value={newInsuranceType}
                                            onChange={(e) => setNewInsuranceType(e.target.value as InsuranceEntry['type'])}
                                            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="life">一般生命保険</option>
                                            <option value="medical">介護医療保険</option>
                                            <option value="pension">個人年金保険</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={newInsuranceAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                                    setNewInsuranceAmount(val ? formatCurrency(parseInt(val)) : '');
                                                }}
                                                placeholder="支払保険料"
                                                className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddInsuranceEntry}
                                            disabled={!newInsuranceCompany.trim() || !newInsuranceAmount}
                                            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 配偶者控除 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    配偶者控除
                                    <span className="text-xs text-gray-400 ml-2">配偶者の所得48万円以下</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={deductions.spouse > 0 ? formatCurrency(deductions.spouse) : ''}
                                        onChange={(e) => {
                                            const val = Math.min(parseInt(e.target.value.replace(/,/g, '')) || 0, 380000);
                                            setDeductions((prev) => ({ ...prev, spouse: val }));
                                        }}
                                        placeholder="最大380,000"
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                                    />
                                </div>
                            </div>

                            {/* 扶養控除 */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    扶養控除
                                    <span className="text-xs text-gray-400 ml-2">16歳以上の扶養親族</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={deductions.dependent > 0 ? formatCurrency(deductions.dependent) : ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value.replace(/,/g, '')) || 0;
                                            setDeductions((prev) => ({ ...prev, dependent: val }));
                                        }}
                                        placeholder="0"
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 mt-4 text-center">
                            医療費控除・寄附金控除などは後から「控除入力」画面で追加できます
                        </p>
                    </div>
                )}

                {/* 完了画面 */}
                {currentStep === 'complete' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Check className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">設定完了!</h2>
                        <p className="text-gray-500 mb-8">
                            プロフィールを保存しました。
                            <br />
                            いつでもこの画面から編集できます。
                        </p>

                        <div className="space-y-3">
                            <Link
                                href="/"
                                className="block w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-center"
                            >
                                ホームへ戻る
                            </Link>
                            <Link
                                href="/import"
                                className="block w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors text-center"
                            >
                                データを取り込む
                            </Link>
                        </div>
                    </div>
                )}

                {/* ナビゲーションボタン */}
                {currentStep !== 'complete' && (
                    <div className="mt-8 flex gap-3">
                        {currentStepIndex > 0 && (
                            <button
                                onClick={handlePrev}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                戻る
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={saving}
                            className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    保存中...
                                </>
                            ) : currentStepIndex === STEPS.length - 1 ? (
                                <>
                                    完了
                                    <Check className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    次へ
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
