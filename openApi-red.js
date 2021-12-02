const Swagger = require('swagger-client')

module.exports = function (RED) {
  function openApiRed (config) {
    RED.nodes.createNode(this, config)
    const node = this

    node.on('input', function (msg, send, done) {
      // backward compatibility
      send = send || function () { node.send.apply(node, arguments) }
      if (typeof config.requestContentType === 'undefined') config.requestContentType = config.contentType
      if (typeof config.responseContentType === 'undefined') config.responseContentType = ''
      if (typeof config.alternServer === 'undefined') config.alternServer = false

      const sendError = (e) => {
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

      let openApiUrl = config.openApiUrl
      // no optional chaining as long as Node-Red supports node.js v12
      // if (msg?.openApi?.url) openApiUrl = msg.openApi.url      
      if (msg.openApi && msg.openApi.url) openApiUrl = msg.openApi.url
      let parameters = {}
      let requestBody = {} // we need a separate parameter for body in OpenApi 3

      if (msg.openApi && msg.openApi.parameters) {
        parameters = msg.openApi.parameters
      } else {
        for (const p in config.parameters) {
          const param = config.parameters[p]
          let evaluatedInput = RED.util.evaluateNodeProperty(param.value, param.type, this, msg)
          // query input can't be object. Therefore stringify!
          if (typeof evaluatedInput === 'object' && param.in === 'query') {
            evaluatedInput = JSON.stringify(evaluatedInput)
          }
          // can't use 'if (evaluatedInput)' due to values false and 0
          if (param.required && (evaluatedInput === '' || evaluatedInput === null || evaluatedInput === undefined)) {
            return done(`Required input for ${param.name} is missing.`, msg)
          }
          if (param.isActive && param.name !== 'Request body') {
          // if (param.isActive) {
            parameters[param.name] = evaluatedInput
          }
          if (param.isActive && param.name === 'Request body') {
            requestBody = evaluatedInput
          }
        }
      }
      // preferred use operationId. If not available use pathname + method
      let operationId, pathName, method
      if (config.operationData.withoutOriginalOpId) {
        pathName = config.operationData.pathName
        method = config.operationData.method
      } else {
        operationId = config.operation
      }
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
          /**
           * Warning: Experimental: should work as stated in https://github.com/swagger-api/swagger-js/issues/1901
           */
          // reroute to a different server
          let newServerUrl
          if (config.server && config.alternServer) {
            const oldUrl = new URL(openApiUrl)
            if (config.server.startsWith('/')) {
              newServerUrl = oldUrl.origin + config.server
            } else {
              newServerUrl = config.server
            }
            let openApiUrlWithoutFilename = openApiUrl.split('/')
            openApiUrlWithoutFilename.pop()
            openApiUrlWithoutFilename = openApiUrlWithoutFilename.join('/')
            const urlParam = req.url.replace(openApiUrlWithoutFilename, '')
            req.url = newServerUrl + urlParam
          }
        }
      }
      if (config.responseContentType) openApiOptions.responseContentType = config.responseContentType

      // Start Swagger / OpenApi
      Swagger(openApiUrl).then((client) => {
        client.execute(openApiOptions)
          .then((res) => {
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
    const decodedUrl = decodeURIComponent(openApiUrl)
    const newApiList = {}
    Swagger(decodedUrl).then((client) => {
      const paths = client.spec.paths
      Object.keys(paths).forEach((pathKey) => {
        const path = paths[pathKey]
        Object.keys(path).forEach((operationKey) => {
          const operation = path[operationKey]
          let opId = operation.operationId

          if (typeof operation === 'object') {
            // fallback if no operation id exists
            if (!opId) {
              opId = operationKey + pathKey
              operation.operationId = opId
              operation.withoutOriginalOpId = true
              operation.pathName = pathKey
              operation.method = operationKey
            }

            // default if no array tag exists
            if ((!operation.tags) || operation.tags.constructor !== Array || operation.tags.length === 0) operation.tags = ['default']
            for (const tag of operation.tags) {
              if (!newApiList[tag]) newApiList[tag] = {}
              operation.path = pathKey
              newApiList[tag][opId] = operation
            }
          }
        })
      })
      response.send({
        apiList: newApiList,
        info: client.spec.info,
        security: client.spec.security,
        servers: client.spec.servers
      })
    }).catch((e) => {
      if (e.message) {
        let errorMsg = e.message
        if (e.response.data) errorMsg = errorMsg + ': ' + e.response.data
        response.send(errorMsg)
      } else {
        throw new Error('Error' + e)
      }
    })
  })
}
