<script context='module'>
  RED.nodes.registerType('openApi-red', {
     category: 'network',
     color: '#b197ff',
     defaults: {
        name: 			    { value: '',  label: 'Name', placeholder: 'openApi-red', icon: 'tag' },
        openApiUrl:     { value: '',  label: 'URL', icon: 'globe', validate: function(v) {
                          if (!v || this?.internalErrors?.readUrl) {
                            return false
                          }
                          return true
                        }},
        api:            { value: '',  label: 'API tag' },
        server:         { value: '' },
        keepAuth:       { value: false, label: 'Keep authentification', icon: 'lock' },
        alternServer:   { value: false, label: 'Use server option' },
        operation:      { value: '',  label: 'Operation' },
        operationData:  { value: {} },
        errorHandling:  { value: 'Standard',label: 'Error handling' },
        internalErrors: { value: {} },
        parameters:     { value: [],  label: 'Parameters', validate: function(parameters) {
          if (!parameters || !Array.isArray(parameters) || parameters.length === 0 ) {
            return true
          } else {
            let isValid = true
            parameters.forEach(p => {
              if (isValid && p.isActive) {
                if (p.required && p.value.trim() === '') isValid = false
                // validation of typedinput only if element exists!
                if (isValid && window.$('#node-input-' + p.id).length) isValid = window.$('#node-input-' + p.id).typedInput('validate')
              }
            })
            return isValid
          }
        }},
        requestContentType: { value: '',  label: 'Request Content Type'},
        responseContentType: { value: '',  label: 'Response Content Type'},
        showDescription: { value: true },
        outputs: {value: 1}
     },
     inputs:1,
     outputs:1,
     icon: 'white-globe.png',
     label: function() {
         if (this.name) return this.name
         else if (this.operation) return this.operation
         else return 'openApi client';
     },
     
   oneditprepare: function() {
      render(this, { minWidth: '600px' } )
   },
   oneditsave: function() {
    let clone = this.__clone
    // Workaround if JSON-Editor (ACE) was used -> more info in bottom code (on:change event for typedInput Parameters)
    if (clone.saveTypedInputAgain) {
      clone.saveTypedInputAgain.forEach( ({index, id}) => {
        clone.parameters[index].value = window.$('#node-input-' + id).typedInput('value')
      })
    }
    update(this)
   },
   oneditcancel: function() {
     revert(this)
   }
 })
</script>
 
