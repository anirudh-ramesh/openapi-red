const createNewApiList = (client) => {
  const newApiList = {}
  const paths = client.spec.paths || {}
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
  return newApiList
}

const getNewServerUrl = (config, openApiUrl, reqUrl) => {
  let newServerUrl
  const oldUrl = new URL(openApiUrl)
  if (config.server.startsWith('/')) {
    newServerUrl = oldUrl.origin + config.server
  } else {
    newServerUrl = config.server
  }
  let openApiUrlWithoutFilename = openApiUrl.split('/')
  openApiUrlWithoutFilename.pop()
  openApiUrlWithoutFilename = openApiUrlWithoutFilename.join('/')
  const urlParam = reqUrl.replace(openApiUrlWithoutFilename, '')
  return newServerUrl + urlParam
}

// preferred use operationId. If not available use pathname + method
const identifyOperation = (config) => {
  let operationId, pathName, method
  if (config.operationData.withoutOriginalOpId) {
    pathName = config.operationData.pathName
    method = config.operationData.method
  } else {
    operationId = config.operation
  }
  return { operationId, pathName, method }
}

module.exports = {
  createNewApiList,
  getNewServerUrl,
  identifyOperation
}
