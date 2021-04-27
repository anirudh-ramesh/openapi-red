export async function getApiList (openApiUrl) {
  const url = encodeURI(openApiUrl)
  // server call
  return window.$.get('getNewOpenApiInfo?openApiUrl=' + url, function (response) {
    return response
  })
    .fail(function (message) {
      return message
    })
}

export function objectHasValues (object) {
  return (typeof object === 'object' && Object.keys(object).length > 0 && object.constructor === Object)
}

export const getCorrectType = (param) => {
  const type = param?.schema?.type || param.type
  if (type === 'boolean') return 'bool'
  if (type === 'integer') return 'num'
  if (param.name === 'Json Request Body' || param.name === 'body' || type === 'body' || type === 'object') return 'json'
  if (param?.items?.enum?.length > 0 || param?.schema?.enum?.length) return 'array'
  return 'str'
}

export const getAllowedTypes = (input) => {
  let type
  if (typeof input === 'string') type = input
  else type = getCorrectType(input)
  if (type === 'bool') return ['bool', 'msg', 'flow', 'global']
  if (type === 'num') return ['num', 'jsonata', 'msg', 'flow', 'global']
  if (type === 'json') return ['json', 'jsonata', 'msg', 'flow', 'global']
  if (type === 'array') {
    const options = input?.items?.enum || input?.schema?.enum
    return [{ value: 'select', label: 'Select', options: options }, 'str', 'msg', 'flow', 'global']
  }
  return ['str', 'json', 'jsonata', 'msg', 'flow', 'global']
}

export const setJsonKeys = (param, option) => {
  const required = []
  const notRequired = []
  const exists = []
  const propKeys = Object.keys(param.schema.properties)
  let fieldValue = window.$('#node-input-' + param.id).typedInput('value')
  try {
    fieldValue = JSON.parse(fieldValue)
  } catch {
    fieldValue = {}
  }

  propKeys.forEach(prop => {
    if (fieldValue[prop]) {
      const value = fieldValue[prop]
      // chk if value is empty array or object -> would return "" otherwise
      if (typeof value === 'object') {
        if (Array.isArray(value) && value.length === 0) exists.push(`"${prop}": []`)
        else if (Object.keys(value).length === 0) exists.push(`"${prop}": {}`)
        else exists.push(`"${prop}": "${value}"`)
      } else {
        exists.push(`"${prop}": "${value}"`)
      }
    } else {
      let isRequired = false
      if (param.schema.required) isRequired = param.schema.required.find(reqParam => reqParam === prop)
      if (isRequired) {
        required.push(`"${prop}": "${param.schema.properties[prop].type} - required"`)
      } else {
        notRequired.push(`"${prop}": "${param.schema.properties[prop].type}"`)
      }
    }
  })

  let result = required.concat(exists)
  if (option === 'default') result = result.concat(notRequired)
  result = '{' + result.join(', ') + '}'
  // jQuery because setting node.parameters[index].value does not work
  window.$('#node-input-' + param.id).typedInput('value', result)
}

// is an object
export const sortKeys = (schema) => {
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
// is an array
export const orderRequired = (a, b) => {
  let comparison = 0
  if (b.required) {
    comparison = 1
  } else if (a.required) {
    comparison = -1
  }
  return comparison
}

export const createParameters = (node, operationData, oldParameters) => {
  // openApi 3 new body style with selection
  if (!operationData.parameters && operationData?.requestBody?.content) {
    const requestBody = operationData.requestBody
    const content = requestBody.content
    const keys = sortKeys(content[node.contentType].schema)
    if (content[node.contentType]) {
      node.parameters.push({
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
      })
    }
  } else {
    let parameters = operationData?.parameters?.sort(orderRequired)
    if (!parameters) parameters = []
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
}
