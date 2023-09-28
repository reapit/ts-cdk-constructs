#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { build } from 'tsup'

const hasLambda = process.argv.slice(2).includes('--lambda')
const hasLambdas = process.argv.slice(2).includes('--lambdas')

await build({
  entry: ['src/index.ts'],
  target: 'node18',
  dts: true,
  clean: true,
})

if (hasLambda || hasLambdas) {
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf-8'))

  const deps = [...Object.keys(pkgJson.dependencies || {}), ...Object.keys(pkgJson.devDependencies || {})].filter(
    (name) => !name.includes('@aws-sdk'),
  )
  await build({
    entry: hasLambdas
      ? ['src/lambdas']
      : {
          'lambda/lambda': 'src/lambda/lambda.ts',
        },
    target: 'node18',
    outDir: hasLambdas ? 'dist/lambdas' : undefined,
    noExternal: deps,
    external: [/@aws-sdk\/(.*)/],
  })
}
