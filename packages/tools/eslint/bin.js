const { ESLint } = require('eslint')

async function lint() {
  const eslint = new ESLint({
    errorOnUnmatchedPattern: false,
    overrideConfig: {
      parserOptions: {
        project: 'tsconfig.json',
      },
    },
  })
  const results = await eslint.lintFiles(['**/*.ts', '**/*.js'])

  const problems = results.reduce((acc, result) => acc + result.errorCount + result.warningCount, 0)
  const errors = results.reduce((acc, result) => acc + result.errorCount, 0)
  const warnings = results.reduce((acc, result) => acc + result.warningCount, 0)

  if (problems > 0) {
    console.log(`Found ${errors} errors, and ${warnings} warnings`)
    const formatter = await eslint.loadFormatter()
    const output = await formatter.format(results)
    console.log(output)
    process.exit(1)
  }
}

lint().catch(console.error)
