const defaults = {
  logger: console.error
}

export default (opts = {}) => {
  const options = Object.assign({}, defaults, opts)
  if (typeof options.logger !== 'function') options.logger = () => {}

  const errorLoggerMiddlewareOnError = async (handler) => options.logger(handler.error)
  return {
    onError: errorLoggerMiddlewareOnError
  }
}
