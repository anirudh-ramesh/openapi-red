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

export function createParameterList(node, apiList) {
  $("#node-input-parameters-container").empty()
  let api = $('#node-input-api').val()
  let operation = $('#node-input-operation').val()
  // jQuery val() can return the value undefined as a string
  if (api === "undefined" || operation === "undefined")  {
    $('.inputUrl .red-ui-typedInput-container').addClass( "error")
    $('.nodeError').html('Error in creating API List. Api or Operation value is "undefined"')
  } else if (api && operation) {
    let operationData = apiList[api][operation]
    let parameterList = operationData.parameters
    // openApi 3 new body style with selection // Warning: Experimental
    if (!parameterList && operationData.requestBody && operationData.requestBody.content) {
      $('.contentType').css('display','initial')
      $('#node-input-contentType').empty().append('<option selected="selected" value=""></option>');
      let requestBodies = operationData.requestBody.content
      Object.keys(requestBodies).forEach( (b) => $('#node-input-contentType').append(`<option value="${b}">${b}</option>`) )
      if (node.contentType) $('#node-input-contentType').val(node.contentType)

      if (requestBodies[node.contentType]) {
        parameterList = [{
        name: "Request body",
        in: "",
        schema:  requestBodies[node.contentType].schema,
        required: operationData.requestBody.required
        }]
      } 
    } else {
      // Content type is now needed since update 
      $('#node-input-contentType').empty()
        .append('<option value="application/json">application/json</option>')
        .append('<option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>')
        .append('<option value="multipart/form-data">multipart/form-data</option>')
      if (node.contentType) $('#node-input-contentType').val(node.contentType)
    }

    if (parameterList) {
      for (let param of parameterList) {
        $("#node-input-parameters-container").editableList('addItem', param)
      }
    } else {
      $('.inputUrl .red-ui-typedInput-container').addClass( "error")
      $('.nodeError').html('No parameters found')
    }
  }
}

