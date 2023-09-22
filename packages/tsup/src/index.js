#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { build } from 'tsup'

const hasLambda = process.argv.slice(2).includes('--lambda')

await build({
  entry: ['src/index.ts'],
  target: 'node18',
  dts: true,
  clean: true,
})

if (hasLambda) {
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf-8'))

  const deps = [...Object.keys(pkgJson.dependencies || {}), ...Object.keys(pkgJson.devDependencies || {})].filter(
    (name) => !name.includes('@aws-sdk'),
  )
  await build({
    entry: {
      'lambda/lambda': 'src/lambda/lambda.ts',
    },
    target: 'node18',
    noExternal: deps,
    external: [/@aws-sdk\/(.*)/],
  })
}
