import { serializeEnvelope } from '../src/serialize-envelope'

describe('serializeEnvelope', () => {
  it('should concat buffers', () => {
    expect(
      serializeEnvelope([
        // @ts-expect-error
        new Uint8Array(),
        // @ts-expect-error
        [[{}, new Uint8Array()]],
      ]),
    ).toEqual(new Uint8Array([123, 125, 10, 123, 125, 10]))
  })
})