export function createJsonParameterList(schema, elementId) {
  let jsonInputDefault = {}
  let jsonInputRequired = {}
  let propList = '' 
  if (schema.properties) {
    for (let prop in schema.properties) {
      let required = (Array.isArray(schema.required) && schema.required.includes(prop))
      let requiredStyle = ''
      let requiredNote = ''
      if (required) {
          requiredStyle = '<span class="paramIsRequired">*</span>'
          requiredNote = '- required - '
          jsonInputRequired[prop] = requiredNote + schema.properties[prop].type
      }
      jsonInputDefault[prop] = requiredNote + schema.properties[prop].type
      let description =  schema.properties[prop].description
      // Title prop has problems with ""
      if (description) description = description.replace(/"/g, "&quot;")
      propList = propList + '<div title="Description: ' + description + '">' + prop +  requiredStyle + '</div>'
    }
  }
  let listButton = ''
  if (!propList) propList = 'No json parameter keys stated!'
  propList = '<div style="display: none" class="' + elementId + '-json-keys"><div class="json-key">' + propList + '</div></div>'
  listButton = '<div><button type="button" id="' + elementId + '_parameterList' + '" class="btn">show keys</button></div>'
  // have to undone any click events before or else it would be added and triggered multiple times
  $(document).off('click', '#'+ elementId + '_parameterList').on('click', '#'+ elementId + '_parameterList', function(){
    $('.' + elementId + '-json-keys').toggle()
    if ($(this).text() === 'show keys') $(this).text('hide keys')
    else $(this).text('show keys')
  })

  let jsonButtonDefault = createJsonInputButton(elementId, jsonInputDefault, 'default')
  let jsonButtonRequired = createJsonInputButton(elementId, jsonInputRequired, 'required')
  return {propList, listButton, jsonButtonDefault, jsonButtonRequired}
}

export function createJsonInputButton(elementId, jsonValues, name) {
  if (objectHasValues(jsonValues)) {
    let button = '<div><button type="button" id="' + elementId + '_' + name + '" class="btn">set ' + name + '</button></div>'
    
    // remove any event handler for this element first (parameter changed, other nodes, ...)
    $(document).off("click", '#' + elementId + '_' + name)
    $(document).on("click", '#' + elementId + '_' + name, function(){ 
      let currentValues = $('#' + elementId).val()
      let setValues = {}
      if (currentValues.length > 0) {
        currentValues = JSON.parse(currentValues)
        // merge param values with current existing values
        $.extend(setValues, jsonValues, currentValues)
      } else {
        setValues = jsonValues
      }
      $("#" + elementId).typedInput('value', JSON.stringify(setValues))
    })
    return (button)
  } else {
    return ('')
  }
}

// function setOperationInfo(node, apiList) {
//   let api = $('#node-input-api').val()
//   let operation = $('#node-input-operation').val()

//   if (api && operation && objectHasValues(apiList)) {
//     let operationDetails = apiList[api][operation]
//     let description = operationDetails.description
//     // set fallback options if no operation id is set
//     node.operationData.withoutOriginalOpId = operationDetails.withoutOriginalOpId
//     node.operationData.pathName = operationDetails.pathName
//     node.operationData.method = operationDetails.method
//     $("#operation-info").attr('paramName', operationDetails.summary)
//     if (!description) description = 'No Description'
//       $('#operation-info').attr('title', description)
//       $('#operation-info').html(operationDetails.operationId)
//   } else {
//       $("#operation-info").attr('title', '')
//       $('#operation-info').html(' ')
//   }
// }

export function addNewRow(row, i, param, node) {
  // add custom attribute to find parameter with in and name (can't be id, because of blanks (for example Json Request Body))
  // if a parameter has a identical name (depreceated) it can't have the same 'in' (query, path, header,...)
  let parameterName = param.in + ' ' + param.name
  row.attr('param_in_name', parameterName)

  let savedParameterValues 
  if ( objectHasValues(node.parameters[parameterName])) savedParameterValues = node.parameters[parameterName]
  // create default object
  else { 
    node.parameters[parameterName] = {
      'name': param.name,
      'in': param.in,
      'required': param.required,
      'value': '',
      'isActive': false
    }
  }
  // first column
  // we build a checkbox to check wanted parameters (parameter has default values)
  let paramIsActive = $('<input/>', { class: "node-input-parameter paramChecked", type: "checkbox"}).appendTo(row)
  if (param.required) paramIsActive.prop({'checked' : true, 'disabled': true })
  else if (savedParameterValues) paramIsActive.prop('checked', savedParameterValues.isActive) 

  // second column
  // param name and description
  let secondColumnInfo = param.name
  if (param.required) secondColumnInfo += '<span class="paramIsRequired">*</span>'
  let description = param.description
  if (description) description = description.replace(/"/g, "&quot;") // title object has problems with '"'
  else description = 'No description found!'
  if (param.type === 'array' && !(param.items && param.items.enum && param.items.enum.length > 0) )  description += "\nAttention: No Array selection found! You have to enter it manuelly!"
  $('<div class="paramName" title="Description: ' + description  + '">' + secondColumnInfo + '</div>').appendTo(row)

  // third column
  // param type or if json build list and input
  let elementId = "OpenAPI_Parameter_" + i
  let parameterType = param.type
  if (!parameterType && param.schema && param.schema.type) parameterType = param.schema.type
  if (!parameterType) parameterType = 'no type found'

  if (param.name !== 'Json Request Body' && parameterType !== 'body' && parameterType !== 'object') {
      $('<div class="paramType">' + parameterType + '</div>').appendTo(row)
  } else if (param.name === 'Json Request Body' || param.name === 'body' || parameterType === 'body' || parameterType === 'object') {
      let jsonParam = createJsonParameterList(param.schema, elementId)
      $('<div class="paramType">' + jsonParam.jsonButtonDefault + jsonParam.jsonButtonRequired + jsonParam.listButton + jsonParam.propList + '</div>').appendTo(row)
  } 

  // fourth column
  // input element
  let inputElement = $('<input/>', { class: "node-input-parameter paramValue", id: elementId, type: "text"})
  // if selection items are available we use them. Otherwise it become a normal input field (param.type is not neccessarily 'array')
  let arraySource
  if (param.items && param.items.enum && param.items.enum.length > 0) arraySource = param.items.enum
  else if (param.schema && param.schema.enum && param.schema.enum.length > 0) arraySource = param.schema.enum
  if (arraySource) {
    let buildArraySelector = $('<select type="text" class="node-input-parameter paramValue" "id=' + elementId + '"><option value=""></option></select>')
    arraySource.forEach( (i) => buildArraySelector.append('<option value=' + i + '>' + i + '</option>')); 
    if (savedParameterValues) buildArraySelector.val(savedParameterValues.value)
    buildArraySelector.appendTo(row)
  } else {
    inputElement.appendTo(row);
    if (parameterType === 'boolean') inputElement.typedInput({types: ['bool', 'msg', 'flow', 'global']})
    else if (parameterType === 'integer') inputElement.typedInput({types: ['num', 'jsonata', 'msg', 'flow', 'global']})
    else if (param.name === 'Json Request Body' || param.name === 'body' || parameterType === 'body' || parameterType === 'object') inputElement.typedInput({types: ['json', 'jsonata', 'msg', 'flow', 'global']})
    else inputElement.typedInput({types: ['str', 'json', 'jsonata', 'msg', 'flow', 'global']})
    
    if (savedParameterValues) {
      inputElement.typedInput('value', savedParameterValues.value)
      inputElement.typedInput('type', savedParameterValues.inputType)
    }
    // hide input if not checked
    if (!paramIsActive.prop('checked')) $('#' + elementId).parent().find('[class*="red-ui-typedInput-container"]').css('visibility', 'hidden')
    
    inputElement.appendTo(row);
  }
}