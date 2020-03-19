const Swagger = require('swagger-client')

module.exports = function(RED) {
  function openApiRed(config) {
    RED.nodes.createNode(this,config)
    let node = this;

    node.on('input', function(msg) {
      let openApiUrl = config.openApiUrl
      if (msg.openApi && msg.openApi.url) openApiUrl = msg.openApi.url
     
      let parameters = {}
      if (msg.openApi && msg.openApi.parameters) {
        parameters = msg.openApi.parameters
      } else {
        for (let p in config.parameters) {
          let param = config.parameters[p]
          let evaluatedInput = RED.util.evaluateNodeProperty(param.value, param.inputType, this, msg)
          if (param.isActive) parameters[param.name] = evaluatedInput
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

      Swagger(openApiUrl).then( (client) => {
        client.execute({ 
          operationId: operationId, 
          pathName: config.operationData.pathName,
          method: config.operationData.method,
          parameters,
         // if available put token for auth
         requestInterceptor: (req) => {
          if (msg.openApiToken) req.headers['Authorization'] = 'Bearer ' + msg.openApiToken
        }
        })
        .then( (res) => {
          msg.payload = res
          node.send(msg)
        }).catch( (e) => {
          msg.payload = e
          node.send(msg)
        })
      }).catch( e => {
        msg.payload = e
        node.send(msg)
      })
    })
  }
  RED.nodes.registerType("openApi-red", openApiRed)

  // create API List
  RED.httpAdmin.get('/getNewOpenApiInfo', (request, response) => {
    let openApiUrl = request.query.openApiUrl
    if (!openApiUrl) {
        response.send("Missing or invalid openApiUrl parameter 'openApiUrl': " + openApiUrl)
        return
    }
    let decodedUrl = decodeURIComponent(openApiUrl)
    let newApiList = {}
    Swagger(decodedUrl).then( (client) => {
      let paths = client.spec.paths;
      Object.keys(paths).forEach( (pathKey) => {
        let path = paths[pathKey];
        Object.keys(path).forEach( (operationKey) => {
            let operation = path[operationKey]
            let opId = operation.operationId
            // fallback if no operation id exists
            if (!opId) {
              opId = operationKey + pathKey
              operation.operationId = opId
              operation.withoutOriginalOpId = true
              operation.pathName = pathKey
              operation.method = operationKey
            }
            
            for ( tag of operation.tags) {
              if (!newApiList[tag]) newApiList[tag] =  {}
              operation.path = pathKey
              newApiList[tag][opId] = operation
            }
        })
      })
      response.send(newApiList)
    }).catch( (e) => {
      if (e.message ) response.send(e.message.toString())
      else response.send("Error: " + e)
    })
  })
}