<script>
  export let node
  import { Button, Callout, Collapsible, EditableList, Group, Input, Row, Select, TypedInput } from 'svelte-integration-red/components'
  import { getOpenApiSpec, createParameters, createOperationDescription } from './utils/htmlFunctions.js'
  import JsonParamHelper from './utils/JsonParamHelper.svelte'
  import { createBackwardCompatible } from './utils/utils.js'

  let openApiSpec = {
    apiList: {},
    servers: []
  }
  let error = ''
  let operationDescription = ''
  let prevOperation
  if (node.operation) prevOperation = node.operation.toString()
  node.saveTypedInputAgain = [] // will not be saved, is just for workaround
  let requestContentTypes = []
  let responseContentTypes = []
  let oldParameters = {}
  createBackwardCompatible(node)
  node.internalErrors.readUrl = true

  const setError = (message, inputFieldId = null) => {
    requestContentTypes = []
    responseContentTypes = []
    if (typeof message !== 'string') {
      message = JSON.stringify(message)
    }
    error = message
    if (inputFieldId) {
      document.getElementById(inputFieldId).classList.add("input-error")
    }
    return
  }

  let init = true
  const createApi = async () => {
    try {
      error = ''
      openApiSpec = await getOpenApiSpec(node.openApiUrl)
      // if a string was returned it is a node error
      if (typeof openApiSpec === 'string') {
        setError(openApiSpec, 'node-input-openApiUrl')
      } else {
        openApiSpec.apiList = openApiSpec.apiList || {}
        openApiSpec.servers = openApiSpec.servers || []

        if (openApiSpec.servers.length <= 1) node.server = ''
        // save old parameter objects (openApi-red version <0.2) - changed from object to array objects
        if (!Array.isArray(node.parameters) && node.api && node.operation) {
          Object.assign(oldParameters, node.parameters)
          node.parameters = []
          prevOperation = ''
          node.operationData = openApiSpec.apiList?.[node.api]?.[node.operation]
        }
        node.internalErrors.readUrl = false
      }
    } catch (e) {
      node.internalErrors.readUrl = true
      setError(e, 'node-input-openApiUrl')
    }
    init = false
  }
  if (node.openApiUrl.toString().trim()) {
    createApi()
  }

 // create content type selection and parameter list
  $: if (Object.keys(openApiSpec.apiList || {}).length && node.operation) {
    operationDescription = createOperationDescription(openApiSpec.apiList, node)
    
    // set valid content Types if operation is set
    const operationSchema = openApiSpec.apiList?.[node.api]?.[node.operation]
    if (operationSchema?.requestBody?.content) {
      requestContentTypes = Object.keys(operationSchema.requestBody.content || {})
    } else {
      // needed input since an update from swagger.js
      requestContentTypes = ['application/json','application/x-www-form-urlencoded','multipart/form-data']
    }
    node.requestContentType = node.requestContentType || requestContentTypes[0]

    if (operationSchema?.responses) {
      const responseKeys = Object.keys(operationSchema.responses)
      responseKeys.forEach( r => {
        if (operationSchema.responses[r]?.content) {
          const contentTypes = Object.keys(operationSchema.responses[r].content)
          contentTypes?.forEach( cT => responseContentTypes.push(cT))
        }
      })
    }
    if (responseContentTypes.length) {
      // distinct array
      responseContentTypes = Array.from(new Set(responseContentTypes))
      node.responseContentType = node.responseContentType || responseContentTypes[0]
    } else {
      node.responseContentType = ''
    }

    if (!node.contentType || !requestContentTypes.includes(node.contentType)) {
      node.contentType = requestContentTypes[0]
    }
    // clear parameters if operation has changed
    if (prevOperation !== node.operation) {
      node.parameters.splice(0, node.parameters.length)      
      prevOperation = node.operation
      node.operationData = openApiSpec.apiList?.[node.api]?.[node.operation] || {}
      createParameters(node, oldParameters)
    }
  }

  const errorHandlingOptions = ['Standard', 'other output', 'throw exception']
  $: if (node.errorHandling) {
    if ('other output' === node.errorHandling) {
      node.outputs = 2
    } else {
      node.outputs = 1
    } 
  }
</script>
 
<style>
 :global(#openApi-red-svelte-container :is(.required, .required label)) {
    font-weight: bold !important;
	}
  :global(#openApi-red-svelte-container .sir-Row label) {
    min-width: 150px;
  }
  :global(#openApi-red-svelte-container .sir-Row label i) {
    min-width: 14px;
  }
  :global(.sir-Group.paddingBottom > .sir-Group-container) {
    padding-bottom: 12px;
  }

  :global(.success .fa-check-square) {
    color: green;
  }
</style>

