import NodeEnvironment from 'jest-environment-node'
import type { Circus } from '@jest/types'

const getTestPath = (test: Circus.TestEntry) => {
  const path: string[] = [test.name]
  let parent: Circus.DescribeBlock | undefined = test.parent
  while (parent) {
    path.unshift(parent.name)
    parent = parent.parent
  }
  return path
}

export default class CustomEnvironment extends NodeEnvironment {
  handleTestEvent(event: Circus.Event) {
    if (!this.global.testStatuses) this.global.testStatuses = {}

    if (event.name === 'test_fn_failure') {
      // @ts-ignore
      this.global.testStatuses[getTestPath(event.test).join('/')] = 'failed'
    }
  }
}
