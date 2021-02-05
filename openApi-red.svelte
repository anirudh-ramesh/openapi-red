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
      parameters: { value: [],  label: 'Parameters',
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
    let node = this  
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
$: error = ''
let apis = []
let operations = {}
let contentTypes = {}
let parameters = [{name: "hello", value: "vorbelegt"}]


const createApi = async () => {
  try {
    error = ''
    apiList = await getApiList(node.openApiUrl)
    // if a string was returned it is a node error
    if (typeof apiList === 'string') {
      // setError(node, apiList, error)
      apis = ['']
      operations = {}
      contentTypes = {}
      error = apiList
    } else {
      apis = Object.keys(apiList)
      
    }
  } catch (eMsg) {
    setError(node, eMsg, error)
  }
  error = error  
}
createApi()
node.api = node.api
node.operation = node.operation
node.contentType = node.contentType

console.log("afterFirstCreate", node.operation)
// todo: place saved options!!

// set valid operations if api is set
$: if (node.api && apiList?.[node.api]) {
    console.log('sdfasdfasdfasdfsaddsfaasdffds')
   operations = apiList[node.api]
   node.operation = node.operation
} else {
	 operations = {}
}
// set valid content Types if operation is set
 $: if (node.operation && apiList?.[node.api]?.[node.operation]?.requestBody?.content) {
  contentTypes = Object.keys(apiList[node.api][node.operation].requestBody.content)
  node.contentType = node.contentType
 } else {
  contentTypes = ["application/json","application/x-www-form-urlencoded","multipart/form-data"]
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
        {#if node.operation === operations[key].operationId}  -->
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
<EditableList bind:elements={parameters} let:element={currentParameter} sortable=false style="height: 400px;">
    <Collapsible icon="cube" label={'collapsible'}><Input bind:parameters prop="yyy" placeholder="xxxxx" />
        <Row>
            <Button icon="edit" label="Set default" on:click={() => alert('hello')}></Button>
            <Button icon="trash" label="Set required" on:click={() => alert('world')}></Button>
            <Button icon="trash" label="Set required" on:click={() => alert('world')}></Button>
        </Row>
    </Collapsible>
</EditableList>