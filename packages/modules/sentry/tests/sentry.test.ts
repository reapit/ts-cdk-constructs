import { DsnComponents } from '@sentry/types'
import { validateSentryDsn } from '../src/sentry'

describe('sentry sdk', () => {
  describe('validateSentryDsn', () => {
    it('should return the dsn components, if valid', () => {
      expect(validateSentryDsn('https://asdf@qwerty.ingest.sentry.io/123456')).toStrictEqual<DsnComponents>({
        host: 'qwerty.ingest.sentry.io',
        projectId: '123456',
        protocol: 'https',
        publicKey: 'asdf',
        pass: '',
        path: '',
        port: '',
      })
    })
    it('should throw an error if not valid', () => {
      expect(() =>
        validateSentryDsn(
          // BeeMovie.txt
          "You're flying outside The Hive, talking to humans that attack our homes with power washers and M-80s!",
        ),
      ).toThrowError('invalid DSN provided')
    })
  })
})
