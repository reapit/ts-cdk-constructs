import * as fs from 'fs'
import * as path from 'path'

type FindReplace = [find: string, replace: string]

export const generateLambda = (name: string, findReplaces: FindReplace[]) => {
  const loc = path.resolve(__dirname, '..', 'dist', 'lambdas', name + '.js')
  let contents = fs.readFileSync(loc, 'utf-8')
  findReplaces.forEach(([find, replace]) => {
    contents = contents.replace(find, replace)
  })
  return contents
}
