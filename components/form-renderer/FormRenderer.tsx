'use client'

import { BuilderField } from '@/types/builder'
import { TextField } from './fields/TextField'
import { EmailField } from './fields/EmailField'
import { TelField } from './fields/TelField'
import { ZipField } from './fields/ZipField'
import { NameField } from './fields/NameField'
import { TextareaField } from './fields/TextareaField'
import { SelectField } from './fields/SelectField'
import { RadioField } from './fields/RadioField'
import { CheckboxField } from './fields/CheckboxField'
import { AgreeField } from './fields/AgreeField'

interface FormRendererProps {
  fields: BuilderField[]
  values: Record<string, unknown>
  errors: Record<string, string>
  onChange: (fieldId: string, value: unknown) => void
  onBlur: (fieldId: string) => void
  /** ZipFieldの住所補完で他フィールドにもsetValueするためのコールバック */
  onAddressFound?: (address: { prefecture: string; city: string; address: string }) => void
}

/** フォームフィールドの動的レンダラー */
export function FormRenderer({ fields, values, errors, onChange, onBlur, onAddressFound }: FormRendererProps) {
  return (
    <div className="space-y-6">
      {fields.map((field) => {
        const commonProps = {
          id: field.id,
          label: field.label,
          placeholder: field.placeholder,
          helpText: field.helpText,
          required: field.required,
          error: errors[field.id],
          onBlur: () => onBlur(field.id),
        }

        switch (field.type) {
          case 'text':
          case 'date':
            return (
              <TextField
                key={field.id}
                {...commonProps}
                value={(values[field.id] as string) || ''}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'email':
            return (
              <EmailField
                key={field.id}
                {...commonProps}
                value={(values[field.id] as string) || ''}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'tel':
            return (
              <TelField
                key={field.id}
                {...commonProps}
                value={(values[field.id] as string) || ''}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'zip':
            return (
              <ZipField
                key={field.id}
                {...commonProps}
                value={
                  (values[field.id] as { zipcode: string; prefecture: string; city: string; address: string }) || {
                    zipcode: '',
                    prefecture: '',
                    city: '',
                    address: '',
                  }
                }
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'name':
            return (
              <NameField
                key={field.id}
                {...commonProps}
                value={
                  (values[field.id] as { sei: string; mei: string; seiKana: string; meiKana: string }) || {
                    sei: '',
                    mei: '',
                    seiKana: '',
                    meiKana: '',
                  }
                }
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'textarea':
            return (
              <TextareaField
                key={field.id}
                {...commonProps}
                value={(values[field.id] as string) || ''}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'select':
            return (
              <SelectField
                key={field.id}
                {...commonProps}
                options={field.options || []}
                value={(values[field.id] as string) || ''}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'radio':
            return (
              <RadioField
                key={field.id}
                {...commonProps}
                options={field.options || []}
                value={(values[field.id] as string) || ''}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'checkbox':
            return (
              <CheckboxField
                key={field.id}
                {...commonProps}
                options={field.options || []}
                value={(values[field.id] as string[]) || []}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'agree':
            return (
              <AgreeField
                key={field.id}
                {...commonProps}
                value={!!values[field.id]}
                onChange={(v) => onChange(field.id, v)}
              />
            )
          case 'heading':
            return (
              <h3 key={field.id} className="text-lg font-semibold pt-2">
                {field.label}
              </h3>
            )
          case 'divider':
            return <hr key={field.id} className="border-[hsl(var(--border))]" />
          default:
            return null
        }
      })}
    </div>
  )
}
