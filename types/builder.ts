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
  | 'heading'
  | 'divider'

export interface EfoSettings {
  realtimeValidation: boolean
  autoFormat: boolean
  autoComplete: boolean
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
}
