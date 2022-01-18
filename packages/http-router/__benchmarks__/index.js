import Benchmark from 'benchmark'
import middy from '../../core/index.js'
import router from '../index.js'

const suite = new Benchmark.Suite('@middy/http-router')

const context = {
  getRemainingTimeInMillis: () => 30000
}
const setupHandler = () => {
  const handler = () => {}
  return middy(router([
    { method: 'GET', path: '/user', handler },
    { method: 'GET', path: '/user/comments', handler },
    { method: 'GET', path: '/user/avatar', handler },
    { method: 'GET', path: '/user/lookup/username/{username}', handler },
    { method: 'GET', path: '/user/lookup/email/{address}', handler },
    { method: 'GET', path: '/event/{id}', handler },
    { method: 'GET', path: '/event/{id}/comments', handler },
    { method: 'POST', path: '/event/{id}/comment', handler },
    { method: 'GET', path: '/map/{location}/events', handler },
    { method: 'GET', path: '/status', handler },
    { method: 'GET', path: '/very/deeply/nested/route/hello/there', handler },
    { method: 'GET', path: '/static/{proxy+}', handler }
  ]))
}

const warmHandler = setupHandler()

suite
  .add('short static', async (event = { version: '2.0', requestContext: { http: { method: 'GET', path: '/user' } } }) => {
    try {
      await warmHandler(event, context)
    } catch (e) {}
  })
  .add('static with same radix', async (event = { version: '2.0', requestContext: { http: { method: 'GET', path: '/user/comments' } } }) => {
    try {
      await warmHandler(event, context)
    } catch (e) {}
  })
  .add('dynamic route', async (event = { version: '2.0', requestContext: { http: { method: 'GET', path: '/user/lookup/username/john' } } }) => {
    try {
      await warmHandler(event, context)
    } catch (e) {}
  })
  .add('mixed static dynamic', async (event = { version: '2.0', requestContext: { http: { method: 'GET', path: '/event/abcd1234/comments' } } }) => {
    try {
      await warmHandler(event, context)
    } catch (e) {}
  })
  .add('long static', async (event = { version: '2.0', requestContext: { http: { method: 'GET', path: '/very/deeply/nested/route/hello/there' } } }) => {
    try {
      await warmHandler(event, context)
    } catch (e) {}
  })
  .add('wildcard', async (event = { version: '2.0', requestContext: { http: { method: 'GET', path: '/static/index.html' } } }) => {
    try {
      await warmHandler(event, context)
    } catch (e) {}
  })
  .on('cycle', (event) => {
    console.log(suite.name, String(event.target))
  })
  .run({ async: true })
