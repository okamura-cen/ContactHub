export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'zip'
  | 'name'
  | 'agree'
  | 'file'
  | 'heading'
  | 'paragraph'
  | 'divider'

export interface EfoSettings {
  realtimeValidation: boolean
  autoFormat: boolean
  autoComplete: boolean
}

export interface FieldLogicCondition {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty'
  value?: string
}

export interface FieldLogic {
  action: 'show' | 'hide'
  operator: 'AND' | 'OR'
  conditions: FieldLogicCondition[]
}

export interface BuilderField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  options?: string[]
  efoSettings?: EfoSettings
  logic?: FieldLogic
  // agree 型でラベル横に表示する外部リンクURL（例: 個人情報の取り扱いページ）
  linkUrl?: string
}

export interface BuilderStep {
  id: string
  title: string
  fields: BuilderField[]
}

export interface FormSettings {
  successMessage: string
  redirectUrl?: string
  notifyEmails: string[]
  autoReply: boolean
  autoReplyMessage?: string
  // 自動返信メールの送信元・件名カスタマイズ（フォーム単位で上書き、未設定時は環境変数 RESEND_FROM_EMAIL を使用）
  autoReplyFromEmail?: string
  autoReplyFromName?: string
  autoReplyReplyTo?: string
  autoReplySubject?: string
  primaryColor?: string
  fontFamily?: string
  customCss?: string
  recaptchaEnabled?: boolean
  // ランディングページ設定
  lpEnabled?: boolean
  lpLogoUrl?: string
  lpHeroImageUrl?: string
  lpHeading?: string
  lpDescription?: string
  lpBgColor?: string
  lpFooterCompany?: string
  lpFooterText?: string
  lpFooterLinks?: { label: string; url: string }[]
  lpTextColor?: string
  lpFooterBgColor?: string
}
