import https from 'https'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'

// Docs: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/enforcing-tls.html
export const awsClientDefaultOptions = {
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent(
      {
        secureProtocol: 'TLSv1_2_method'
      }
    )
  })
}

export const createClient = (options, handler) => {
  let awsClientCredentials = {}
  if (options.awsClientAssumeRole) {
    if (!handler) return
    awsClientCredentials = { credentials: handler.context[options.awsClientAssumeRole] }
  }
  Object.assign(options.awsClientOptions, awsClientDefaultOptions, awsClientCredentials)
  return new options.awsClientConstructor(options.awsClientOptions)
}

export const canPrefetch = (options) => {
  return (!options.awsClientAssumeRole || !options.disablePrefetch)
}

// Internal Context
export const getInternal = async (variables, handler) => {
  const values = {}
  if (!variables) {
    variables = Object.keys(handler.internal)
  }
  if (typeof variables === 'string') {
    variables = [variables]
  }
  if (Array.isArray(variables)) {
    for (const optionKey of variables) {
      // ensure promise has resolved by the time it's needed
      const value = await handler.internal[optionKey]
      handler.internal[optionKey] = value
      values[optionKey] = value
    }
  } else if (typeof variables === 'object') {
    for (const optionKey in variables) {
      // ensure promise has resolved by the time it's needed
      const value = await handler.internal[variables[optionKey]]
      handler.internal[variables[optionKey]] = value
      values[optionKey] = value
    }
  }
  return values
}

// Option Cache
const cache = {} // key: { value, expiry }
export const processCache = (options, fetch = () => undefined, handler) => {
  if (options.cacheExpiry) {
    const cached = cache[options.cacheKey]
    if (cached?.expiry > Date.now() || options.cacheExpiry < 0) {
      return cached.value
    }
  }
  const value = fetch(handler)
  if (options.cacheExpiry) {
    cache[options.cacheKey] = {
      value,
      expiry: Date.now() + options.cacheExpiry
    }
  }
  return value
}

export const jsonSafeParse = (string, reviver) => {
  try {
    return JSON.parse(string || '{}', reviver)
  } catch (e) {}

  return string
}
