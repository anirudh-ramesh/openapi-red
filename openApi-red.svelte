<script context="module">
 RED.nodes.registerType('openApi-red', {
    category: 'network',
    color: '#b197ff',
    defaults: {
      name: 			{ value: '',  label: 'Name' },
      openApiUrl: { value: '',  label: 'URL' },
      api:        { value: '',  label: 'API tag' },
      operation:  { value: 'application/json',  label: 'Operation'},
      operationData: {value: {}},
      errorHandling: {value: '',label: 'Error handling'},
      parameters: { value: {},  label: 'Parameters'},
      contentType: {value: '',  label: 'Content Type'},
      outputs: {value: 1}
    },
    inputs:1,
    outputs:1,
    icon: "white-globe.png",
    label: function() {
        if (this.name) return this.name
        else if (this.operation) return this.operation
        else return "openApi client";
    },
  oneditprepare: function() {
    render(this)
  },
  oneditsave: function() {
    let node = this
    console.log("oEs: ", node)
  }
})
</script>

<script>
export let node
import { Input, TypedInput, Select, EditableList, Collapsible, Row, Button } from 'svelte-integration-red/components'
import { getApiList, objectHasValues} from './utils/htmlFunctions'

let apiList = {}
let error = ''
let apis = []
let operations = {}
let prevOperation
if (node.operation) prevOperation = node.operation.toString()
let contentTypes = []
let parameterList = []
let boolInputTypes = ['msg', 'flow', 'global','bool', 'str']

const getCorrectType = (param) => {
  let type = param?.schema?.type
  if (type === 'boolean') return 'bool'
  if (type === 'integer') return 'num'
  if (param.name === 'Json Request Body' || param.name === 'body' || type === 'body' || type === 'object') return 'json'
  if (param?.items?.enum?.length > 0 || param?.schema?.enum?.length) return 'array'
  return 'str'
}

const getAllowedTypes = (type) => {
  if (type === 'bool') return ['bool', 'msg', 'flow', 'global']
  if (type === 'num') return ['num', 'jsonata', 'msg', 'flow', 'global']
  if (type === 'json') return ['json', 'jsonata', 'msg', 'flow', 'global']
  return ['str', 'json', 'jsonata', 'msg', 'flow', 'global']
}


const createApi = async () => {
  try {
    error = ''
    apiList = await getApiList(node.openApiUrl)
    // if a string was returned it is a node error
    if (typeof apiList === 'string') {
      // setError(node, apiList, error)
      apis = []
      operations = {}
      contentTypes = []
      error = apiList
    } else {
      apis = Object.keys(apiList)
    }
  } catch (eMsg) {
    setError(node, eMsg, error)
  }
  error = error  
}
if (node.openApiUrl.toString().trim()) createApi()
// node.api = node.api
// node.operation = node.operation
// node.contentType = node.contentType

console.log("afterFirstCreate", node)

// set valid operations if api is set
$: if (node.api && apiList?.[node.api]) {
   operations = apiList[node.api]
   node.operation = node.operation
} else {
	 operations = {}
}

// create content type selection and parameter list
$: if (node.operation && apiList?.[node.api]?.[node.operation]) {
  // clear parameters if operation has changed
  if (prevOperation !== node.operation) {
    for (let prop in node.parameters) {
      delete node.parameters[prop]
    }
  }
  prevOperation = node.operation.toString()

  // set valid content Types if operation is set
  if (node.operation && apiList?.[node.api]?.[node.operation]?.requestBody?.content) {
    contentTypes = Object.keys(apiList[node.api][node.operation].requestBody.content)
  } else {
    // needed input since an update from swagger.js
    contentTypes = ["application/json","application/x-www-form-urlencoded","multipart/form-data"]
  }
  if (!node.contentType || !contentTypes.includes(node.contentType)) {
    node.contentType = contentTypes[0]
  }
  let operationData = apiList[node.api][node.operation]
  console.log("apiList", apiList)
  parameterList = operationData.parameters
  // openApi 3 new body style with selection // Warning: Experimental
  if (!parameterList && operationData?.requestBody?.content) {
    let requestBodies = operationData.requestBody.content
    if (requestBodies[node.contentType]) {
      parameterList = [{
      name: "Request body",
      in: "",
      schema:  requestBodies[node.contentType].schema,
      value: "{}",
      required: operationData?.requestBody?.required || false,
      inputType: 'json', // original type
      type: 'json', // selected type
      }]
      parameterList[0].allowedTypes = getAllowedTypes('json')
    }
  }
  if (undefined === parameterList) {
    parameterList = []
  } else {
    // create object in node.parameters (if it doesn't exists)
    parameterList.forEach(param => {
      console.log("param", param)
      if (!node.parameters?.[param.in + param.name]) {
        node.parameters[param.in + param.name] = {
          name: param.name,
          in: param.in,
          required: param.required,
          value: '',
          isActive: param.required || false,
          inputType: getCorrectType(param), // original type
          type: getCorrectType(param), // selected type
        }
        node.parameters[param.in + param.name].allowedTypes = getAllowedTypes( node.parameters[param.in + param.name].inputType)
      }
    })
  }
  console.log("node.param:", node.parameters)
}

