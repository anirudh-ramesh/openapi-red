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
      parameters: { value: {},  label: 'Parameters', validate: function(v) { 
        const isValid = true
        for (const parameter in this.parameters) {
          const param = this.parameters[parameter]
          if (param.required && param.value.toString() === '') isValid = false
        }
        return isValid
      }},
      contentType: {value: '',  label: 'Content Type'},
      outputs: {value: 1}
    },
    inputs:1,
    outputs:1,
    icon: "white-globe.png",
    label: function() {
        if (this.name) return this.name
        else if (this.operationData.name) return this.operationData.name
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
import { Input, TypedInput, Select, EditableList, Row, Button } from 'svelte-integration-red/components'
import { getApiList, objectHasValues, createOperationSelector} from './utils/htmlFunctions'

let apiList = {}
$: error = ''
let apis = []
let operations = {}
let contentTypes = {}

const createApi = async () => {
  try {
    error = ''
    apiList = await getApiList(node.openApiUrl)
    // if a string was returned it is a node error
    if (typeof apiList === 'string') {
      // setError(node, apiList, error)
      apis = []
      operations = []
      contentTypes = []
      error = apiList
    } else {
      apis = Object.keys(apiList)
    }
    console.log('n',node)
  } catch (eMsg) {
    setError(node, eMsg, error)
  }
  error = error  
}
createApi()
console.log("afterFirstCreate", node.operation)
// todo: place saved options!!

// set valid operations if api is set
$: if (node.api && apiList?.[node.api]) {
   operations = apiList[node.api]
} else {
	 operations = {}
}
// set valid content Types if operation is set
let disableContentTypes = false
 $: if (node.operation && apiList?.[node.api]?.[node.operation]?.requestBody?.content) {
  contentTypes = Object.keys(apiList[node.api][node.operation].requestBody.content)
  disableContentTypes = false
 } else {
  contentTypes = []
  disableContentTypes = true
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
	{#each apis as api}
    <option value={api}>{api}</option>
  {/each}
</Select>
<Select bind:node prop="operation" >
  {#each Object.entries(operations) as [key]}
    <option value={operations[key].operationId}>{operations[key].summary}</option>
  {/each}
</Select>
<Select bind:node prop="contentType" disabled={disableContentTypes}>
	{#each contentTypes as contentType}
    <option value={contentType}>{contentType}</option>
  {/each}
</Select>
