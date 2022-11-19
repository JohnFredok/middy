import { createError } from '@middy/util'
import parse from 'qs/lib/parse.js'

const mimePattern = /^application\/x-www-form-urlencoded(;.*)?$/

const httpUrlencodeBodyParserMiddlewareBefore = async (request) => {
  const { headers, body } = request.event
  const contentType = headers['Content-Type'] ?? headers['content-type']

  if (!mimePattern.test(contentType)) return

  const data = request.event.isBase64Encoded
    ? Buffer.from(body, 'base64').toString()
    : body

  const rawBody = body
  request.event.body = parse(data)

  if (request.event.body?.[rawBody] === '') {
    // UnprocessableEntity
    throw createError(
      422,
      'Invalid or malformed URL encoded form was provided',
      { cause: '@middy/http-urlencode-body-parser unable to parse body' }
    )
  }
}

const httpUrlencodeBodyParserMiddleware = () => ({
  before: httpUrlencodeBodyParserMiddlewareBefore
})
export default httpUrlencodeBodyParserMiddleware
