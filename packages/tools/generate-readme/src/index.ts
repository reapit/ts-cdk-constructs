import * as path from 'path'
import * as fs from 'fs/promises'
import { getRepoInfo } from './get-repo-info'
import { renderReadme } from './render-readme'

const go = async () => {
  const cwd = path.resolve('.')
  const repoInfo = await getRepoInfo(cwd)
  const readme = await renderReadme(repoInfo)
  await fs.writeFile(path.resolve(cwd, 'readme.md'), readme)
}

go().catch(console.error)
