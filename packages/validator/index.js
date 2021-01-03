import createError from 'http-errors'
import _ajv from 'ajv/dist/2019.js'
import localize from 'ajv-i18n'
import formats from 'ajv-formats'
import formatsDraft2019 from 'ajv-formats-draft2019'

const Ajv = _ajv.default // esm workaround for linting

let ajv
const ajvDefaults = {
  strict: true,
  coerceTypes: 'array', // important for query string params
  allErrors: true,
  useDefaults: 'empty',
  messages: false, // allow i18n

}

const defaults = {
  inputSchema: null,
  outputSchema: null,
  ajvOptions: {},
  ajvInstance: undefined,
  defaultLanguage: 'en'
}

export default (opts = {}) => {
  let { inputSchema, outputSchema, ajvOptions, ajvInstance, defaultLanguage } = Object.assign({}, defaults, opts)
  inputSchema = compile(inputSchema, ajvOptions, ajvInstance)
  outputSchema = compile(outputSchema, ajvOptions, ajvInstance)

  const validatorMiddlewareBefore = async (handler) => {
    const valid = inputSchema(handler.event)

    if (!valid) {
      const error = new createError.BadRequest('Event object failed validation')
      handler.event.headers = Object.assign({}, handler.event.headers)

      const language = chooseLanguage(handler.event, defaultLanguage)
      localize[language](inputSchema.errors)

      error.details = inputSchema.errors
      throw error
    }
  }

  const validatorMiddlewareAfter = async (handler) => {
    const valid = outputSchema(handler.response)

    if (!valid) {
      const error = new createError.InternalServerError('Response object failed validation')
      error.details = outputSchema.errors
      error.response = handler.response
      throw error
    }
  }
  return {
    before: inputSchema ? validatorMiddlewareBefore : null,
    after: outputSchema ? validatorMiddlewareAfter : null
  }
}

// This is pulled out due to it's performance cost (50-100ms on cold start)
// Precompile your schema during a build step is recommended.
export const compile = (schema, ajvOptions, ajvInstance = null) => {
  // Check if already compiled
  if (typeof schema === 'function' || !schema) return schema
  const options = Object.assign({}, ajvDefaults, ajvOptions)
  if (!ajv) {
    ajv = ajvInstance || new Ajv(options)
    formats(ajv)
    formatsDraft2019(ajv)
  }
  return ajv.compile(schema)
}

/* in ajv-i18n Portuguese is represented as pt-BR */
const languageNormalizationMap = {
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  pt_BR: 'pt-BR',
  pt_br: 'pt-BR',
  zh: 'zh-TW',
  'zh-tw': 'zh-TW',
  zh_TW: 'zh-TW',
  zh_tw: 'zh-TW'
}

const normalizePreferredLanguage = (lang) => languageNormalizationMap[lang] || lang

const availableLanguages = Object.keys(localize)
const chooseLanguage = ({ preferredLanguage }, defaultLanguage) => {
  if (preferredLanguage) {
    const lang = normalizePreferredLanguage(preferredLanguage)
    if (availableLanguages.includes(lang)) {
      return lang
    }
  }

  return defaultLanguage
}
