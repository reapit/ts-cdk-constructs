#!/usr/bin/env node
const { cli } = require('@aws-cdk/integ-runner')

const isRoot = process.argv.slice(2).includes('--root')

cli([
  '--directory',
  isRoot ? 'packages' : '.',
  '--parallel-regions',
  'eu-central-1',
  '--language',
  'typescript',
  '--update-on-failed',
])
