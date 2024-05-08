import { Envelope } from '@sentry/types'

const encodeUTF8 = (input: string) => new TextEncoder().encode(input)

export function serializeEnvelope(envelope: Envelope): string | Uint8Array {
  const [envHeaders, items] = envelope

  // Initially we construct our envelope as a string and only convert to binary chunks if we encounter binary data
  let parts: string | Uint8Array[] = JSON.stringify(envHeaders)

  function append(next: string | Uint8Array): void {
    if (typeof parts === 'string') {
      parts = typeof next === 'string' ? parts + next : [encodeUTF8(parts), next]
    } else {
      parts.push(typeof next === 'string' ? encodeUTF8(next) : next)
    }
  }

  for (const item of items) {
    const [itemHeaders, payload] = item

    append(`\n${JSON.stringify(itemHeaders)}\n`)

    if (typeof payload === 'string' || payload instanceof Uint8Array) {
      append(payload)
    } else {
      append(JSON.stringify(payload))
    }
  }

  return typeof parts === 'string' ? parts : concatBuffers(parts)
}

function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0)

  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const buffer of buffers) {
    merged.set(buffer, offset)
    offset += buffer.length
  }

  return merged
}
