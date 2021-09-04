import { createLogger } from '../util'

test("logger should print message with correct format", () => {
  const logger = createLogger('util')
  logger.info({ obj: { another: "object" } }, `level: ${process.env.DEBUG}, test msg: ${{ a: { b: { c: { d: "x" } } } }}`, "params")
  expect(logger).not.toBeNull()
})