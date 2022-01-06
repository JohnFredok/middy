const mask = require('json-mask')
const { normalizeHttpResponse, jsonSafeParse } = require('@middy/util')

const defaults = {
  filteringKeyName: 'fields'
}

const httpPartialResponseMiddleware = (opts = {}) => {
  const options = { ...defaults, ...opts }
  const { filteringKeyName } = options

  const httpPartialResponseMiddlewareAfter = async (request) => {
    const fields = request.event?.queryStringParameters?.[filteringKeyName]
    if (!fields) return

    normalizeHttpResponse(request)
    const body = request.response?.body

    const parsedBody = jsonSafeParse(body)
    if (typeof parsedBody !== 'object') return

    const filteredBody = mask(parsedBody, fields)

    request.response.body =
      typeof body === 'object' ? filteredBody : JSON.stringify(filteredBody)
  }

  return {
    after: httpPartialResponseMiddlewareAfter
  }
}
module.exports = httpPartialResponseMiddleware
