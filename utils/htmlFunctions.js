const getOpenApiSpec = async (openApiUrl) => {
  const url = encodeURI(openApiUrl)
  // server call
  return window.$.get('getOpenApiSpec?openApiUrl=' + url, function (response) {
    return response
  }).fail(function (message) {
    return message
  })
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
    const keys = sortKeys(content[node.contentType].schema)
    if (content[node.contentType]) {
      const newParameter = {
        id: 'requestBody',
        name: 'Request body',
        in: '',
        schema: content[node.contentType].schema || null,
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

module.exports = {
  getOpenApiSpec,
  getCorrectType,
  getAllowedTypes,
  sortKeys,
  createParameters,
  createOperationDescription
}
