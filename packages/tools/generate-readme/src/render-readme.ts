import { PackageInfo, RepoInfo } from './types'

const makeBadge = ({ label, message, color }: { label: string; message: string; color: string }) => {
  const url = new URL(`https://img.shields.io/badge/${label}-${message}-${color}`)
  return `![${label}: ${message}](${url.toString()})`
}

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
    message: statements ? `${statements}%25` : '0%25',
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
    .join('\n')
}

const renderUsage = (usage?: string) => {
  if (!usage) {
    return undefined
  }

  return [
    '## Usage',
    '```ts',
    usage
      .split('\n')
      .filter((line) => !line.startsWith('// @ts'))
      .join('\n'),
    '```',
  ].join('\n')
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
    '\n' + renderBadges(pkg),
    description,
    '## Package Installation:',
    installationInstructions({ npmPackageName: pkgJson.name }),
    renderUsage(usage),
    renderDocs(docs),
  ]
    .filter(Boolean)
    .join('\n\n')
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
          '\n' + renderBadges(pkg),
          pkg.pkgJson.description,
        ].join('\n'),
      )
      .join('\n')}
  </details>`,
  )

  return [`# ${title}`, makeCoverageBadge(coverage.statements), description, ...packagesDesc].filter(Boolean).join('\n')
}
