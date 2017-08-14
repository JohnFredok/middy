const runMiddlewares = (middlewares, ctx, done) => {
  const stack = Array.from(middlewares)
  const runNext = (err) => {
    try {
      if (err) {
        return done(err)
      }

      const nextMiddleware = stack.shift()

      if (nextMiddleware) {
        return nextMiddleware(ctx, runNext)
      }

      return done()
    } catch (err) {
      return done(err)
    }
  }

  runNext()
}

const onErrorMiddlewares = (middlewares, ctx, done) => {
  const stack = Array.from(middlewares)
  const runNext = (err) => {
    try {
      if (!err) {
        return done()
      }

      const nextMiddleware = stack.shift()

      if (nextMiddleware) {
        return nextMiddleware(ctx, runNext)
      }

      return done(err)
    } catch (err) {
      return done(err)
    }
  }

  runNext(ctx.error)
}

const middy = (handler) => {
  const beforeMiddlewares = []
  const afterMiddlewares = []
  const errorMiddlewares = []

  const instance = (event, context, callback) => {
    const ctx = {
      event,
      response: null,
      error: null
    }

    instance.ctx = ctx

    const terminate = (err) => {
      if (err) {
        return callback(err)
      }

      return callback(null, ctx.response)
    }

    runMiddlewares(beforeMiddlewares, ctx, (err) => {
      if (err) {
        ctx.error = err
        return onErrorMiddlewares(errorMiddlewares, ctx, terminate)
      }

      handler.call(ctx, ctx.event, context, (err, response) => {
        ctx.response = response

        if (err) {
          ctx.error = err
          return onErrorMiddlewares(errorMiddlewares, ctx, terminate)
        }

        runMiddlewares(afterMiddlewares, ctx, (err) => {
          if (err) {
            ctx.error = err
            return onErrorMiddlewares(errorMiddlewares, ctx, terminate)
          }

          return terminate()
        })
      })
    })
  }

  instance.use = (middleware) => {
    if (typeof middleware !== 'object') {
      throw new Error('Middleware must be an object')
    }

    if (!middleware.before && !middleware.after && !middleware.onError) {
      throw new Error('Middleware must contain at least one key among "before", "after", "onError"')
    }

    if (middleware.before) {
      instance.before(middleware.before)
    }

    if (middleware.after) {
      instance.after(middleware.after)
    }

    if (middleware.onError) {
      instance.onError(middleware.onError)
    }

    return instance
  }

  instance.before = (beforeMiddleware) => {
    beforeMiddlewares.push(beforeMiddleware)

    return instance
  }

  instance.after = (afterMiddleware) => {
    afterMiddlewares.unshift(afterMiddleware)

    return instance
  }

  instance.onError = (errorMiddleware) => {
    errorMiddlewares.push(errorMiddleware)

    return instance
  }

  instance._middlewares = {
    before: beforeMiddlewares,
    after: afterMiddlewares,
    onError: errorMiddlewares
  }

  return instance
}

module.exports = middy
