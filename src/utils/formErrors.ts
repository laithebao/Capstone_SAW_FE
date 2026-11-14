import axios from 'axios'

export type FormFieldErrors = Record<string, string>

export function getValidationFieldErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): FormFieldErrors {
  const errors: FormFieldErrors = {}
  for (const issue of issues) {
    const field = issue.path.map(String).join('.')
    if (field && !errors[field]) errors[field] = issue.message
  }
  return errors
}

export function getHookFormFieldErrors(value: unknown): FormFieldErrors {
  const fields: FormFieldErrors = {}
  const visit = (node: unknown, path: string) => {
    if (!node || typeof node !== 'object') return
    if ('message' in node && typeof node.message === 'string') {
      if (path) fields[path] = node.message
      return
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'ref') visit(child, path ? `${path}.${key}` : key)
    }
  }
  visit(value, '')
  return fields
}

// Profile APIs return either an errors array or ASP.NET field-keyed validation errors.
export function getApiFieldErrors(error: unknown, labels: Record<string, string>): FormFieldErrors {
  if (!axios.isAxiosError(error) || !error.response?.data || typeof error.response.data !== 'object') return {}
  const body = error.response.data as { errors?: unknown; message?: unknown }
  const fields: FormFieldErrors = {}
  const matchMessage = (message: string) => {
    const field = Object.keys(labels).find(key => message.trim().toLocaleLowerCase().startsWith(labels[key].toLocaleLowerCase()))
    if (field && !fields[field]) fields[field] = message
  }
  if (Array.isArray(body.errors)) {
    for (const message of body.errors) if (typeof message === 'string') matchMessage(message)
  } else if (body.errors && typeof body.errors === 'object') {
    for (const [key, messages] of Object.entries(body.errors)) {
      const field = key.replace(/^\$\.?/, '').replace(/^request\./i, '').replace(/\[(\d+)\]/g, '.$1')
        .split('.').map(part => part.charAt(0).toLowerCase() + part.slice(1)).join('.')
      const message = Array.isArray(messages) ? messages.find(value => typeof value === 'string') : typeof messages === 'string' ? messages : undefined
      if (typeof message !== 'string') continue
      if (Object.prototype.hasOwnProperty.call(labels, field)) fields[field] = message
      else matchMessage(message)
    }
  }
  if (typeof body.message === 'string') matchMessage(body.message)
  return fields
}
