export async function getApiList(openApiUrl) {
  let url = encodeURI(openApiUrl)
  // server call
  return $.get( "getNewOpenApiInfo?openApiUrl=" + url, function(response) {
    return response
  })
  .fail(function(message) {
    return message
  })
}

export function objectHasValues(object) {
  return (typeof object === 'object' && Object.keys(object).length > 0 && object.constructor === Object)
}

export const getCorrectType = (param) => {
  let type = param?.schema?.type || param.type
  if (type === "boolean") return "bool"
  if (type === "integer") return "num"
  if (param.name === "Json Request Body" || param.name === "body" || type === "body" || type === "object") return "json"
  if (param?.items?.enum?.length > 0 || param?.schema?.enum?.length) return "array"
  return "str"
}

export const getAllowedTypes = (type) => {
  if (type === "bool") return ["bool", "msg", "flow", "global"]
  if (type === "num") return ["num", "jsonata", "msg", "flow", "global"]
  if (type === "json") return ["json", "jsonata", "msg", "flow", "global"]
  return ["str", "json", "jsonata", "msg", "flow", "global"]
}

export const setJsonKeys = (param, option) => {
  let required = []
  let notRequired = []
  let exists = []
  const propKeys = Object.keys(param.schema.properties)
  let currentValue = window.$("#node-input-" + param.name + param.in).typedInput("value")
  try {
    currentValue = JSON.parse(currentValue)
  } catch {
    currentValue = {}
  }

  propKeys.forEach(prop => {
    if (currentValue[prop]) {
      exists.push(`"${prop}": "${currentValue[prop]}"`)
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
  let result = "{"
  if (required.length > 0) result += required.join(", ") + ", "
  if (exists.length > 0) result += exists.join(", ") + ", "
  if (option === "default" && notRequired.length > 0) result += notRequired.join(", ")
  if (result.trim().endsWith(",")) result = result.trim().slice(0, -1)
  result += "}"
  // node.parameters[index].value = notRequired.join(", ")
  // jQuery because setting node.parameters[index].value does not work
  window.$("#node-input-" + param.name + param.in).typedInput("value", result)    
}

export const sortKeys = (schema) => {
  let keys = null
  if (schema?.properties) {
    // ordering keys helps later with svelte #each (first required then normal and sorted alphabetical)
    keys = Object.keys(schema.properties).sort()
    if (schema.required) {
    let notRequiredKeys = keys.filter(prop => !schema.required.includes(prop));
    keys = schema.required.sort().concat(notRequiredKeys.sort())
    }
  }
  return keys
}