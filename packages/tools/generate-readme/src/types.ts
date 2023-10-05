import { PackageCoverage, ParsedMetrics } from './coverage'

export type PackageJSON = Record<string, any>
export type PackageInfo = {
  subdir: string
  pkgJson: PackageJSON
  coverage?: PackageCoverage
  hasIntegrationTests: boolean
  packageType: string
  docs?: string
  usage?: string
}
export type PackageType = {
  packageType: string
  packages: PackageInfo[]
}
export type RepoInfo = {
  rootPkgJson: PackageJSON
  packages: PackageType[]
  coverage: ParsedMetrics
}
