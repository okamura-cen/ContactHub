import type { Metadata } from 'next'
import Script from 'next/script'
import {
  FileText,
  ListChecks,
  Inbox,
  BarChart,
  Code,
  Globe,
  Zap,
  ShieldCheck,
  MousePointerClick,
  ArrowRight,
  Mail,
  CheckCircle,
} from 'lucide-react'

// エンドユーザー（導入企業）向けのサービス紹介ページ /about
// サイト全体は noindex 設定だが、本ページは公開用途のため検索インデックスを許可する
export const metadata: Metadata = {
  title: 'ContactHub｜EFOフォーム作成サービスのご紹介',
  description:
    'ContactHub は、入力フォーム最適化（EFO）に特化したノーコードのWebフォーム作成サービスです。離脱を防ぐフォームを、専門知識なしで作成・公開・運用できます。',
  robots: {
    index: true,
    follow: true,
  },
}

// 主な機能
const FEATURES = [
  {
    icon: FileText,
    title: 'ノーコード フォームビルダー',
    desc: '入力項目をドラッグ＆ドロップで並べるだけ。専門知識がなくても問い合わせ・申込フォームを作成できます。',
  },
  {
    icon: ListChecks,
    title: 'ステップ型（EFO）フォーム',
    desc: '質問を1問ずつ表示するステップ形式に対応。入力のハードルを下げ、途中離脱を抑えます。',
  },
  {
    icon: Inbox,
    title: '回答の一元管理',
    desc: '送信された回答は管理画面で一覧・確認。対応状況の管理やデータの確認がそのまま行えます。',
  },
  {
    icon: BarChart,
    title: 'アクセス・送信の分析',
    desc: '表示数や送信数を可視化。どのフォームがどれだけ成果につながっているかを把握できます。',
  },
  {
    icon: Code,
    title: '埋め込み・公開URL',
    desc: 'タグを貼るだけで自社サイトに設置。公開URLでそのまま運用を開始することもできます。',
  },
  {
    icon: Globe,
    title: '専用ランディングページ',
    desc: 'フォームに紐づくランディングページをワンセットで用意。単体ページとしても公開できます。',
  },
] as const

// こんな課題を解決
const PROBLEMS = [
  'せっかく流入があるのに、フォームの途中で離脱されてしまう',
  'フォームの作成・修正のたびに制作会社へ依頼が必要で、時間もコストもかかる',
  '問い合わせ内容がメールに埋もれ、対応漏れや管理が煩雑になっている',
] as const

// 選ばれる理由
const REASONS = [
  {
    icon: MousePointerClick,
    title: 'EFO（入力フォーム最適化）に特化',
    desc: 'ステップ表示や入力補助など、「最後まで入力してもらう」ための工夫を標準で備えています。',
  },
  {
    icon: Zap,
    title: 'ノーコードでスピード公開',
    desc: '作成から公開まで管理画面で完結。思い立ったその日にフォームを立ち上げられます。',
  },
  {
    icon: ShieldCheck,
    title: '運用・保守はおまかせ',
    desc: 'サーバー運用・セキュリティ対応・機能改善は提供元で対応。安心してご利用いただけます。',
  },
] as const