const setError = (message, error) => {
  apis = []
  operations = {}
  contentTypes = []
  error = message
  return
}

const errorHandlingOptions = ['Standard', 'other output', 'throw exception']
</script>

<!-- Html / Svelte code -->
<Input bind:node prop="name" placeholder="openApi-red" />
<Input bind:node prop="openApiUrl" /> <Button icon="edit" label="read" on:click={createApi}></Button>
<Select bind:node prop="errorHandling" >
	{#each errorHandlingOptions as eOption}
    <option value={eOption}>{eOption}</option>
  {/each}
</Select>
<div class="nodeError">{error}</div>
<hr>
<Select bind:node prop="api" >
    <option value=''></option>
	{#each apis as api}
        {#if node.api === api} 
            <option value={api} selected>{api}</option>
        {:else}
            <option value={api}>{api}</option>
        {/if}
  {/each}
</Select>
<Select bind:node prop="operation" >
    <option value=''></option>
    {#each Object.entries(operations) as [key]}
        {#if node.operation === operations[key].operationId}
            <option value={operations[key].operationId} selected>{operations[key].summary}</option>
    {:else}
        <option value={operations[key].operationId}>{operations[key].summary}</option>
    {/if}
  {/each}
</Select>
<Select bind:node prop="contentType">
	{#each contentTypes as contentType}
        {#if node.contentType === contentType}
            <option value={contentType} selected>{contentType}</option>
        {:else}
            <option value={contentType}>{contentType}</option>
        {/if}
  {/each}
</Select>
Parameters
<!-- <TypedInput bind:node prop="content" typeProp="contentType" bind:types={contentTypes} /> -->
<!-- {#if parameterList.length > 0} -->
{#if Object.keys(node.parameters).length > 0}
  <EditableList bind:elements={parameterList} let:element={param} let:index sortable=false addButton=false removable=false style="height: 400px;">
      <div>{node.parameters[param]}</div>
      {param} + {param.name} + {node.parameters[param.in + param.name].value} + {node.parameters[param.in + param.name].type}
  <!-- <TypedInput prop={param.in + param.name} label={node.parameters[param.in + param.name].name}
      bind:types={node.parameters[param.in + param.name].allowedTypes}
      bind:type={node.parameters[param.in + param.name].type}
      bind:value={node.parameters[param.in + param.name].value}
      id={param.name.replace(" ", "_") + "_" + index}
    /> -->
    <TypedInput prop={param.in + param.name} label={node.parameters[param.in + param.name].name}
      types={node.parameters[param.in + param.name].allowedTypes}
      type={node.parameters[param.in + param.name].type}
      value={node.parameters[param.in + param.name].value}
      id={param.name.replace(" ", "_") + "_" + index}
      on:change={(e) => {
        console.log("changed", e)
        node.parameters[param.in + param.name].value = e.detail.value
        node.parameters[param.in + param.name].type = e.detail.type
        }
      }
    />
      <!-- <Collapsible icon="cube" label={'collapsible'}>
          <Row>
              <Button icon="edit" label="Set default" on:click={() => alert('hello')}></Button>
              <Button icon="trash" label="Set required" on:click={() => alert('world')}></Button>
              <Button icon="trash" label="Set required" on:click={() => alert('world')}></Button>
          </Row>
      </Collapsible> -->
  </EditableList>
{:else}
  <div style="margin-top: 30px; font-weight: bold;">No parameters found!</div>
{/if}