#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
const { RELEASE_VERSION } = process.env

if (!RELEASE_VERSION) {
  throw new Error('RELEASE_VERSION env var not set')
}

const loc = path.resolve('./package.json')

const pkgJson = JSON.parse(fs.readFileSync(loc, 'utf-8'))
const { name, version } = pkgJson
if (version !== '0.0.0') {
  throw new Error(`${name} version was ${version}, failing out of an abundance of caution`)
}

console.log(`Updating ${name} version from ${version} to ${RELEASE_VERSION}`)

pkgJson.version = RELEASE_VERSION

fs.writeFileSync(loc, JSON.stringify(pkgJson, null, 2))

console.log('Done')