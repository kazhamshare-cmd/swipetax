// OCR サービス（OpenAI Vision API）

import OpenAI from 'openai';
import {
    DocumentType,
    ReceiptOCRResult,
    BankStatementOCRResult,
    TaxReturnOCRResult,
    PurchaseInvoiceOCRResult,
} from './document-types';

// OpenAI クライアント（サーバーサイドのみ）
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY が設定されていません');
        }
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

/**
 * ドキュメント画像を OCR 処理
 */
export async function processDocumentOCR(
    imageBase64: string,
    documentType: DocumentType
): Promise<ReceiptOCRResult | BankStatementOCRResult | TaxReturnOCRResult | PurchaseInvoiceOCRResult> {
    const openai = getOpenAIClient();

    const systemPrompt = getSystemPrompt(documentType);
    const extractionPrompt = getExtractionPrompt(documentType);

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: systemPrompt,
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                            detail: 'high',
                        },
                    },
                    {
                        type: 'text',
                        text: extractionPrompt,
                    },
                ],
            },
        ],
        max_tokens: 4096,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('OpenAI からの応答がありません');
    }

    try {
        return JSON.parse(content);
    } catch {
        throw new Error('OCR結果の解析に失敗しました');
    }
}

function getSystemPrompt(documentType: DocumentType): string {
    const basePrompt = `あなたは日本の税務・会計書類を解析する専門AIです。
画像から情報を正確に抽出し、JSON形式で返してください。
- 日本語テキストを正確に読み取ってください
- 金額は数値として返してください（カンマなし）
- 日付は YYYY-MM-DD 形式で返してください
- 読み取れない部分や不明な部分は null としてください
- 推測で補完せず、読み取れた情報のみを返してください`;

    switch (documentType) {
        case 'receipt':
            return `${basePrompt}

レシート/領収書から以下を抽出します：
- 店舗名（正式名称）
- 日付
- 合計金額
- 消費税額（記載があれば）
- 品目一覧（可能な場合）
- 経費カテゴリの推定（事業経費として適切なカテゴリを判断）

経費カテゴリは以下から選択：
travel（旅費交通費）, communication（通信費）, entertainment（接待交際費）,
supplies（消耗品費）, books（新聞図書費）, advertising（広告宣伝費）,
outsourcing（外注費）, rent（地代家賃）, utilities（水道光熱費）,
fees（支払手数料）, insurance（保険料）, depreciation（減価償却費）,
miscellaneous（雑費）`;

        case 'bank_statement':
            return `${basePrompt}

通帳/銀行明細から取引一覧を抽出します：
- 銀行名、支店名
- 口座種別、口座番号（下4桁のみ、それ以外は****でマスク）
- 各取引の日付、摘要、金額（入金/出金）、残高
- 複数の取引がある場合はすべて抽出
- 入金はプラス、出金はマイナスで表現`;

        case 'tax_return':
            return `${basePrompt}

確定申告書から以下を抽出します：
- 申告年度
- 申告種別（白色/青色簡易/青色正規）
- 事業所得、給与所得、その他所得
- 各種控除額（医療費、社会保険料、生命保険料、基礎控除など）
- 課税所得、所得税額
- 源泉徴収税額、最終納付/還付額

控除種別：
medical（医療費）, social_insurance（社会保険料）, life_insurance（生命保険料）,
earthquake_insurance（地震保険料）, donation（寄附金）, mortgage（住宅ローン）,
spouse（配偶者）, dependent（扶養）, basic（基礎）`;

        case 'purchase_invoice':
            return `${basePrompt}

飲食店向けの仕入れ伝票/納品書から以下を抽出します：
- 仕入先名（業者名）
- 伝票番号（あれば）
- 日付
- 品目一覧（食材名、カテゴリ、数量、単位、単価、金額）
- 小計、消費税、合計金額

食材カテゴリ：
vegetables（野菜類）, meat（肉類）, seafood（魚介類）,
seasonings（調味料）, other（その他）

注意点：
- 食材名は一般的な名称に正規化してください
- 数量と単位は分けて記載してください（例: 2, kg）
- 手書きの伝票も読み取りを試みてください`;

        default:
            return basePrompt;
    }
}

function getExtractionPrompt(documentType: DocumentType): string {
    switch (documentType) {
        case 'receipt':
            return `このレシート/領収書の情報をJSON形式で抽出してください。

{
  "success": true,
  "merchant": "店舗名",
  "date": "YYYY-MM-DD",
  "totalAmount": 金額,
  "taxAmount": 消費税額またはnull,
  "items": [
    {"name": "品目名", "quantity": 数量, "unitPrice": 単価, "price": 金額}
  ],
  "suggestedCategory": "travel|communication|entertainment|supplies|books|advertising|outsourcing|rent|utilities|fees|insurance|depreciation|miscellaneous",
  "confidence": 0から100の信頼度,
  "notes": "特記事項（あれば）"
}

読み取れない場合:
{
  "success": false,
  "error": "エラー理由",
  "confidence": 0
}`;

        case 'bank_statement':
            return `この通帳/銀行明細から取引を抽出してください。

{
  "success": true,
  "bankName": "銀行名",
  "branchName": "支店名またはnull",
  "accountType": "ordinary|savings|checking",
  "accountNumber": "****1234",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "摘要",
      "amount": 金額（出金はマイナス）,
      "balance": 残高,
      "isDeposit": true/false
    }
  ],
  "confidence": 0から100
}`;

        case 'tax_return':
            return `この確定申告書の情報を抽出してください。

{
  "success": true,
  "fiscalYear": 年度（数値）,
  "filingType": "white|blue_simple|blue_regular",
  "businessIncome": 事業所得,
  "salaryIncome": 給与所得またはnull,
  "miscIncome": 雑所得またはnull,
  "totalExpenses": 必要経費合計またはnull,
  "deductions": {
    "medical": 医療費控除,
    "social_insurance": 社会保険料控除,
    "life_insurance": 生命保険料控除,
    "earthquake_insurance": 地震保険料控除,
    "donation": 寄附金控除,
    "mortgage": 住宅ローン控除,
    "spouse": 配偶者控除,
    "dependent": 扶養控除,
    "basic": 基礎控除
  },
  "taxableIncome": 課税所得,
  "totalTax": 所得税額,
  "withholdingTax": 源泉徴収税額,
  "finalTax": 納付額（還付の場合はマイナス）,
  "confidence": 0から100
}`;

        case 'purchase_invoice':
            return `この仕入れ伝票/納品書の情報を抽出してください。

{
  "success": true,
  "supplierName": "仕入先名",
  "invoiceNumber": "伝票番号またはnull",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "品目名",
      "category": "vegetables|meat|seafood|seasonings|other",
      "quantity": 数量（数値）,
      "unit": "単位（kg, 個, 本など）",
      "unitPrice": 単価,
      "price": 金額
    }
  ],
  "subtotal": 小計またはnull,
  "taxAmount": 消費税額またはnull,
  "totalAmount": 合計金額,
  "suggestedCategory": "supplies",
  "confidence": 0から100
}

読み取れない場合:
{
  "success": false,
  "error": "エラー理由",
  "supplierName": null,
  "date": null,
  "items": [],
  "totalAmount": null,
  "suggestedCategory": "supplies",
  "confidence": 0
}`;

        default:
            return 'この画像の内容をJSON形式で抽出してください。';
    }
}
