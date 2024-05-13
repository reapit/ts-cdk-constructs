/**
 * MIT License

Copyright (c) 2024 Functional Software, Inc. dba Sentry

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
import { posix, sep } from 'path'
import { dirname } from '@sentry/utils'

/** normalizes Windows paths */
function normalizeWindowsPath(path: string): string {
  return path
    .replace(/^[A-Z]:/, '') // remove Windows-style prefix
    .replace(/\\/g, '/') // replace all `\` instances with `/`
}

/** Creates a function that gets the module name from a filename */
export function createGetModuleFromFilename(
  basePath: string = process.argv[1] ? dirname(process.argv[1]) : process.cwd(),
  isWindows: boolean = sep === '\\',
): (filename: string | undefined) => string | undefined {
  const normalizedBase = isWindows ? normalizeWindowsPath(basePath) : basePath

  return (filename: string | undefined) => {
    if (!filename) {
      return
    }

    const normalizedFilename = isWindows ? normalizeWindowsPath(filename) : filename

    // eslint-disable-next-line prefer-const
    let { dir, base: file, ext } = posix.parse(normalizedFilename)

    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      file = file.slice(0, ext.length * -1)
    }

    if (!dir) {
      // No dirname whatsoever
      dir = '.'
    }

    const n = dir.lastIndexOf('/node_modules')
    if (n > -1) {
      return `${dir.slice(n + 14).replace(/\//g, '.')}:${file}`
    }

    // Let's see if it's a part of the main module
    // To be a part of main module, it has to share the same base
    if (dir.startsWith(normalizedBase)) {
      let moduleName = dir.slice(normalizedBase.length + 1).replace(/\//g, '.')

      if (moduleName) {
        moduleName += ':'
      }
      moduleName += file

      return moduleName
    }

    return file
  }
}
