/**
 * Middy factory function. Use it to wrap your existing handler to enable middlewares on it.
 * @param  {function} handler - your original AWS Lambda function
 * @param  {pluginObject} plugin - wraps around each middleware and handler to profile performance
 * @return {middy} - a `middy` instance
 */

/**
 * @typedef pluginObject
 * @type Object
 * @property {function} beforePrefetch - request hook for *beforePrefetch*
 * @property {function} requestStart - request hook for *beforePrefetch*
 * @property {function} beforeMiddleware - request hook for *beforeMiddleware*
 * @property {function} afterMiddleware - request hook for *afterMiddleware*
 * @property {function} beforeHandler - request hook for *beforeHandler*
 * @property {function} afterHandler - request hook for *afterHandler*
 * @property {function} requestEnd - request hook for *beforePrefetch*
 */

/**
 * @typedef middy
 * @type function
 * @param {Object} event - the AWS Lambda event from the original handler
 * @param {Object} context - the AWS Lambda context from the original handler
 * @property {useFunction} use - attach one or more new middlewares
 * @property {applyMiddlewareFunction} applyMiddleware - attach a new middleware
 * @property {middlewareAttachFunction} before - attach a new *before-only* middleware
 * @property {middlewareAttachFunction} after - attach a new *after-only* middleware
 * @property {middlewareAttachFunction} onError - attach a new *error-handler-only* middleware
 * @property {Object} __middlewares - contains the list of all the attached
 *   middlewares organised by type (`before`, `after`, `onError`). To be used only
 *   for testing and debugging purposes
 */

/**
 * @typedef useFunction
 * @type {function}
 * @param {middlewareObject|middlewareObject[]} - the middleware object or array of middleware objects to attach
 * @return {middy}
 */

/**
 * @typedef middlewareObject
 * @type Object
 * @property {middlewareFunction} before - the middleware function to attach as *before* middleware
 * @property {middlewareFunction} after - the middleware function to attach as *after* middleware
 * @property {middlewareFunction} onError - the middleware function to attach as *error* middleware
 */

/**
 * @typedef applyMiddlewareFunction
 * @type {function}
 * @param {middlewareObject} - the middleware object to attach
 * @return {middy}
 */

/**
 * @typedef middlewareAttachFunction
 * @type {function}
 * @param {middlewareFunction} - the middleware function to attach
 * @return {middy}
 */

/**
 * @typedef middlewareFunction
 * @type {function}
 * @param {function} handler - the original handler function.
 *   It will expose properties `event`, `context`, `response`, `error` and `internal` that can
 *   be used to interact with the middleware lifecycle
 * @return {void|Promise} - A middleware can return a Promise.
 *                          In this case middy will wait for the promise to resolve (or reject) and it will automatically
 *                          propagate the result to the next middleware.
 */

module.exports = (handler = () => {}, plugin) => {
  plugin?.beforePrefetch?.()
  const beforeMiddlewares = []
  const afterMiddlewares = []
  const onErrorMiddlewares = []

  const instance = (event = {}, context = {}) => {
    plugin?.requestStart?.()
    const request = {
      event,
      context,
      response: undefined,
      error: undefined,
      internal: {}
    }

    const middyPromise = async () => {
      try {
        await runMiddlewares(beforeMiddlewares, request, plugin)
        if (request.response !== undefined) { // catch short circuit
          await plugin?.requestEnd?.()
          return request.response
        }
        plugin?.beforeHandler?.()
        request.response = await handler(request.event, request.context)
        plugin?.afterHandler?.()
        await runMiddlewares(afterMiddlewares, request, plugin)
        await plugin?.requestEnd?.()
        return request.response
      } catch (e) {
        request.response = undefined
        request.error = e
        try {
          await runMiddlewares(onErrorMiddlewares, request, plugin)
          if (request.response !== undefined) {
            await plugin?.requestEnd?.()
            return request.response
          }
        } catch (e) {
          e.originalError = request.error
          request.error = e
        }
        await plugin?.requestEnd?.()
        throw request.error
      }
    }
    return middyPromise()
  }

  instance.use = (middlewares) => {
    if (Array.isArray(middlewares)) {
      middlewares.forEach(middleware => instance.applyMiddleware(middleware))
      return instance
    } else if (typeof middlewares === 'object') {
      return instance.applyMiddleware(middlewares)
    }
    throw new Error('Middy.use() accepts an object or an array of objects')
  }

  instance.applyMiddleware = (middleware) => {
    if (typeof middleware !== 'object') {
      throw new Error('Middleware must be an object')
    }

    const { before, after, onError } = middleware

    if (!before && !after && !onError) {
      throw new Error('Middleware must contain at least one key among "before", "after", "onError"')
    }

    if (before) instance.before(before)
    if (after) instance.after(after)
    if (onError) instance.onError(onError)

    return instance
  }

  // Inline Middlewares
  instance.before = (beforeMiddleware) => {
    beforeMiddlewares.push(beforeMiddleware)
    return instance
  }
  instance.after = (afterMiddleware) => {
    afterMiddlewares.unshift(afterMiddleware)
    return instance
  }
  instance.onError = (onErrorMiddleware) => {
    onErrorMiddlewares.push(onErrorMiddleware)
    return instance
  }

  instance.__middlewares = {
    before: beforeMiddlewares,
    after: afterMiddlewares,
    onError: onErrorMiddlewares
  }

  return instance
}

const runMiddlewares = async (middlewares, request, plugin) => {
  const stack = Array.from(middlewares)
  if (!stack.length) return
  const nextMiddleware = stack.shift()
  plugin?.beforeMiddleware?.(nextMiddleware?.name)
  const res = await nextMiddleware?.(request)
  plugin?.afterMiddleware?.(nextMiddleware?.name)
  if (res !== undefined) {
    // short circuit chaining and respond early
    request.response = res
    return
  }
  return runMiddlewares(stack, request, plugin)
}