// 導入の流れ
const STEPS = [
  { title: 'お問い合わせ', desc: 'まずはご相談ください。用途やご要望をヒアリングし、最適なご利用方法をご案内します。' },
  { title: 'フォーム作成', desc: '管理画面から、目的に合わせたフォーム・ランディングページを作成します。' },
  { title: '公開・設置', desc: '公開URLの発行、または埋め込みタグで自社サイトに設置して運用を開始します。' },
  { title: '運用・改善', desc: '回答の管理や分析を行いながら、フォームを継続的に改善していけます。' },
] as const

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* ヘッダー */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/contacthub_logo_yoko.svg" alt="ContactHub" className="h-7 w-auto" />
          <a
            href="#contact"
            className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:opacity-90"
          >
            お問い合わせ
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--border))]">
        {/* 背景デザイン（くすみオレンジのソフトグラデーション） */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/about-hero-bg.png)' }}
        />
        {/* テキストの可読性を確保する白オーバーレイ（上下からのみ、中央は画像を活かす） */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-gradient-to-b from-[hsl(var(--background))]/40 via-transparent to-[hsl(var(--background))]"
        />
        {/* 中央のテキスト背後だけ薄く明るくする放射状ライト */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 [background:radial-gradient(ellipse_60%_50%_at_50%_45%,hsl(var(--background))/0.55,transparent_70%)]"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
          <p className="mb-4 text-sm font-semibold tracking-wider text-[hsl(var(--primary))]">
            EFO フォーム作成サービス
          </p>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            “最後まで入力される”フォームを、
            <br className="hidden sm:block" />
            ノーコードで。
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-lg">
            ContactHub は、入力フォーム最適化（EFO）に特化したWebフォーム作成サービスです。
            離脱を防ぐフォームを、専門知識なしで作成・公開・運用できます。
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--primary))] px-6 py-3 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:opacity-90"
            >
              導入のご相談はこちら
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center rounded-md border border-[hsl(var(--input))] px-6 py-3 text-sm font-medium transition-colors hover:bg-[hsl(var(--accent))]"
            >
              できることを見る
            </a>
          </div>
        </div>
      </section>

      {/* こんな課題を解決 */}
      <section className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight">こんな課題はありませんか？</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div
                key={p}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]"
              >
                {p}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-base font-medium">
            ContactHub は、その課題を
            <span className="text-[hsl(var(--primary))]">ノーコード</span>
            で解決します。
          </p>
        </div>
      </section>

      {/* できること（主な機能） */}
      <section id="features" className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">ContactHub でできること</h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              フォームの作成から公開・運用・分析まで、これひとつで。
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(193,114,68,0.25)]"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))]/20 via-[hsl(var(--primary))]/10 to-[hsl(var(--primary))]/5 text-[hsl(var(--primary))] ring-1 ring-inset ring-[hsl(var(--primary))]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 選ばれる理由 */}
      <section className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight">選ばれる理由</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {REASONS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="relative mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center">
                  {/* 外側のふんわりグロー */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-[hsl(var(--primary))]/15 blur-lg"
                  />
                  {/* アイコンを載せる円 */}
                  <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))]/25 via-[hsl(var(--primary))]/10 to-white text-[hsl(var(--primary))] ring-1 ring-inset ring-[hsl(var(--primary))]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_16px_-8px_rgba(193,114,68,0.35)]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 導入の流れ */}
      <section className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight">導入の流れ</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(20_65%_48%)] to-[hsl(30_55%_58%)] text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_4px_12px_-4px_rgba(193,114,68,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]">
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{step.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
            料金・プランの詳細は、お問い合わせ時に用途に合わせてご案内します。
          </p>
        </div>
      </section>

      {/* お問い合わせ CTA + 埋め込みフォーム */}
      <section id="contact">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <div className="relative mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[hsl(var(--primary))]/20 blur-lg"
              />
              <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))]/25 via-[hsl(var(--primary))]/10 to-white text-[hsl(var(--primary))] ring-1 ring-inset ring-[hsl(var(--primary))]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_16px_-8px_rgba(193,114,68,0.35)]">
                <Mail className="h-6 w-6" strokeWidth={1.75} />
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">まずはお気軽にご相談ください</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
              サービス内容のご説明、料金のご案内、導入のご相談まで承ります。
              「こんなフォームは作れる？」といったご質問だけでも歓迎です。
            </p>
          </div>

          {/* ContactHub フォーム埋め込み */}
          <div className="mt-10">
            <div id="efo-form-cmr2ssmbl0003txoky9qp1xfj" />
            <Script
              src="https://contact-hub.app/embed-direct.js"
              data-form-id="cmr2ssmbl0003txoky9qp1xfj"
              strategy="afterInteractive"
            />
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-8 sm:flex-row sm:justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/contacthub_logo_yoko.svg" alt="ContactHub" className="h-5 w-auto opacity-70" />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">© CEN Inc. ContactHub</p>
        </div>
      </footer>
    </main>
  )
}
