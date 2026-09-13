/**
 * Serializer — query strings + request bodies
 * =============================================
 * Zero-dependency. Handles:
 *  - Nested objects (?a[b][c]=1)
 *  - Arrays (?a[]=1&a[]=2 or ?a=1&a=2)
 *  - Booleans, null, undefined
 *  - Date objects (ISO string)
 */

import type { Body, HttpHeaders, QueryParams, ResponseType } from './types'

/* ------------------------------------------------------------------ *
 * Query string serialization
 * ------------------------------------------------------------------ */

export interface SerializeQueryOptions {
  /** Array format. Default 'repeat'. */
  arrayFormat?: 'repeat' | 'bracket' | 'index' | 'comma' | 'json'
  /** Encode keys. Default true. */
  encodeKeys?: boolean
  /** Encode values. Default true. */
  encodeValues?: boolean
  /** Skip null/undefined values. Default true. */
  skipNulls?: boolean
  /** Delimiter. Default '&'. */
  delimiter?: string
}

const DEFAULTS: Required<SerializeQueryOptions> = {
  arrayFormat: 'repeat',
  encodeKeys: true,
  encodeValues: true,
  skipNulls: true,
  delimiter: '&',
}

export function serializeQuery(
  params: QueryParams | undefined,
  options: SerializeQueryOptions = {}
): string {
  if (!params || Object.keys(params).length === 0) return ''

  const opts = { ...DEFAULTS, ...options }
  const parts: string[] = []

  const encode = (s: string) => (opts.encodeValues ? encodeURIComponent(s) : s)
  const encodeKey = (s: string) => (opts.encodeKeys ? encodeURIComponent(s) : s)

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      if (!opts.skipNulls) {
        parts.push(`${encodeKey(key)}=`)
      }
      continue
    }

    if (Array.isArray(value)) {
      if (value.length === 0) continue

      switch (opts.arrayFormat) {
        case 'bracket':
          for (const v of value) {
            parts.push(`${encodeKey(`${key}[]`)}=${encode(String(v))}`)
          }
          break
        case 'index':
          value.forEach((v, i) => {
            parts.push(`${encodeKey(`${key}[${i}]`)}=${encode(String(v))}`)
          })
          break
        case 'comma':
          parts.push(`${encodeKey(key)}=${encode(value.join(','))}`)
          break
        case 'json':
          parts.push(`${encodeKey(key)}=${encode(JSON.stringify(value))}`)
          break
        case 'repeat':
        default:
          for (const v of value) {
            parts.push(`${encodeKey(key)}=${encode(String(v))}`)
          }
      }
      continue
    }

    if (typeof value === 'object' && value !== null && typeof (value as any).toISOString === 'function') {
      parts.push(`${encodeKey(key)}=${encode((value as Date).toISOString())}`)
      continue
    }

    if (typeof value === 'boolean') {
      parts.push(`${encodeKey(key)}=${encode(value ? 'true' : 'false')}`)
      continue
    }

    if (typeof value === 'object') {
      // nested object → flatten to a[b]=v
      const flattened = flattenObject(value as Record<string, unknown>, key)
      for (const [k, v] of Object.entries(flattened)) {
        parts.push(`${encodeKey(k)}=${encode(String(v))}`)
      }
      continue
    }

    parts.push(`${encodeKey(key)}=${encode(String(value))}`)
  }

  return parts.join(opts.delimiter)
}

function flattenObject(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = `${prefix}[${key}]`
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
    } else if (value !== null && value !== undefined) {
      result[newKey] = value
    }
  }
  return result
}

/* ------------------------------------------------------------------ *
 * Body serialization
 * ------------------------------------------------------------------ */

export function serializeBody(
  body: Body,
  headers: HttpHeaders
): { body: Body; headers: HttpHeaders } {
  if (body === null || body === undefined) {
    return { body: undefined, headers }
  }

  // FormData → strip Content-Type (RN fetch auto-generates the boundary)
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const { 'Content-Type': _, 'content-type': __, ...cleanHeaders } = headers
    return { body, headers: cleanHeaders }
  }

  // ArrayBuffer → leave as-is
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {
    return { body, headers }
  }

  // String → leave as-is
  if (typeof body === 'string') {
    return { body, headers }
  }

  // Object or array → JSON stringify
  if (typeof body === 'object') {
    const json = JSON.stringify(body)
    return {
      body: json,
      headers: {
        ...headers,
        'Content-Type': headers['Content-Type'] ?? headers['content-type'] ?? 'application/json',
      },
    }
  }

  return { body, headers }
}

/* ------------------------------------------------------------------ *
 * Parse response body based on Content-Type
 * ------------------------------------------------------------------ */

export async function parseResponseBody(
  response: Response,
  responseType: ResponseType
): Promise<unknown> {
  if (responseType === 'none') return null

  switch (responseType) {
    case 'json': {
      const text = await response.text()
      if (!text) return null
      return JSON.parse(text)
    }
    case 'text':
      return await response.text()
    case 'blob':
      return await response.blob()
    case 'arrayBuffer':
      return await response.arrayBuffer()
    case 'formData':
      return await response.formData()
    default:
      return await response.text()
  }
}