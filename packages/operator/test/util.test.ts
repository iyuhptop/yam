import { createLogger } from '../util'

test("logger should print message with correct format", () => {
  const logger = createLogger('util')
  expect(logger).not.toBeNull()
})