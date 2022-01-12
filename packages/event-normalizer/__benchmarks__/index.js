import Benchmark from 'benchmark'
import createEvent from '@serverless/event-mocks'
import middy from '../../core/index.js'
import middleware from '../index.js'

const suite = new Benchmark.Suite('@middy/event-normalizer')

const setupHandler = () => {
  const baseHandler = () => {}
  return middy(baseHandler)
    .use(middleware())
}

const warmHandler = setupHandler()
const dynamoEvent = createEvent.default('aws:dynamo')
const kinesisEvent = {event:createEvent.default('aws:kinesis')}
const s3Event = createEvent.default('aws:s3')
const sqsEvent = createEvent.default('aws:sqs')
const snsEvent = createEvent.default('aws:sns')

kinesisEvent.event.Records[0].kinesis.data = Buffer
  .from(JSON.stringify({hello:'world'}), 'utf-8')
  .toString('base64')

const deepJsonEvent = createEvent.default('aws:sqs')
snsEvent.Records[0].Sns.Message = JSON.stringify(sqsEvent)
deepJsonEvent.Records[0].body = JSON.stringify(snsEvent)

suite
  .add('Cold Invocation', async (event = {}) => {
    const coldHandler = setupHandler()
    await coldHandler(event)
  })
  .add('S3 Event', async (event = {...s3Event}) => {
    await warmHandler(event)
  })
  .add('Shallow JSON (SQS) Event', async (event = {...sqsEvent}) => {
    await warmHandler(event)
  })
  .add('Deep JSON (S3>SNS>SQS) Event', async (event = {...deepJsonEvent}) => {
    await warmHandler(event)
  })
  .add('DynamoDB Event', async (event = {...dynamoEvent}) => {
    await warmHandler(event)
  })
  .add('Kinesis Event', async (event = {...kinesisEvent}) => {
    await warmHandler(event)
  })
  .on('cycle', (event) => {
    console.log(suite.name, String(event.target))
  })
  .run({async: true})
