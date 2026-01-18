"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const openai_1 = __importDefault(require("openai"));
// OpenAI client - 遅延初期化（デプロイ時のエラー回避）
let openai = null;
function getOpenAIClient() {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new openai_1.default({ apiKey });
    }
    return openai;
}
// OCRプロンプト
const OCR_PROMPTS = {
    receipt: `あなたは日本のレシート・領収書を解析するOCRアシスタントです。
画像からレシートの情報を抽出し、以下のJSON形式で回答してください。

{
  "merchant": "店舗名",
  "date": "YYYY-MM-DD形式の日付",
  "totalAmount": 合計金額（数値）,
  "items": [{"name": "商品名", "price": 金額}],
  "suggestedCategory": "経費カテゴリ（travel/communication/entertainment/supplies/books/advertising/outsourcing/rent/utilities/fees/insurance/depreciation/miscellaneous）",
  "confidence": 信頼度（0-100）
}

注意：
- 金額は税込み合計を使用
- 日付が不明な場合はnull
- カテゴリは店舗名や商品から推測
- JSONのみ出力（説明不要）`,
    bank_statement: `あなたは日本の銀行通帳・明細を解析するOCRアシスタントです。
画像から銀行明細の情報を抽出し、以下のJSON形式で回答してください。

{
  "bankName": "銀行名",
  "accountNumber": "口座番号（あれば）",
  "transactions": [
    {
      "date": "YYYY-MM-DD形式の日付",
      "description": "摘要・取引内容",
      "amount": 金額（数値、出金はプラス、入金はマイナス）,
      "balance": 残高（あれば）,
      "isDeposit": true/false（入金かどうか）
    }
  ],
  "confidence": 信頼度（0-100）
}

注意：
- 日付は西暦に変換
- 出金（支払い）は正の数、入金は負の数
- JSONのみ出力（説明不要）`,
    tax_return: `あなたは日本の確定申告書を解析するOCRアシスタントです。
画像から確定申告書の情報を抽出し、以下のJSON形式で回答してください。

{
  "fiscalYear": 申告年度（数値）,
  "filingType": "申告種類（white/blue_simple/blue_regular）",
  "businessIncome": 事業所得（数値）,
  "salaryIncome": 給与所得（数値）,
  "deductions": {
    "medical": 医療費控除,
    "social_insurance": 社会保険料控除,
    "life_insurance": 生命保険料控除,
    "earthquake_insurance": 地震保険料控除,
    "donation": 寄附金控除,
    "spouse": 配偶者控除,
    "dependent": 扶養控除,
    "basic": 基礎控除,
    "mortgage": 住宅ローン控除
  },
  "taxableIncome": 課税所得（数値）,
  "totalTax": 所得税額（数値）,
  "confidence": 信頼度（0-100）
}

注意：
- 金額は全て数値
- 不明な項目はnull
- JSONのみ出力（説明不要）`,
};
/**
 * OCR API - Firebase Function
 */
exports.api = functions.https.onRequest(async (req, res) => {
    // CORS設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    // パスに基づいてルーティング
    const path = req.path;
    if (path === '/api/import/ocr' || path === '/import/ocr') {
        await handleOCR(req, res);
    }
    else {
        res.status(404).json({ error: 'Not found' });
    }
});
/**
 * OCR処理ハンドラー
 */
async function handleOCR(req, res) {
    try {
        let imageBase64;
        let documentType = 'receipt';
        // Content-Typeに基づいて解析
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
            const body = req.body;
            imageBase64 = body.imageBase64;
            documentType = body.documentType || 'receipt';
        }
        else if (contentType.includes('multipart/form-data')) {
            // Firebase Functionsではmultipart/form-dataは自動的にパースされない
            // busboy等を使う必要があるが、簡易的にbase64を期待
            res.status(400).json({ error: 'Please use JSON format with imageBase64' });
            return;
        }
        if (!imageBase64) {
            res.status(400).json({ error: 'Image data is required' });
            return;
        }
        // OpenAI Vision APIで解析
        const prompt = OCR_PROMPTS[documentType];
        const response = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                                detail: 'high',
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            res.status(500).json({
                success: false,
                error: 'OCR結果を取得できませんでした',
            });
            return;
        }
        // JSONを抽出してパース
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            res.status(500).json({
                success: false,
                error: 'JSON形式の結果を取得できませんでした',
                rawText: content,
            });
            return;
        }
        const result = JSON.parse(jsonMatch[0]);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'OCR処理に失敗しました',
        });
    }
}
//# sourceMappingURL=index.js.map