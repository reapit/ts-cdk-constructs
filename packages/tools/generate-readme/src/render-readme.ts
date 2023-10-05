import { PackageInfo, RepoInfo } from './types'
import { makeBadge } from 'badge-maker'

const makeCoverageBadge = (statements?: number) => {
  let color = 'red'
  if (statements && statements > 60) {
    color = 'orange'
  }
  if (statements && statements > 80) {
    color = 'green'
  }

  return makeBadge({
    label: 'coverage',
    message: statements ? `${statements}%` : '0%',
    color,
  })
}

const makeIntegBadge = (packageType: string, hasIntegrationTest: boolean) => {
  if (packageType !== 'construct') {
    return ''
  }
  return makeBadge({
    label: 'Integ Tests',
    message: hasIntegrationTest ? '✔' : 'X',
    color: hasIntegrationTest ? 'green' : 'red',
  })
}

const installationInstructions = ({ npmPackageName }: { npmPackageName: string }) => {
  return ['```sh', `yarn add --dev ${npmPackageName}`, '# or', `npm install ${npmPackageName} --save-dev`, '```'].join(
    '\n',
  )
}

const renderBadges = ({ pkgJson, coverage, packageType, hasIntegrationTests }: PackageInfo) => {
  return [
    `![npm version](https://img.shields.io/npm/v/${pkgJson.name})`,
    `![npm downloads](https://img.shields.io/npm/dm/${pkgJson.name})`,
    makeCoverageBadge(coverage?.metrics.statements),
    makeIntegBadge(packageType, hasIntegrationTests),
  ]
    .filter(Boolean)
    .join(' ')
}

const renderUsage = (usage?: string) => {
  if (!usage) {
    return undefined
  }

  return ['## Usage', '```ts', usage, '```']
}

const renderDocs = (docs?: string) => {
  if (!docs) {
    return undefined
  }

  return docs
}

export const renderPackageReadme = (pkg: PackageInfo): string => {
  const { pkgJson, usage, docs } = pkg
  const title = pkgJson.name
  const description = pkgJson.description

  return [
    `# ${title}`,
    renderBadges(pkg),
    description,
    '## Package Installation:',
    installationInstructions(pkgJson.name),
    renderUsage(usage),
    renderDocs(docs),
  ]
    .filter(Boolean)
    .join('\n')
}

export const renderRootReadme = async ({ packages, rootPkgJson, coverage }: RepoInfo): Promise<string> => {
  const title = rootPkgJson.name
  const description = rootPkgJson.description

  const packagesDesc = packages.map(
    ({ packageType, packages }) => `<details ${packageType !== 'tool' && 'open'}>
    <summary><span style="text-transform: capitalize; font-weight: bold; font-size: 2em;">${packageType}s</span></summary>
    ${packages
      .map((pkg) =>
        [
          `<h3><a href="packages/${packageType}/${pkg.subdir}">${pkg.pkgJson.name}</a></h3>`,
          renderBadges(pkg),
          pkg.pkgJson.description,
        ].join('\n'),
      )
      .join('\n')}
  </details>`,
  )

  return [`# ${title}`, makeCoverageBadge(coverage.statements), description, ...packagesDesc].filter(Boolean).join('\n')
}