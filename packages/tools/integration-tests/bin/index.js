#!/usr/bin/env node
const { cli } = require('@aws-cdk/integ-runner')

const isRoot = process.argv.slice(2).includes('--root')

try {
  cli([
    '--directory',
    isRoot ? 'packages' : '.',
    '--parallel-regions',
    'eu-central-1',
    '--language',
    'typescript',
    '--update-on-failed',
  ])
} catch (e) {
  console.error(e)
  process.exit(1)
}
