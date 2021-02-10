<script context="module">
 RED.nodes.registerType('openApi-red', {
    category: 'network',
    color: '#b197ff',
    defaults: {
      test: { value: '', label: 'Test'},
      name: 			{ value: '',  label: 'Name' },
      openApiUrl: { value: '',  label: 'URL' },
      api:        { value: '',  label: 'API tag' },
      operation:  { value: 'application/json',  label: 'Operation'},
      operationData: {value: {}},
      errorHandling: {value: '',label: 'Error handling'},
      parameters: { value: {},  label: 'Parameters',
    //    validate: function(v) { 
    //     const isValid = true
    //     for (const parameter in this.parameters) {
    //       const param = this.parameters[parameter]
    //       if (param.required && param.value.toString() === '') isValid = false
    //     }
    //     return isValid
    //   }
      },
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
import ConfigNodeInput from 'svelte-integration-red/components/ConfigNodeInput.svelte'
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
  parameterList = operationData.parameters
  // openApi 3 new body style with selection // Warning: Experimental
  if (!parameterList && operationData?.requestBody?.content) {
    let requestBodies = operationData.requestBody.content
    if (requestBodies[node.contentType]) {
      parameterList = [{
      name: "Request body",
      in: "",
      schema:  requestBodies[node.contentType].schema,
      required: operationData.requestBody.required || false,
      inputType: 'json',
      type: 'json'
      }]
    }
  }
  if (undefined === parameterList) {
    parameterList = []
  } else {
    // create object in node.parameters (if it doesn't exists)
    parameterList.forEach(param => {
      if (!node.parameters?.[param.in + param.name]) {
        node.parameters[param.in + param.name] = {
          name: param.name,
          in: param.in,
          required: param.required,
          value: 'hello world',
          isActive: param.required || false,
          inputType: 'str',
          type: 'str'
        }
      }
    })
  }
  console.log("pL: ", parameterList)
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
<TypedInput bind:node prop="test" typeProp="testTypeProp" types={boolInputTypes} />
<!-- <TypedInput bind:node prop="content" typeProp="contentType" bind:types={contentTypes} /> -->
{#if parameterList.length > 0}
  <EditableList bind:elements={parameterList} let:element={currentParameter} let:index sortable=false addButton=true removable=false style="height: 400px;">
      {currentParameter.name} + {node.parameters[currentParameter.in + currentParameter.name].value}
  <TypedInput prop={currentParameter.in + currentParameter.name} label={node.parameters[currentParameter.in + currentParameter.name].name}
      type={node.parameters[currentParameter.in + currentParameter.name].inputType}
      types={boolInputTypes}
      value={node.parameters[currentParameter.in + currentParameter.name].value}
      id={currentParameter.name + "_" + index}
      on:change={(e) => {
        node.parameters[currentParameter.in + currentParameter.name].value = e.detail.value
        node.parameters[currentParameter.in + currentParameter.name].inputType = e.detail.type
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