{#if error}
  <Callout type="error">
    <span slot="header">Error</span>
    {error}
  </Callout>
{/if}

<Collapsible label="General" indented={false}>
  <Group clazz="paddingBottom">
    <Input bind:node prop="name"/>
    <Row>
      <Input bind:node prop="openApiUrl" inline on:change={() => node.internalErrors.readUrl = true}/>
      <Button icon={node.internalErrors.readUrl ?  "edit" : "check-square"} clazz={node.internalErrors.readUrl ? "" :  "success"} label={node.internalErrors.readUrl ? "read" : "ok"} on:click={createApi} inline disabled={!node.internalErrors.readUrl}/>      
    </Row>
    {#if openApiSpec.servers?.length > 1}
      <div style="margin-left: 113px; margin-bottom: 12px;">
        {#if node.alternServer}
        <Callout type="warning" closeable>
          <span slot="header">Alternative Server is an experimental Feature!</span>
          Setting an alternative server was not tested in a practical environment, but should work. If not, please make a bug report!
        </Callout>
        {/if}
      </div>
      <Row>
        <Select inline bind:node prop="server"  disabled={!node.alternServer}>
          {#each openApiSpec.servers as s}
            {#if s.description}
              <option disabled>{s.description}</option>
            {/if}
            <option value={s.url}>{s.url}</option>
            <option disabled>-------------------------</option>
          {/each}
        </Select>
        <Input bind:node prop="alternServer" inline />
      </Row>
      
    {/if}
    <Select bind:node prop="errorHandling" icon="warning" >
      {#each errorHandlingOptions as eOption}
        <option value={eOption}>{eOption}</option>
      {/each}
    </Select>
    <Input bind:node prop="keepAuth" labelBeforeCheckbox={true}/>
  </Group>
</Collapsible>
<Collapsible label="Api options" indented={false}>
  <Group clazz="paddingBottom">
    <Select bind:node prop="api" icon="tag" on:change={() => node.operation = ""}>
      <option value=""></option>
        { #each Object.keys(openApiSpec.apiList || {}) as api}
          {#if node.api === api} 
            <option value={api} selected>{api}</option>
          {:else}
            <option value={api}>{api}</option>
          {/if}
        {/each}
    </Select>
    <Select bind:node prop="operation" icon="wrench">
      <option value=""></option>
      {#each Object.values(openApiSpec?.apiList?.[node.api] || {}) as operation}
        <option value={operation.operationId} selected={node.operation === operation.operationId}>{operation.summary}</option>
      {/each}
    </Select>
    
    {#if operationDescription}
    <div style="margin-bottom: 12px;">
      <Callout type="info" closeable bind:show={node.showDescription} fading={!init}>
        <span slot="header">Description</span>
        {@html operationDescription}
      </Callout>
      {#if !node.showDescription}
        <Button label="show description" icon="eye" indented on:click={() => node.showDescription = !node.showDescription}/>
      {/if}
    </div>
    {/if}
    
    <Select clazz="noLongLabel" bind:node prop="requestContentType">
      {#each requestContentTypes as reqCT}
        {#if node.requestContentType === reqCT}
          <option value={reqCT} selected>{reqCT}</option>
        {:else}
          <option value={reqCT}>{reqCT}</option>
        {/if}
      {/each}
    </Select>
    {#if responseContentTypes.length }
      <Select clazz="noLongLabel" bind:node prop="responseContentType" fading={!init} >
        {#each responseContentTypes as resCT}
          {#if node.responseContentType === resCT}
            <option value={resCT} selected>{resCT}</option>
          {:else}
            <option value={resCT}>{resCT}</option>
          {/if}
        {/each}
      </Select>
    {/if}
</Group>
</Collapsible>

{#if node.api && node.operation}
  {#if node.parameters.length > 0}
    <div style="display: flex; justify-content: space-between;">
      <span class="label">Parameters </span>
      <span class="required" style="font-size: 10px;">(bold = required parameters)</span>
    </div>
    <EditableList bind:elements={node.parameters} let:element={param} let:index maxHeight="800" >
      <div class:required={param.required}>
        <Input type="checkbox" label={param.name + ": " + param.description} value={param.isActive} disabled={param.required} on:change={e => node.parameters[index].isActive = e.detail.value}/>
      </div>
      <TypedInput types={param.allowedTypes} type={param.type} value={param.value} id={param.id} disabled={!param.isActive} 
        on:change={(e) => {
          // if JSON-Editor (ACE) is used, it will return "[object Object]" as value, but set the correct JSON in the input field.
          // This seems to be a bug which occurs to non default fields and SIR. As non default fields will not be saved automaticlly (and this is a correct behavior)
          // we must use a workaround and don"t save the value with the on:change event but save it when the node will be closed.
          if (typeof e.detail.value !== "object" && e.detail.value.toString() !== "[object Object]") {
            node.parameters[index].value = e.detail.value
            node.parameters[index].type = e.detail.type
          } else {
            // within the change event window.$("#node-input-" + id).typedInput("value") would also return the wrong value
            node.saveTypedInputAgain.push({index, "id": param.id })
          }
        }}
      />
      <!-- Json Object additional information and helper buttons -->
      {#if param?.schema?.type === "object"}
        <JsonParamHelper {param}></JsonParamHelper>
      {/if}
    </EditableList>
  {:else}
    <Callout type="info">
      No parameters found!
    </Callout>
  {/if}
{/if}
