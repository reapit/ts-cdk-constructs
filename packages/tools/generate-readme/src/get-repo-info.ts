import * as fs from 'fs/promises'
import * as path from 'path'
import { PackageInfo, PackageJSON, PackageType, RepoInfo } from './types'
import { PackageCoverage, PackageTypeCoverage, getFullCoverageInfo } from './coverage'

const readPkgJson = async (dir: string): Promise<PackageJSON> => {
  const json = await fs.readFile(path.resolve(dir, 'package.json'), 'utf-8')
  return JSON.parse(json)
}

const readReadme = async (dir: string) => {
  try {
    return await fs.readFile(path.resolve(dir, 'readme.md'), 'utf-8')
  } catch (e) {
    return 'No readme found'
  }
}

const getSubdirs = async (dir: string) => {
  const contents = await fs.readdir(dir, {
    withFileTypes: true,
  })
  return contents.filter(({ isDirectory }) => isDirectory).map(({ name }) => name)
}

const getPackageInfo = async (
  parentDir: string,
  subdir: string,
  coverageInfo?: PackageCoverage,
): Promise<PackageInfo> => {
  const loc = path.resolve(parentDir, subdir)
  const pkgJson = await readPkgJson(loc)
  const readme = await readReadme(loc)
  const hasIntegrationTests = (await getSubdirs(loc)).includes('integ-tests')

  return {
    subdir,
    pkgJson,
    readme,
    coverage: coverageInfo,
    hasIntegrationTests,
  }
}

const getPackageTypeInfo = async (cwd: string, subdir: string, coverage: PackageTypeCoverage): Promise<PackageType> => {
  const parentDir = path.resolve(cwd, 'packages', subdir)
  const subdirs = await getSubdirs(parentDir)
  const packageType = subdir.slice(0, -1)
  const coverageInfo = coverage[packageType]
  return {
    packageType,
    packages: await Promise.all(
      subdirs.map((subdir) => getPackageInfo(parentDir, subdir, coverageInfo?.find((a) => a.name === subdir))),
    ),
  }
}

export const getRepoInfo = async (cwd: string): Promise<RepoInfo> => {
  const rootPkgJson = await readPkgJson(cwd)

  const packageTypes = await getSubdirs(path.resolve(cwd, 'packages'))
  const coverage = await getFullCoverageInfo(cwd)

  const packages = await Promise.all(
    packageTypes.map(async (packageType) => {
      return getPackageTypeInfo(cwd, packageType, coverage.packageTypes)
    }),
  )

  return {
    packages,
    rootPkgJson,
    coverage: coverage.metrics,
  }
}
