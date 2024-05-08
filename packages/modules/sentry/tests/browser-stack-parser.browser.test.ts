import { browserStackParser } from '../src/browser-stack-parser'

describe('browser stack parser', () => {
  describe('chrome', () => {
    it('should parse chrome 15', () => {
      expect(
        browserStackParser(
          "TypeError: Object #<Object> has no method 'undef'\n" +
            '    at bar (http://path/to/file.js:13:17)\n' +
            '    at bar (http://path/to/file.js:16:5)\n' +
            '    at foo (http://path/to/file.js:20:5)\n' +
            '    at http://path/to/file.js:24:4',
        ),
      ).toEqual([
        { filename: 'http://path/to/file.js', function: '?', lineno: 24, colno: 4, in_app: true },
        { filename: 'http://path/to/file.js', function: 'foo', lineno: 20, colno: 5, in_app: true },
        { filename: 'http://path/to/file.js', function: 'bar', lineno: 16, colno: 5, in_app: true },
        { filename: 'http://path/to/file.js', function: 'bar', lineno: 13, colno: 17, in_app: true },
      ])
    })
    it('should parse chrome 36 error with port numbers', () => {
      expect(
        browserStackParser(
          'Error: Default error\n' +
            '    at dumpExceptionError (http://localhost:8080/file.js:41:27)\n' +
            '    at HTMLButtonElement.onclick (http://localhost:8080/file.js:107:146)\n' +
            '    at I.e.fn.(anonymous function) [as index] (http://localhost:8080/file.js:10:3651)',
        ),
      ).toEqual([
        {
          filename: 'http://localhost:8080/file.js',
          function: 'I.e.fn.(anonymous function) [as index]',
          lineno: 10,
          colno: 3651,
          in_app: true,
        },
        {
          filename: 'http://localhost:8080/file.js',
          function: 'HTMLButtonElement.onclick',
          lineno: 107,
          colno: 146,
          in_app: true,
        },
        {
          filename: 'http://localhost:8080/file.js',
          function: 'dumpExceptionError',
          lineno: 41,
          colno: 27,
          in_app: true,
        },
      ])
    })
  })
  describe('safari', () => {
    it('should parse a safari extension error', () => {
      expect(
        browserStackParser(`Error: wat
      at ClipperError@safari-extension:(//3284871F-A480-4FFC-8BC4-3F362C752446/2665fee0/commons.js:223036:10)
      at safari-extension:(//3284871F-A480-4FFC-8BC4-3F362C752446/2665fee0/topee-content.js:3313:26)`),
      ).toEqual([
        {
          filename: 'safari-extension://3284871F-A480-4FFC-8BC4-3F362C752446/2665fee0/topee-content.js',
          function: '?',
          lineno: 3313,
          colno: 26,
          in_app: true,
        },
        {
          filename: 'safari-extension://3284871F-A480-4FFC-8BC4-3F362C752446/2665fee0/commons.js',
          function: 'ClipperError',
          lineno: 223036,
          colno: 10,
          in_app: true,
        },
      ])
    })
  })

  describe('firefox', () => {
    it('should parse an eval error', () => {
      expect(
        browserStackParser(`aha@http://localhost:5000/:19:13
      callAnotherThing@http://localhost:5000/:20:15
      callback@http://localhost:5000/:25:7
      test/<@http://localhost:5000/:34:7
      test@http://localhost:5000/:33:23
      @http://localhost:5000/ line 39 > eval:1:1
      aha@http://localhost:5000/:39:5
      testMethod@http://localhost:5000/:44:7
      @http://localhost:5000/:50:19`),
      ).toEqual([
        { filename: 'http://localhost:5000/', function: '?', lineno: 50, colno: 19, in_app: true },
        { filename: 'http://localhost:5000/', function: 'testMethod', lineno: 44, colno: 7, in_app: true },
        { filename: 'http://localhost:5000/', function: 'aha', lineno: 39, colno: 5, in_app: true },
        { filename: 'http://localhost:5000/', function: 'eval', lineno: 39, in_app: true },
        { filename: 'http://localhost:5000/', function: 'test', lineno: 33, colno: 23, in_app: true },
        { filename: 'http://localhost:5000/', function: 'test/<', lineno: 34, colno: 7, in_app: true },
        { filename: 'http://localhost:5000/', function: 'callback', lineno: 25, colno: 7, in_app: true },
        { filename: 'http://localhost:5000/', function: 'callAnotherThing', lineno: 20, colno: 15, in_app: true },
        { filename: 'http://localhost:5000/', function: 'aha', lineno: 19, colno: 13, in_app: true },
      ])
    })
  })
})
