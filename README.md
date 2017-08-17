# 🛵 Middy

The simple (but cool 😎) middleware engine for AWS lambda in Node.js

[![CircleCI](https://circleci.com/gh/Plnt9/middy.svg?style=shield&circle-token=fa7f80307b57bd4f51a950d2259ead77388dee3a)](https://circleci.com/gh/Plnt9/middy)
[![npm version](https://badge.fury.io/js/middy.svg)](http://badge.fury.io/js/middy)
[![Standard Code Style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)


## TOC

 - [A little appetizer](#a-little-appetizer)
 - [Install](#install)
 - [Requirements](#requirements)
 - [Why?](#why)
 - [Usage](#usage)
 - [How it works](#how-it-works)
 - [Writing a middleware](#writing-a-middleware)
 - [Available middlewares](#available-middlewares)
 - [API](#api)
 - [Contributing](#contributing)
 - [License](#license)


## A little appetizer

Middy is a very simple middleware engine. If you are used to web frameworks like
express, than you will be familiar with the concepts adopted in Middy and you will
be able to get started very quickly.

But code is better than 10.000 words, so let's jump into an example.
Let's assume you are building an JSON API to process a payment:

```javascript
# handler.js

const middy = require('middy')
const { urlEncodedBodyParser, validator, httpErrorHandler } = require('middy/middlewares')

// This is your common handler, no way different than what you are used to do every day
// in AWS Lambda
const processPayment = (event, context, callback) => {
  // we don't need to deserialize the body ourself as a middleware will be used to do that
  const { creditCardNumber, expiryMonth, expiryYear, cvc, nameOnCard, amount } = event.body
  
  // do stuff with this data
  // ...
  
  return callback(null, { result: 'success', message: 'payment processed correctly'})
}

// Notice that in the handler you only added base business logic (no deserilization, validation or error handler), we will add the rest with middlewares

const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        creditCardNumber: { type: 'string', minLength: 12, maxLength: 19, pattern: '\d+' },
        expiryMonth: { type: 'integer', minimum: 1, maximum: 12 },
        expiryYear: { type: 'integer', minimum: 2017, maximum: 2027 },
        cvc: { type: 'string', minLength: 3, maxLength: 4, pattern: '\d+' },
        nameOnCard: { type: 'string' },
        amount: { type: 'number' }
      }
    }
  }
}

// Let's "middyfy" our handler, then we will be able to attach middlewares to it
const handler = middy(processPayment)
  .use(urlEncodedBodyParser()) // parses the request body when it's a JSON and converts it to an object
  .use(validator(inputSchema)) // validates the input
  .use(httpErrorHandler()) // handles common http errors and returns proper responses

module.exports = { handler }
```


## Install

As simple as:

```bash
npm install middy
```


## Requirements

Middy has been built to work by default from **Node >= 6.10**.

If you need to run it in earlier versions of Node (eg. 4.3) then you will have to
*transpile* middy's code yourself using [babel](https://babeljs.io/) or a similar tools.


## Why?

...


## Usage

As you might have already got from our first example here, using middy is very 
simple and requires just few steps:

 1. Write your Lambda handlers as usual, focusing mostly on implementing the bare
    business logic for them.
 2. Import `middy` and all the middlewares you want to use
 3. Wrap you handler in the `middy()` factory function. This will return a new
    enhanced instance of your original handler, to which you will be able to attach
    the middlewares you need.
 4. Attach all the middlewares you need using the function `.use(somemiddleware())`

Example:

```javascript
const middy = require('middy')
const { middleware1, middleware2, middleware3 } = require('middy/middlewares')

const originalHandler = (event, context, callback) => { /* your business logic */ }

const handler = middy(originalHandler)

handler
  .use(middleware1())
  .use(middleware2())
  .use(middleware3())

module.exports = { handler }
```

For a more detailed usage check the [API section](#api).


## How it works

Middy implements the classic *onion-like* middleware pattern, with some peculiar details.

![Middy middleware engine diagram](/img/middy-middleware-engine.png)

...


## Writing a middleware

...


## Available middlewares

Currently available middlewares:

 - [`jsonBodyParser`](/src/middlewares/jsonBodyParser.js): automatically parses HTTP requests with JSON body and converts the body into an object. Also handles gracefully broken JSON if used in combination of
 `httpErrorHanler`.
 - `urlEncodedBodyParser`: to be added
 - `validator`: to be added
 - `httpErrorHandler`: to be added

## Api

<a name="module_Middy"></a>

## Middy

* [Middy](#module_Middy)
    * [.middy(handler)](#module_Middy.middy) ⇒ [<code>middy</code>](#module_Middy.middy)
    * [.middy](#module_Middy.middy) : <code>function</code>
    * [.useFunction](#module_Middy.useFunction) ⇒ [<code>middy</code>](#module_Middy.middy)
    * [.middlewareAttachFunction](#module_Middy.middlewareAttachFunction) ⇒ [<code>middy</code>](#module_Middy.middy)
    * [.middlewareFunction](#module_Middy.middlewareFunction) : <code>function</code>
    * [.middlewareObject](#module_Middy.middlewareObject) : <code>Object</code>

<a name="module_Middy.middy"></a>

### Middy.middy(handler) ⇒ [<code>middy</code>](#module_Middy.middy)
Middy factory function. Use it to wrap your existing handler to enable middlewares on it.

**Kind**: static method of [<code>Middy</code>](#module_Middy)  
**Returns**: [<code>middy</code>](#module_Middy.middy) - - a `middy` instance  

| Param | Type | Description |
| --- | --- | --- |
| handler | <code>function</code> | your original AWS Lambda function |

<a name="module_Middy.middy"></a>

### Middy.middy : <code>function</code>
**Kind**: static typedef of [<code>Middy</code>](#module_Middy)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>Object</code> | the AWS Lambda event from the original handler |
| context | <code>Object</code> | the AWS Lambda context from the original handler |
| callback | <code>function</code> | the AWS Lambca callback from the original handler |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| use | <code>useFunction</code> | attach a new middleware |
| before | [<code>middlewareAttachFunction</code>](#module_Middy.middlewareAttachFunction) | attach a new *before-only* middleware |
| after | [<code>middlewareAttachFunction</code>](#module_Middy.middlewareAttachFunction) | attach a new *after-only* middleware |
| onError | [<code>middlewareAttachFunction</code>](#module_Middy.middlewareAttachFunction) | attach a new *error-handler-only* middleware |
| __middlewares | <code>Object</code> | contains the list of all the attached    middlewares organised by type (`before`, `after`, `onError`). To be used only   for testing and debugging purposes |

<a name="module_Middy.useFunction"></a>

### Middy.useFunction ⇒ [<code>middy</code>](#module_Middy.middy)
**Kind**: static typedef of [<code>Middy</code>](#module_Middy)  

| Type | Description |
| --- | --- |
| [<code>middlewareObject</code>](#module_Middy.middlewareObject) | the middleware object to attach |

<a name="module_Middy.middlewareAttachFunction"></a>

### Middy.middlewareAttachFunction ⇒ [<code>middy</code>](#module_Middy.middy)
**Kind**: static typedef of [<code>Middy</code>](#module_Middy)  

| Type | Description |
| --- | --- |
| [<code>middlewareFunction</code>](#module_Middy.middlewareFunction) | the middleware function to attach |

<a name="module_Middy.middlewareFunction"></a>

### Middy.middlewareFunction : <code>function</code>
**Kind**: static typedef of [<code>Middy</code>](#module_Middy)  

| Param | Type | Description |
| --- | --- | --- |
| handler | <code>function</code> | the original handler function.   It will expose properties `event`, `context`, `response` and `error` that can   be used to interact with the middleware lifecycle |
| next | <code>function</code> |  |

<a name="module_Middy.middlewareObject"></a>

### Middy.middlewareObject : <code>Object</code>
**Kind**: static typedef of [<code>Middy</code>](#module_Middy)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| before | [<code>middlewareFunction</code>](#module_Middy.middlewareFunction) | the middleware function to attach as *before* middleware |
| after | [<code>middlewareFunction</code>](#module_Middy.middlewareFunction) | the middleware function to attach as *after* middleware |
| onError | [<code>middlewareFunction</code>](#module_Middy.middlewareFunction) | the middleware function to attach as *error* middleware |



## Contributing

Everyone is very welcome to contribute to this repository. Feel free to [raise issues](/issues) or to [submit Pull Requests](/pulls).


## License

Licensed under [MIT License](LICENSE). Copyright (c) 2017 Planet9.
