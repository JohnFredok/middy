import { AbortController } from 'node-abort-controller'

const defaultLambdaHandler = () => {}
const defaultPlugin = {
  timeoutEarlyInMillis: 5,
  timeoutEarlyResponse: () => { throw new Error('Timeout') }
}

const middy = (lambdaHandler = defaultLambdaHandler, plugin = {}) => {
  // Allow base handler to be set using .handler()
  if (typeof lambdaHandler !== 'function') {
    plugin = lambdaHandler
    lambdaHandler = defaultLambdaHandler
  }
  plugin = { ...defaultPlugin, ...plugin }
  plugin.timeoutEarly = plugin.timeoutEarlyInMillis > 0

  plugin.beforePrefetch?.()
  const beforeMiddlewares = []
  const afterMiddlewares = []
  const onErrorMiddlewares = []

  const middy = (event = {}, context = {}) => {
    plugin.requestStart?.()
    const request = {
      event,
      context,
      response: undefined,
      error: undefined,
      internal: plugin.internal ?? {}
    }

    return runRequest(
      request,
      [...beforeMiddlewares],
      lambdaHandler,
      [...afterMiddlewares],
      [...onErrorMiddlewares],
      plugin
    )
  }

  middy.use = (middlewares) => {
    if (!Array.isArray(middlewares)) {
      middlewares = [middlewares]
    }
    for (const middleware of middlewares) {
      const { before, after, onError } = middleware

      if (!before && !after && !onError) {
        throw new Error(
          'Middleware must be an object containing at least one key among "before", "after", "onError"'
        )
      }

      if (before) middy.before(before)
      if (after) middy.after(after)
      if (onError) middy.onError(onError)
    }
    return middy
  }

  // Inline Middlewares
  middy.before = (beforeMiddleware) => {
    beforeMiddlewares.push(beforeMiddleware)
    return middy
  }
  middy.after = (afterMiddleware) => {
    afterMiddlewares.unshift(afterMiddleware)
    return middy
  }
  middy.onError = (onErrorMiddleware) => {
    onErrorMiddlewares.unshift(onErrorMiddleware)
    return middy
  }
  middy.handler = (replaceLambdaHandler) => {
    lambdaHandler = replaceLambdaHandler
  }

  return middy
}

const runRequest = async (
  request,
  beforeMiddlewares,
  lambdaHandler,
  afterMiddlewares,
  onErrorMiddlewares,
  plugin
) => {
  const { timeoutEarly } = plugin
  try {
    await runMiddlewares(request, beforeMiddlewares, plugin)
    // Check if before stack hasn't exit early
    if (request.response === undefined) {
      plugin.beforeHandler?.()

      const handlerAbort = new AbortController()
      let timeoutAbort
      if (timeoutEarly) timeoutAbort = new AbortController()
      request.response = await Promise.race([
        lambdaHandler(request.event, request.context, { signal: handlerAbort.signal }),
        timeoutEarly
          ? setTimeoutPromise(request.context.getRemainingTimeInMillis() - plugin.timeoutEarlyInMillis, { signal: timeoutAbort.signal })
            .then(() => {
              handlerAbort.abort()
              return plugin.timeoutEarlyResponse()
            })
          : Promise.race([])
      ])
      if (timeoutEarly) timeoutAbort.abort() // lambdaHandler may not be a promise

      plugin.afterHandler?.()
      await runMiddlewares(request, afterMiddlewares, plugin)
    }
  } catch (e) {
    // Reset response changes made by after stack before error thrown
    request.response = undefined
    request.error = e
    try {
      await runMiddlewares(request, onErrorMiddlewares, plugin)
    } catch (e) {
      // Save error that wasn't handled
      e.originalError = request.error
      request.error = e

      throw request.error
    }
    // Catch if onError stack hasn't handled the error
    if (request.response === undefined) throw request.error
  } finally {
    await plugin.requestEnd?.(request)
  }

  return request.response
}

const runMiddlewares = async (request, middlewares, plugin) => {
  for (const nextMiddleware of middlewares) {
    plugin.beforeMiddleware?.(nextMiddleware.name)
    const res = await nextMiddleware(request)
    plugin.afterMiddleware?.(nextMiddleware.name)
    // short circuit chaining and respond early
    if (res !== undefined) {
      request.response = res
      return
    }
  }
}

// Start Polyfill (Nodejs v14)
const setTimeoutPromise = (ms, { signal }) => {
  if (signal.aborted) {
    return Promise.reject(new Error('Aborted', 'AbortError'))
  }
  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      clearTimeout(timeout)
      reject(new Error('Aborted', 'AbortError'))
    }
    // start async operation
    const timeout = setTimeout(() => {
      resolve()
      signal.removeEventListener('abort', abortHandler)
    }, ms)
    signal.addEventListener('abort', abortHandler)
  })
}
// Replace Polyfill
// import { setTimeout as setTimeoutPromise } from 'timers/promises'
// End Polyfill

export default middy
