import * as path from 'path'
import * as child_process from 'child_process'
import * as fs from 'fs/promises'
import * as os from 'os'

const run = async (command: string, cwd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    child_process.exec(
      command,
      {
        cwd,
        env: process.env,
      },
      (err, stdout, stderr) => {
        console.log(err, stderr, stdout)
        if (err) {
          return reject(err)
        }
        return resolve(stderr ?? stdout)
      },
    )
  })
}

const snapshotDir = (file: string) => `${file}.snapshot`

const diff = async (dir: string, file: string, stackName: string, outDir: string) => {
  return run(
    `cdk diff --output=${outDir} --template ${snapshotDir(
      file,
    )}/${stackName}.template.json --app "node -r ts-node/register ${file}" ${stackName}`,
    dir,
  )
}

const snapshotExists = async (dir: string, file: string) => {
  console.log('checking', path.resolve(dir), 'for snapshot')
  const exists = await fs.readdir(path.resolve(dir), {
    withFileTypes: true,
  })
  return !!exists.find((entry) => {
    return entry.isDirectory() && entry.name === snapshotDir(file)
  })
}

const synth = async (dir: string, file: string, stackName: string, outDir: string) => {
  return run(`cdk synth --output=${outDir} --app "node -r ts-node/register ${file}" ${stackName}`, dir)
}

const deploy = async (dir: string, stackName: string, outputJsonFileLoc: string, outDir: string) => {
  return run(
    `cdk deploy --app ${outDir} ${stackName} --outputs-file ${outputJsonFileLoc} --require-approval never`,
    dir,
  )
}

const destroy = async (dir: string, stackName: string, outDir: string) => {
  return run(`cdk destroy --app ${outDir} ${stackName} --require-approval never --force`, dir)
}

type IntegrationTestProps = {
  stackFile: string
  stackName: string
  forceRun?: boolean
  noCleanup?: boolean
}

export class IntegrationTest {
  file: string
  dir: string
  stackName: string
  forceRun: boolean
  outputs: any
  outDir?: string
  noCleanup: boolean
  skipped?: boolean
  setupPromise: Promise<any>
  setupSuccess?: boolean

  constructor(props: IntegrationTestProps) {
    const { stackFile, stackName, forceRun, noCleanup } = props
    this.file = path.basename(stackFile)
    this.dir = path.dirname(stackFile)
    this.stackName = stackName
    this.forceRun = !!forceRun
    this.noCleanup = !!noCleanup
    this.setupPromise = this.setup()

    beforeAll(
      async () => {
        await this.setupPromise
      },
      60 * 60 * 1000,
    )

    afterAll(
      async () => {
        await this.teardown()
      },
      60 * 60 * 1000,
    )
  }

  it(name: string, fn: () => any, timeout?: number | undefined) {
    return it(
      name,
      async () => {
        await this.setupPromise
        if (this.skipped) {
          return
        }
        return fn()
      },
      timeout,
    )
  }

  private async mkTmpDir() {
    return await fs.mkdtemp(path.join(os.tmpdir(), 'reapit-cdk-integ'))
  }

  async shouldSkipTest() {
    if (!(await snapshotExists(this.dir, this.file))) {
      console.log('synth starting')
      this.outDir = await this.mkTmpDir()
      const synthres = await synth(this.dir, this.file, this.stackName, this.outDir)
      console.log(synthres)
      console.log('synth complete')
      return {
        shouldSkip: false,
        outDir: this.outDir,
      }
    }

    console.log('diff starting')
    const outDir = await this.mkTmpDir()
    const diffResult = await diff(this.dir, this.file, this.stackName, outDir)
    console.log('diff complete', diffResult)
    const hasDifferences = !diffResult.toLowerCase().includes('there were no differences')

    if (hasDifferences) {
      throw new Error('has diff')
      this.outDir = outDir
      return {
        shouldSkip: false,
        outDir: this.outDir,
      }
    } else {
      this.outDir = snapshotDir(this.file)
      if (this.forceRun) {
        return {
          shouldSkip: false,
          outDir: this.outDir,
        }
      }
      return {
        shouldSkip: true,
        outDir: this.outDir,
      }
    }
  }

  async setup() {
    console.log('setup')
    const { dir, stackName } = this
    const { shouldSkip, outDir } = await this.shouldSkipTest()
    if (shouldSkip) {
      this.skipped = true
      return false
    }

    const outputFileLoc = path.resolve(await this.mkTmpDir(), 'outputs.json')
    console.log('deploying')
    const deployRes = await deploy(dir, stackName, outputFileLoc, outDir as string)
    console.log(deployRes)
    console.log('deployed')

    const outputs = JSON.parse(await fs.readFile(outputFileLoc, 'utf-8'))
    this.outputs = outputs[stackName]
    console.log('outputs', outputs, this.outputs)
    this.setupSuccess = true
    return this.outputs
  }

  async teardown() {
    if (!this.setupSuccess) {
      console.log('setup did not complete successfully')
      return
    }
    if (this.skipped) {
      console.log('test skipped')
      return
    }
    if (!this.outDir) {
      return
    }

    if (!this.noCleanup) {
      console.log('tearing down')
      const res = await destroy(this.dir, this.stackName, this.outDir)
      console.log(res)
      console.log('torn down')
    } else {
      console.log('teardown skipped')
    }

    // @ts-ignore
    const promoteSnapshot = !expect.getState().error && !Object.values(global.testStatuses).filter(Boolean).length
    if (promoteSnapshot) {
      console.log('promoting snapshot')

      const absSnapshotDir = path.resolve(this.dir, snapshotDir(this.file))

      if (await snapshotExists(this.dir, this.file)) {
        await fs.rm(absSnapshotDir, {
          recursive: true,
          force: true,
        })
      }

      await fs.rename(this.outDir, absSnapshotDir)

      console.log('promoted snapshot')
    }
  }
}
