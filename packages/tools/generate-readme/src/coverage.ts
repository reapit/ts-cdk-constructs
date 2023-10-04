import * as path from 'path'
import * as fs from 'fs/promises'
import { XMLParser } from 'fast-xml-parser'

type Metrics = {
  '@_statements': number
  '@_coveredstatements': number
  '@_conditionals': number
  '@_coveredconditionals': number
  '@_methods': number
  '@_coveredmethods': number
}

type Line = {
  '@_num': number
  '@_count': number
  '@_type': string
}
type File = {
  metrics: Metrics
  line: Line
}

type Package = {
  metrics: Metrics
  '@_name': string
  '@_path': string
  file: File
}

type Project = {
  metrics: Metrics
  package: Package[]
}
type Clover = {
  coverage: {
    project: Project
  }
}

export const getFullCoverageInfo = async (dir: string) => {
  const loc = path.resolve(dir, 'coverage', 'clover.xml')
  const xml = await fs.readFile(loc, 'utf-8')
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
  })
  const result: Clover = parser.parse(xml)
  return processCoverage(result.coverage.project)
}

export type ParsedMetrics = {
  statements: number
  methods: number
  conditionals: number
}

const round = (number: number) => Math.round(number * 100) / 100

const processMetrics = (metrics: Metrics): ParsedMetrics => {
  return {
    statements: round((metrics['@_coveredstatements'] / metrics['@_statements']) * 100),
    methods: round((metrics['@_coveredmethods'] / metrics['@_methods']) * 100),
    conditionals: round((metrics['@_coveredconditionals'] / metrics['@_conditionals']) * 100),
  }
}

export type PackageCoverage = {
  name: string
  metrics: ParsedMetrics
  lambdaMetrics?: ParsedMetrics
}

export type PackageTypeCoverage = Record<string, PackageCoverage[]>

const processCoverage = (project: Project) => {
  const packageTypes: PackageTypeCoverage = {}
  project.package.forEach((pkg) => {
    const [subdir, name, , lambda] = pkg['@_name'].split('.')
    if (lambda) {
      return
    }
    const packageType = subdir.slice(0, -1)
    if (!packageTypes[packageType]) {
      packageTypes[packageType] = []
    }
    const lambdaPkg = project.package.find((pkg2) => pkg2['@_name'].split('.')[3]?.startsWith('lambda'))
    packageTypes[packageType].push({
      metrics: processMetrics(pkg.metrics),
      name,
      lambdaMetrics: lambdaPkg ? processMetrics(lambdaPkg.metrics) : undefined,
    })
  })

  return {
    metrics: processMetrics(project.metrics),
    packageTypes,
  }
}
