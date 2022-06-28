const getOpenApiSpec = async (openApiUrl, devMode = false) => {
  let url = 'getOpenApiSpec?openApiUrl=' + encodeURI(openApiUrl)
  if (devMode) {
    url += '&devMode=true'
  }
  // server call
  return window.$.get(url, function (response) {
    return response
  }).fail(function (message) {
    return message
  })
}

const setError = (message, inputFieldId = null, data) => {
  data.contentTypes.request = []
  data.contentTypes.response = []
  if (typeof message !== 'string') {
    message = JSON.stringify(message)
  }
  data.error = message
  if (inputFieldId) {
    document.getElementById(inputFieldId).classList.add('input-error')
  }
}

const createApi = async (node, data) => {
  try {
    data.error = ''
    data.openApiSpec = await getOpenApiSpec(node.openApiUrl, node.devMode)
    // if a string was returned it is a node error
    if (typeof data.openApiSpec === 'string') {
      setError(data.openApiSpec, 'node-input-openApiUrl', data)
    } else if (!Object.keys(data.openApiSpec.apiList).length) {
      setError('No api list found', 'node-input-openApiUrl', data)
    } else {
      // trigger svelte to show latest data
      data.openApiSpec.apiList = data.openApiSpec.apiList || {}
      data.openApiSpec.servers = data.openApiSpec.servers || []

      if (data.openApiSpec.servers.length <= 1) node.server = ''
      // save old parameter objects (openApi-red version <0.2) - changed from object to array objects
      if (!Array.isArray(node.parameters) && node.api && node.operation) {
        Object.assign(data.oldParameters, node.parameters)
        node.parameters = []
        data.prevOperation = ''
        node.operationData = data.openApiSpec.apiList?.[node.api]?.[node.operation]
      }
      node.internalErrors.readUrl = false
    }
  } catch (e) {
    node.internalErrors.readUrl = true
    setError(e, 'node-input-openApiUrl', data)
  }
  data.init = false
}

const getCorrectType = (param) => {
  const type = param?.schema?.type || param.type
  if (type === 'boolean') return 'bool'
  if (type === 'integer') return 'num'
  if (param.name === 'Json Request Body' || param.name === 'body' || type === 'body' || type === 'object') return 'json'
  if (param?.items?.enum?.length > 0 || param?.schema?.enum?.length) return 'select'
  return 'str'
}

const getAllowedTypes = (input) => {
  let type
  if (typeof input === 'string') type = input
  else type = getCorrectType(input)
  if (type === 'bool') return ['bool', 'msg', 'flow', 'global']
  if (type === 'num') return ['num', 'jsonata', 'msg', 'flow', 'global']
  if (type === 'json') return ['json', 'jsonata', 'msg', 'flow', 'global']
  if (type === 'select') {
    const options = input?.items?.enum || input?.schema?.enum
    return [{ value: 'select', label: 'Select', options: options }, 'str', 'msg', 'flow', 'global']
  }
  return ['str', 'json', 'jsonata', 'msg', 'flow', 'global']
}

const sortKeys = (schema) => {
  let keys = null
  if (schema?.properties) {
    // ordering keys helps later with svelte #each (first required then normal and sorted alphabetical)
    keys = Object.keys(schema.properties).sort()
    if (schema.required) {
      const notRequiredKeys = keys.filter(prop => !schema.required.includes(prop))
      keys = schema.required.sort().concat(notRequiredKeys.sort())
    }
  }
  return keys
}

const orderRequired = (a, b) => {
  let comparison = 0
  if (b.required) {
    comparison = 1
  } else if (a.required) {
    comparison = -1
  }
  return comparison
}

const createParameters = (node, oldParameters) => {
  // new in openApi: body request
  // check if requestBody is in parameters or separate
  if (!node.operationData.parameters?.requestBody && node.operationData?.requestBody?.content) {
    const requestBody = node.operationData.requestBody
    const content = requestBody.content
    const keys = sortKeys(content[node.requestContentType].schema)
    if (content[node.requestContentType]) {
      const newParameter = {
        id: 'requestBody',
        name: 'Request body',
        in: '',
        schema: content[node.requestContentType].schema || null,
        value: oldParameters?.[' Request body']?.value || '{}',
        required: !!requestBody?.required || false,
        isActive: !!requestBody?.required || oldParameters?.[' Request body']?.isActive || false,
        description: requestBody?.description || '-',
        type: oldParameters?.[' Request body']?.inputType || 'json',
        allowedTypes: getAllowedTypes('json'),
        keys
      }
      node.parameters.push(newParameter)
    }
  }
  // add standard parameters
  const parameters = node.operationData?.parameters?.sort(orderRequired) || []
  parameters.forEach(param => {
    const keys = sortKeys(param.schema)
    node.parameters.push(
      {
        id: param.name + param.in,
        name: param.name,
        in: param.in,
        required: param.required,
        value: oldParameters?.[param.name + ' ' + param.in]?.value || '',
        isActive: !!param.required || oldParameters?.[param.name + ' ' + param.in]?.isActive || false,
        type: oldParameters?.[param.name + ' ' + param.in]?.inputType || getCorrectType(param), // selected type
        allowedTypes: getAllowedTypes(param),
        description: param.description || '-',
        schema: param.schema || null,
        keys
      }
    )
  })
}

const createOperationDescription = (apiList, node) => {
  let operationDescription = ''
  if (apiList?.[node.api]?.[node.operation]?.description) {
    operationDescription = apiList[node.api][node.operation].description
    // sanitize html
    const denyList = ['script', 'object', 'embed', 'link']
    denyList.forEach(d => {
      const searchParam = new RegExp('<\/?' + d + '>', 'gm') // eslint-disable-line
      operationDescription = operationDescription.replace(searchParam, '"<"' + d + '">"')
    })
  }
  return operationDescription
}

const getRequestContentTypes = (operationSchema) => {
  // needed input since an update from swagger.js
  let requestContentTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']
  if (operationSchema?.requestBody?.content) {
    requestContentTypes = Object.keys(operationSchema.requestBody.content || {})
  }
  return requestContentTypes
}

const getResponseContentTypes = (operationSchema) => {
  let responseContentTypes = []
  if (operationSchema?.responses) {
    Object.values(operationSchema.responses).forEach(response => {
      if (response?.content) {
        Object.keys(response.content)?.forEach(cT => responseContentTypes.push(cT))
      }
    })
  }
  if (responseContentTypes.length) {
    // distinct array
    responseContentTypes = Array.from(new Set(responseContentTypes))
  }
  return responseContentTypes
}

module.exports = {
  getOpenApiSpec,
  getCorrectType,
  getAllowedTypes,
  sortKeys,
  createParameters,
  createOperationDescription,
  getRequestContentTypes,
  getResponseContentTypes,
  createApi
}
