import NodeEnvironment from 'jest-environment-node'
import type { Circus } from '@jest/types'

export const getTestPath = (test: Circus.TestEntry) => {
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

    switch (event.name) {
      case 'test_fn_failure': {
        // @ts-expect-error
        this.global.testStatuses[getTestPath(event.test).join('/')] = 'failed'
        break
      }
      // I also used test_fn_start and test_fn_success
    }
  }
}
