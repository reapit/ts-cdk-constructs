import * as path from 'path'
import * as fs from 'fs/promises'
import * as proc from 'child_process'

const go = async () => {
  const isPublish = process.argv.slice(2).includes('--publish')
  const dir = path.resolve('.')
  const outdir = 'jsii-dist'
  if (isPublish) {
    proc.execSync(`publib-pypi ${dir}/${outdir}/python`, {
      cwd: __dirname,
      stdio: 'inherit',
    })
  } else {
    const text = await fs.readFile(path.resolve('package.json'), 'utf-8')
    const pkgJson = JSON.parse(text)
    const pyDistName = pkgJson.name.replace('@', '').replace('/', '.')
    const pyModule = pkgJson.name.replace('@', '').replace('/', '.').replaceAll('-', '_')

    await fs.writeFile(
      path.resolve('package.json'),
      JSON.stringify({
        ...pkgJson,
        stability: 'stable',
        jsii: {
          outdir,
          versionFormat: 'short',
          targets: {
            python: {
              distName: pyDistName,
              module: pyModule,
            },
          },
        },
      }),
    )

    await fs.writeFile(
      path.resolve('.npmignore'),
      [await fs.readFile('.npmignore'), outdir, '!.jsii', '!.jsii.gz'].join('\n'),
    )

    proc.execSync(`jsii ${dir} --generate-tsconfig jsii.tsconfig.json --fail-on-warnings`, {
      cwd: __dirname,
      stdio: 'inherit',
    })
    proc.execSync(`jsii-pacmak ${dir}`, {
      cwd: __dirname,
      stdio: 'inherit',
    })
  }
}

go().catch((e) => {
  console.error(e)
  process.exit(1)
})
