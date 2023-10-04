import { RepoInfo } from './types'
import { makeBadge } from 'badge-maker'

const makeCoverageBadge = (statements?: number, isLambda?: boolean) => {
  if (isLambda && !statements) {
    return ''
  }
  let color = 'red'
  if (statements && statements > 60) {
    color = 'orange'
  }
  if (statements && statements > 80) {
    color = 'green'
  }

  return makeBadge({
    label: isLambda ? 'custom resource coverage' : 'coverage',
    message: statements ? `${statements}%` : 'Not Covered',
    color,
  })
}

const makeIntegBadge = (packageType: string, hasIntegrationTest: boolean) => {
  if (packageType !== 'construct') {
    return ''
  }
  return makeBadge({
    label: 'Integration Tests',
    message: hasIntegrationTest ? 'Covered' : 'Not Covered',
    color: hasIntegrationTest ? 'green' : 'red',
  })
}

export const renderReadme = async ({ packages, rootPkgJson, coverage }: RepoInfo): Promise<string> => {
  const title = rootPkgJson.name
  const description = rootPkgJson.description

  return `# ${title}
${description}
${makeCoverageBadge(coverage.statements)}

${packages
  .map(
    ({ packageType, packages }) => `<details ${packageType !== 'tool' && 'open'}>
    <summary><h2 style="text-transform: capitalize;">${packageType}s</h2></summary>
    ${packages
      .map(
        ({
          pkgJson,
          readme,
          coverage,
          hasIntegrationTests,
          subdir,
        }) => `<h3><a href="packages/${packageType}/${subdir}">${pkgJson.name}</a></h3>

![npm version](https://img.shields.io/npm/v/${pkgJson.name}) ![npm downloads](https://img.shields.io/npm/dm/${
          pkgJson.name
        }) ${makeCoverageBadge(coverage?.metrics.statements)} ${makeCoverageBadge(
          coverage?.lambdaMetrics?.statements,
          true,
        )} ${makeIntegBadge(packageType, hasIntegrationTests)}

${readme?.split(pkgJson.name)[1]?.split('##')[0]}`,
      )
      .join('\n')}
  </details>`,
  )
  .join('\n')}`
}
