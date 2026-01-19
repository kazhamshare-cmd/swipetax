'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    Loader2,
    Sparkles,
    ArrowRight,
    FileText,
    PiggyBank,
    Calculator,
    CheckCircle,
    Camera,
    ClipboardList,
    ArrowLeft,
    Building2,
    MapPin,
    User,
    Briefcase,
    Package,
    Check,
    AlertCircle,
} from 'lucide-react';
import { CameraCapture } from '@/components/import';
import { CameraResult } from '@/hooks/useCamera';
import { TaxReturnOCRResult, DepreciationAsset, BalanceSheetAssets } from '@/lib/import/document-types';
import {
    saveBusinessProfile,
    markOnboardingComplete,
    generateEntryId,
    DepreciationAssetProfile,
    OpeningBalanceSheet,
} from '@/lib/business-profile-service';
import { FilingType } from '@/lib/types';

type OnboardingStep =
    | 'welcome'           // ようこそ画面
    | 'choice'            // 前年申告書があるか選択
    | 'scan'              // カメラ撮影
    | 'processing'        // OCR処理中
    | 'review'            // 読み取り結果確認
    | 'depreciation'      // 減価償却資産確認
    | 'balance'           // 期首資産確認
    | 'complete';         // 完了

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [capturedImage, setCapturedImage] = useState<CameraResult | null>(null);
    const [ocrResult, setOcrResult] = useState<TaxReturnOCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 編集可能なフォームデータ
    const [formData, setFormData] = useState({
        taxpayerName: '',
        taxpayerAddress: '',
        businessName: '',
        businessType: '',
        filingType: 'white' as FilingType,
    });

    // 減価償却資産（チェック状態付き）
    const [depreciationAssets, setDepreciationAssets] = useState<
        (DepreciationAsset & { selected: boolean })[]
    >([]);

    // 期首資産（前年の期末資産）
    const [balanceSheet, setBalanceSheet] = useState<OpeningBalanceSheet>({});

    const currentFiscalYear = new Date().getFullYear();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/auth/login');
        }
    }, [user, loading, router]);

    // OCR結果を反映
    useEffect(() => {
        if (ocrResult?.success) {
            setFormData({
                taxpayerName: ocrResult.taxpayerName || '',
                taxpayerAddress: ocrResult.taxpayerAddress || '',
                businessName: ocrResult.businessName || '',
                businessType: ocrResult.businessType || '',
                filingType: ocrResult.filingType || 'white',
            });

            // 減価償却資産があれば設定
            if (ocrResult.depreciationAssets && ocrResult.depreciationAssets.length > 0) {
                setDepreciationAssets(
                    ocrResult.depreciationAssets.map((asset) => ({
                        ...asset,
                        selected: true, // デフォルトで全て選択
                    }))
                );
            }

            // 期首資産（前年の期末資産）を設定
            if (ocrResult.balanceSheet) {
                const bs = ocrResult.balanceSheet;
                setBalanceSheet({
                    cash: bs.cash ?? undefined,
                    deposits: bs.deposits ?? undefined,
                    accountsReceivable: bs.accountsReceivable ?? undefined,
                    inventory: bs.inventory ?? undefined,
                    supplies: bs.supplies ?? undefined,
                    prepaidExpenses: bs.prepaidExpenses ?? undefined,
                    land: bs.land ?? undefined,
                    accountsPayable: bs.accountsPayable ?? undefined,
                    unpaidExpenses: bs.unpaidExpenses ?? undefined,
                    loans: bs.loans ?? undefined,
                    capital: bs.capital ?? undefined,
                });
            }
        }
    }, [ocrResult]);

    // 撮影完了時
    const handleCapture = useCallback(async (result: CameraResult) => {
        setCapturedImage(result);
        setStep('processing');
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', result.blob);
            formData.append('documentType', 'tax_return');

            const response = await fetch('/api/import/ocr', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('OCR処理に失敗しました');
            }

            const data: TaxReturnOCRResult = await response.json();
            setOcrResult(data);
            setStep('review');
        } catch (err) {
            console.error('OCR Error:', err);
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setStep('review');
        }
    }, []);

    // 保存処理
    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        try {
            // 選択された減価償却資産を変換
            const selectedAssets: DepreciationAssetProfile[] = depreciationAssets
                .filter((a) => a.selected)
                .map((asset) => ({
                    id: generateEntryId(),
                    name: asset.name,
                    acquisitionDate: asset.acquisitionDate || undefined,
                    acquisitionCost: asset.acquisitionCost,
                    usefulLife: asset.usefulLife || undefined,
                    depreciationMethod: asset.depreciationMethod || undefined,
                    accumulatedDepreciation: asset.accumulatedDepreciation || undefined,
                    bookValue: asset.bookValue || undefined,
                }));

            // 期首資産（値がある項目のみ）
            const hasBalanceData = Object.values(balanceSheet).some(v => v !== undefined && v !== 0);
            const openingBalance: OpeningBalanceSheet | undefined = hasBalanceData ? balanceSheet : undefined;

            // プロフィール保存
            await saveBusinessProfile(user.uid, {
                fiscalYear: currentFiscalYear,
                taxpayerName: formData.taxpayerName || undefined,
                taxpayerAddress: formData.taxpayerAddress || undefined,
                businessName: formData.businessName || undefined,
                businessCategory: formData.businessType || undefined,
                filingType: formData.filingType,
                businessType: 'sole_proprietor', // デフォルト
                homeOfficeRatio: { rent: 0, utilities: 0, internet: 0 },
                withholdingTax: 0,
                depreciationAssets: selectedAssets.length > 0 ? selectedAssets : undefined,
                openingBalance,
                previousYearData: ocrResult ? {
                    fiscalYear: ocrResult.fiscalYear || currentFiscalYear - 1,
                    grossRevenue: ocrResult.grossRevenue || undefined,
                    businessIncome: ocrResult.businessIncome || undefined,
                    totalExpenses: ocrResult.totalExpenses || undefined,
                } : undefined,
            });

            await markOnboardingComplete(user.uid, currentFiscalYear);
            setStep('complete');
        } catch (err) {
            console.error('Save error:', err);
            setError('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    // 手動設定へ進む
    const handleManualSetup = () => {
        router.push('/profile');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const features = [
        {
            icon: Sparkles,
            title: 'スワイプで簡単仕分け',
            description: 'AIが経費のカテゴリを提案。左右にスワイプするだけ',
            color: 'blue',
        },
        {
            icon: PiggyBank,
            title: '按分も自動計算',
            description: '家賃や光熱費の事業使用割合を自動で按分',
            color: 'green',
        },
        {
            icon: Calculator,
            title: '源泉徴収・還付金もOK',
            description: '源泉徴収税額を入力すれば還付金額まで計算',
            color: 'purple',
        },
        {
            icon: FileText,
            title: '確定申告書を自動作成',
            description: 'データから確定申告書Bを自動生成',
            color: 'amber',
        },
    ];

    // ==================== Welcome Step ====================
    if (step === 'welcome') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
                <div className="min-h-screen flex flex-col">
                    <div className="pt-12 pb-8 px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                                アカウント作成完了
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            SwipeTaxへようこそ！
                        </h1>
                        <p className="text-gray-600 max-w-md mx-auto">
                            確定申告をもっと簡単に。
                        </p>
                    </div>

                    <div className="flex-1 px-6 py-4">
                        <div className="max-w-md mx-auto space-y-4">
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                const bgColor = {
                                    blue: 'bg-blue-100',
                                    green: 'bg-green-100',
                                    purple: 'bg-purple-100',
                                    amber: 'bg-amber-100',
                                }[feature.color];
                                const iconColor = {
                                    blue: 'text-blue-600',
                                    green: 'text-green-600',
                                    purple: 'text-purple-600',
                                    amber: 'text-amber-600',
                                }[feature.color];

                                return (
                                    <div
                                        key={index}
                                        className="flex items-start gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white"
                                    >
                                        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <Icon className={`w-6 h-6 ${iconColor}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 mb-1">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="px-6 py-8 bg-white/50 backdrop-blur-sm border-t border-white">
                        <div className="max-w-md mx-auto">
                            <button
                                onClick={() => setStep('choice')}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                            >
                                初期設定を始める
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== Choice Step ====================
    if (step === 'choice') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
                <div className="min-h-screen flex flex-col">
                    <header className="px-4 py-4 flex items-center">
                        <button
                            onClick={() => setStep('welcome')}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                    </header>

                    <div className="flex-1 px-6 py-8">
                        <div className="max-w-md mx-auto">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                                前年の確定申告書はありますか？
                            </h1>
                            <p className="text-gray-600 text-center mb-8">
                                お持ちの場合、撮影するだけで<br />
                                必要な情報を自動で読み取ります
                            </p>

                            <div className="space-y-4">
                                {/* 申告書がある場合 */}
                                <button
                                    onClick={() => setStep('scan')}
                                    className="w-full p-6 bg-white rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-colors text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Camera className="w-7 h-7 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 mb-1">
                                                申告書を撮影して読み取り
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                前年の確定申告書（控え）を撮影すると、<br />
                                                氏名・住所・屋号・減価償却資産などを<br />
                                                自動で読み取ります
                                            </p>
                                            <div className="mt-3 flex items-center text-blue-600 font-medium text-sm">
                                                撮影する
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* 申告書がない場合 */}
                                <button
                                    onClick={handleManualSetup}
                                    className="w-full p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-colors text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <ClipboardList className="w-7 h-7 text-gray-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 mb-1">
                                                手動で設定する
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                初めての確定申告の方や、<br />
                                                申告書が手元にない場合はこちら
                                            </p>
                                            <div className="mt-3 flex items-center text-gray-600 font-medium text-sm">
                                                設定画面へ
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== Scan Step ====================
    if (step === 'scan') {
        return (
            <CameraCapture
                onCapture={handleCapture}
                onCancel={() => setStep('choice')}
                title="確定申告書を撮影"
                instructions="確定申告書の1ページ目（氏名・住所が記載されている面）を撮影してください。青色申告決算書があれば、そちらも後から撮影できます。"
            />
        );
    }

    // ==================== Processing Step ====================
    if (step === 'processing') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center px-6">
                    <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                    <p className="mt-4 text-gray-800 font-medium">読み取り中...</p>
                    <p className="mt-2 text-sm text-gray-500">
                        AIが確定申告書の内容を解析しています
                    </p>
                </div>
            </div>
        );
    }

    // ==================== Review Step ====================
    if (step === 'review') {
        const hasDepreciation = depreciationAssets.length > 0;
        const hasBalanceData = Object.values(balanceSheet).some(v => v !== undefined && v !== 0);

        const getNextStep = () => {
            if (hasDepreciation) return 'depreciation';
            if (hasBalanceData) return 'balance';
            return null; // save
        };

        const nextStep = getNextStep();

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
                        <button
                            onClick={() => setStep('choice')}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">読み取り結果の確認</h1>
                    </div>
                </header>

                <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-800 font-medium">読み取りに問題がありました</p>
                                <p className="text-sm text-red-600 mt-1">{error}</p>
                                <p className="text-sm text-gray-600 mt-2">
                                    手動で入力するか、再度撮影してください
                                </p>
                            </div>
                        </div>
                    )}

                    {ocrResult?.success && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <p className="text-green-800">
                                読み取りに成功しました（信頼度: {ocrResult.confidence}%）
                            </p>
                        </div>
                    )}

                    {/* 基本情報フォーム */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                        <h2 className="font-bold text-gray-800">基本情報</h2>

                        {/* 氏名 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <User className="w-4 h-4" />
                                氏名
                            </label>
                            <input
                                type="text"
                                value={formData.taxpayerName}
                                onChange={(e) => setFormData({ ...formData, taxpayerName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="山田 太郎"
                            />
                        </div>

                        {/* 住所 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="w-4 h-4" />
                                住所
                            </label>
                            <input
                                type="text"
                                value={formData.taxpayerAddress}
                                onChange={(e) => setFormData({ ...formData, taxpayerAddress: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="東京都渋谷区..."
                            />
                        </div>

                        {/* 屋号 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <Building2 className="w-4 h-4" />
                                屋号（店名・事業名）
                            </label>
                            <input
                                type="text"
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="リサイクルショップ○○"
                            />
                        </div>

                        {/* 業種 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <Briefcase className="w-4 h-4" />
                                業種
                            </label>
                            <input
                                type="text"
                                value={formData.businessType}
                                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="小売業"
                            />
                        </div>

                        {/* 申告種別 */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                申告種別
                            </label>
                            <div className="space-y-2">
                                {[
                                    { value: 'white', label: '白色申告', desc: '簡易な記帳でOK' },
                                    { value: 'blue_simple', label: '青色申告（簡易）', desc: '10万円控除' },
                                    { value: 'blue_regular', label: '青色申告（正規）', desc: '55万円控除' },
                                    { value: 'blue_etax', label: '青色申告（e-Tax）', desc: '65万円控除' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setFormData({ ...formData, filingType: option.value as FilingType })}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                                            formData.filingType === option.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`font-medium ${
                                            formData.filingType === option.value ? 'text-blue-700' : 'text-gray-800'
                                        }`}>
                                            {option.label}
                                        </span>
                                        <span className={`text-sm ml-2 ${
                                            formData.filingType === option.value ? 'text-blue-600' : 'text-gray-500'
                                        }`}>
                                            {option.desc}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 撮り直しボタン */}
                    <button
                        onClick={() => setStep('scan')}
                        className="w-full py-3 text-blue-600 font-medium"
                    >
                        撮り直す
                    </button>
                </main>

                {/* 次へボタン */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                    <div className="max-w-lg mx-auto">
                        <button
                            onClick={() => nextStep ? setStep(nextStep) : handleSave()}
                            disabled={isSaving}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {nextStep === 'depreciation' && '減価償却資産を確認'}
                                    {nextStep === 'balance' && '期首資産を確認'}
                                    {!nextStep && '保存して完了'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== Depreciation Step ====================
    if (step === 'depreciation') {
        const hasBalanceData = Object.values(balanceSheet).some(v => v !== undefined && v !== 0);

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
                        <button
                            onClick={() => setStep('review')}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">減価償却資産の確認</h1>
                    </div>
                </header>

                <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-amber-800 text-sm">
                            前年の申告書から減価償却資産が見つかりました。
                            今年も引き続き償却する資産を選択してください。
                        </p>
                    </div>

                    <div className="space-y-3">
                        {depreciationAssets.map((asset, index) => (
                            <div
                                key={index}
                                className={`p-4 bg-white rounded-xl border-2 transition-colors ${
                                    asset.selected ? 'border-blue-500' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => {
                                            const updated = [...depreciationAssets];
                                            updated[index].selected = !updated[index].selected;
                                            setDepreciationAssets(updated);
                                        }}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                            asset.selected
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-gray-300'
                                        }`}
                                    >
                                        {asset.selected && <Check className="w-4 h-4 text-white" />}
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-500" />
                                            <h3 className="font-bold text-gray-800">{asset.name}</h3>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-500">取得価額:</span>
                                                <span className="ml-1 font-medium">
                                                    {asset.acquisitionCost.toLocaleString()}円
                                                </span>
                                            </div>
                                            {asset.bookValue != null && (
                                                <div>
                                                    <span className="text-gray-500">期末簿価:</span>
                                                    <span className="ml-1 font-medium">
                                                        {asset.bookValue.toLocaleString()}円
                                                    </span>
                                                </div>
                                            )}
                                            {asset.usefulLife && (
                                                <div>
                                                    <span className="text-gray-500">耐用年数:</span>
                                                    <span className="ml-1 font-medium">{asset.usefulLife}年</span>
                                                </div>
                                            )}
                                            {asset.depreciationMethod && (
                                                <div>
                                                    <span className="text-gray-500">償却方法:</span>
                                                    <span className="ml-1 font-medium">
                                                        {asset.depreciationMethod === 'straight_line' ? '定額法' : '定率法'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* 次へボタン */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                    <div className="max-w-lg mx-auto">
                        <button
                            onClick={() => hasBalanceData ? setStep('balance') : handleSave()}
                            disabled={isSaving}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {hasBalanceData ? '期首資産を確認' : '保存して完了'}
                                    {hasBalanceData ? <ArrowRight className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== Balance Step ====================
    if (step === 'balance') {
        // 期首資産の入力フィールド定義
        const balanceFields = [
            { key: 'cash' as const, label: '現金', category: '流動資産' },
            { key: 'deposits' as const, label: '預金', category: '流動資産' },
            { key: 'accountsReceivable' as const, label: '売掛金', category: '流動資産' },
            { key: 'inventory' as const, label: '棚卸資産（商品）', category: '流動資産' },
            { key: 'supplies' as const, label: '貯蔵品', category: '流動資産' },
            { key: 'land' as const, label: '土地', category: '固定資産' },
            { key: 'accountsPayable' as const, label: '買掛金', category: '負債' },
            { key: 'unpaidExpenses' as const, label: '未払金', category: '負債' },
            { key: 'loans' as const, label: '借入金', category: '負債' },
            { key: 'capital' as const, label: '元入金', category: '資本' },
        ];

        // カテゴリ別にグループ化
        const groupedFields = balanceFields.reduce((acc, field) => {
            if (!acc[field.category]) acc[field.category] = [];
            acc[field.category].push(field);
            return acc;
        }, {} as Record<string, typeof balanceFields>);

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
                        <button
                            onClick={() => depreciationAssets.length > 0 ? setStep('depreciation') : setStep('review')}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">期首資産の確認</h1>
                    </div>
                </header>

                <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-blue-800 text-sm">
                            前年の期末資産が今年の期首資産になります。
                            必要に応じて修正してください。
                        </p>
                    </div>

                    {Object.entries(groupedFields).map(([category, fields]) => (
                        <div key={category} className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="font-bold text-gray-700 mb-3 text-sm">{category}</h3>
                            <div className="space-y-4">
                                {fields.map((field) => (
                                    <div key={field.key}>
                                        <label className="text-sm text-gray-600 mb-1 block">
                                            {field.label}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                value={balanceSheet[field.key] ?? ''}
                                                onChange={(e) => setBalanceSheet({
                                                    ...balanceSheet,
                                                    [field.key]: e.target.value ? parseInt(e.target.value) : undefined,
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right pr-10 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                円
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <p className="text-xs text-gray-500 text-center">
                        ※ リサイクルショップなどでは「棚卸資産」（在庫）の入力が重要です
                    </p>
                </main>

                {/* 保存ボタン */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                    <div className="max-w-lg mx-auto">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    保存して完了
                                    <Check className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== Complete Step ====================
    if (step === 'complete') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">設定が完了しました！</h1>
                    <p className="text-gray-600 mb-8">
                        前年の情報を引き継ぎました。<br />
                        早速、今年の経費入力を始めましょう。
                    </p>

                    <div className="space-y-3 max-w-xs mx-auto">
                        <button
                            onClick={() => router.push('/swipe')}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                        >
                            経費入力を始める
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => router.push('/profile')}
                            className="w-full py-3 text-gray-600 font-medium"
                        >
                            設定を確認・編集する
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
