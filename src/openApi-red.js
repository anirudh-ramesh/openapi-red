const { createNewApiList, getNewServerUrl, identifyOperation } = require('./utils/server.js')
const { createBackwardCompatible } = require('./utils/utils.js')
const Swagger = require('swagger-client')

module.exports = function (RED) {
  function openApiRed (config) {
    RED.nodes.createNode(this, config)
    const node = this

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments) }
      createBackwardCompatible(config)
      const sendError = (e) => {
        node.status({ fill: 'red', shape: 'dot', text: 'Error' })
        let errorMsg = e.message
        if (e.message && isNaN(e.message.substring(0, 1)) && e.status) {
          errorMsg = e.status + ' ' + e.message
        }
        msg.response = e.response
        if (config.errorHandling === 'other output') {
          send([null, msg])
        } else if (config.errorHandling === 'throw exception') {
          if (done) {
            done(errorMsg)
          } else {
            node.error(errorMsg, msg)
          }
        } else {
          send(msg)
          if (done) done()
        }
      }

      const openApiUrl = (msg.openApi && msg.openApi.url) ? msg.openApi.url : config.openApiUrl
      // no optional chaining as long as Node-Red supports node.js v12
      // if (msg?.openApi?.url) openApiUrl = msg.openApi.url
      let parameters = {}
      let requestBody = {} // we need a separate parameter for body in OpenApi 3
      if (msg.openApi && msg.openApi.parameters) {
        parameters = msg.openApi.parameters
      } else {
        for (const p in config.parameters) {
          const param = config.parameters[p]
          let evaluatedInput = RED.util.evaluateNodeProperty(param.value, param.type, this, msg)
          // query input can't be object
          if (typeof evaluatedInput === 'object' && param.in === 'query') {
            evaluatedInput = JSON.stringify(evaluatedInput)
          }
          // can't use 'if (evaluatedInput)' due to values false and 0
          if (param.required && (evaluatedInput === '' || evaluatedInput === null || evaluatedInput === undefined)) {
            return done(`Required input for ${param.name} is missing.`, msg)
          }
          if (param.isActive) {
            if (param.name !== 'Request body') {
              parameters[param.name] = evaluatedInput
            } else {
              requestBody = evaluatedInput
            }
          }
        }
      }

      const { operationId, pathName, method } = identifyOperation(config)
      // fallback if no content type can be found
      let requestContentType = 'application/json'
      if (config.requestContentType) requestContentType = config.requestContentType

      const openApiOptions = {
        operationId,
        pathName,
        method,
        parameters,
        requestBody,
        requestContentType,
        // if available put token for auth
        requestInterceptor: (req) => {
          if (msg.openApiToken) req.headers.Authorization = 'Bearer ' + msg.openApiToken
          if (msg.headers) req.headers = Object.assign(req.headers || {}, msg.headers)
          if (!config.keepAuth) {
            delete msg.openApiToken
            delete msg.headers
          }
          /**
           * Warning: Reroute to a different server is experimental: should work as stated in https://github.com/swagger-api/swagger-js/issues/1901
           */
          if (config.server && config.alternServer) {
            req.url = getNewServerUrl(config, openApiUrl, req.url)
          }
        }
      }
      if (config.responseContentType) openApiOptions.responseContentType = config.responseContentType

      const initiateOptions = {
        url: openApiUrl
      }
      if (node.devMode) {
        const agent = require('https').Agent({
          rejectUnauthorized: false
        })
        initiateOptions.http = (request) => Swagger.http({ ...request, agent })
        openApiOptions.http = (request) => Swagger.http({ ...request, agent })
      }
      // Start Swagger / OpenApi
      Swagger(initiateOptions).then((client) => {
        node.status({ fill: 'yellow', shape: 'dot', text: 'Retrieving...' })
        client.execute(openApiOptions)
          .then((res) => {
            node.status({})
            msg.payload = res
            send(msg)
            if (done) done()
          }).catch((e) => {
            return sendError(e)
          })
      }).catch(e => {
        return sendError(e)
      })
    })
  }
  RED.nodes.registerType('openApi-red', openApiRed)

  // create API List
  RED.httpAdmin.get('/getOpenApiSpec', (request, response) => {
    const openApiUrl = request.query.openApiUrl
    if (!openApiUrl) {
      return response.send("Missing or invalid openApiUrl parameter 'openApiUrl': " + openApiUrl)
    }
    // const url = decodeURIComponent(openApiUrl)
    const options = {
      url: decodeURIComponent(openApiUrl)
    }

    if (request.query.devMode === 'true') {
      const agent = require('https').Agent({
        rejectUnauthorized: false
      })
      options.http = (request) => Swagger.http({ ...request, agent })
    }
    Swagger(options).then((client) => {
      const newApiList = createNewApiList(client)
      response.send({
        apiList: newApiList,
        info: client.spec.info,
        security: client.spec.security,
        servers: client.spec.servers
      })
    }).catch((e) => {
      if (e.message) {
        let errorMsg = e.message
        // e?.response?.data
        if (e && e.response && e.response.data) {
          errorMsg = errorMsg + ': ' + e.response.data
        }
        response.send(errorMsg)
      } else {
        throw new Error('Error' + e)
      }
    })
  })
}
