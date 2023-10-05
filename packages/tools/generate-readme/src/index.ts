import * as path from 'path'
import * as fs from 'fs/promises'
import { getRepoInfo } from './get-repo-info'
import { renderRootReadme, renderPackageReadme } from './render-readme'

const go = async () => {
  const cwd = path.resolve('.')
  const repoInfo = await getRepoInfo(cwd)

  const rootReadme = await renderRootReadme(repoInfo)
  await fs.writeFile(path.resolve(cwd, 'readme.md'), rootReadme)

  await Promise.all(
    repoInfo.packages
      .map(({ packages }) => packages)
      .flat()
      .map(async (pkg) => {
        const readme = renderPackageReadme(pkg)
        await fs.writeFile(path.resolve(cwd, 'packages', pkg.packageType + 's', pkg.subdir, 'readme.md'), readme)
      }),
  )
}

go().catch(console.error)
