<script context="module">
 RED.nodes.registerType('openApi-red', {
    category: 'network',
    color: '#b197ff',
    defaults: {
      name: 			{ value: '',  label: 'Name' },
      openApiUrl: { value: '',  label: 'URL' },
      api:        { value: '',  label: 'API tag' },
      operation:  { value: '',  label: 'Operation'},
      operationData: {value: {}},
      errorHandling: {value: '',label: 'Error handling'},
      parameters: { value: [],  label: 'Parameters'},
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
import { getApiList} from './utils/htmlFunctions'

let apiList = {}
let error = ''
let apis = []
let operations = {}
let prevOperation
if (node.operation) prevOperation = node.operation.toString()
let contentTypes = []

const getCorrectType = (param) => {
  let type = param?.schema?.type || param.type
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

// set valid operations if api is set
$: if (node.api && apiList?.[node.api]) {
   operations = apiList[node.api]
   node.operation = node.operation
} else {
	 operations = {}
}

// create content type selection and parameter list
$: if (node.operation) {
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

  // clear parameters if operation has changed
  if (prevOperation !== node.operation) {
    console.log(prevOperation, node.operation)
    node.parameters.length = 0
    prevOperation = node.operation.toString()

    let operationData = apiList[node.api][node.operation]
    console.log("apiList", apiList)
    console.log("node", node)
    // openApi 3 new body style with selection // Warning: Experimental
    if (!operationData.parameters && operationData?.requestBody?.content) {
      let requestBodies = operationData.requestBody.content
      if (requestBodies[node.contentType]) {
        node.parameters.push({
          name: "Request body",
          in: "",
          schema:  requestBodies[node.contentType].schema,
          value: "{}",
          required: operationData?.requestBody?.required || false,
          type: 'json',
          allowedTypes: getAllowedTypes('json')
        })
      }
    } else {
      // create object in node.parameters (if it doesn't exists)
      operationData.parameters.forEach(param => {
        console.log("param", param)
        node.parameters.push(
          {
            name: param.name,
            in: param.in,
            required: param.required,
            value: '',
            isActive: param.required || false,
            type: getCorrectType(param), // selected type
            allowedTypes: getAllowedTypes(getCorrectType(param))
          }
        )
      })
    }   
  }
  console.log("node.param:", node.parameters)
}

const setError = (message) => {
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
<!-- ask cg somehow add (param.in + param.name) -->
{#if node.parameters.length > 0} 
  <EditableList bind:elements={node.parameters} let:element={param} let:index style="height: 400px;">
    {param.name} + {param.value} + {param.type} + {index}
    <TypedInput
      label={param.name}
      types={param.allowedTypes}
      type={param.type}
      value={param.value}
      on:change={(e) => {
        console.log("changed", e)
        node.parameters[index].value = e.detail.value
        node.parameters[index].type = e.detail.type
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