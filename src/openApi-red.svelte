<script context='module'>
  RED.nodes.registerType('openApi-red', {
     category: 'network',
     color: '#b197ff',
     defaults: {
        name: 			    { value: '',  label: 'Name', placeholder: 'openApi-red', icon: 'tag' },
        openApiUrl:     { value: '',  label: 'URL', icon: 'globe', validate: function(v) { return (v && !this?.internalErrors?.readUrl) }},
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
        devMode: { value: false, label: 'Development Mode', icon: 'at' },
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
    update(this)
    this.outputs = ('other output' === this.errorHandling) ? 2 : 1
   },
   oneditcancel: function() {
     revert(this)
   }
 })
</script>
 
<script>
  export let node
  import { Callout, Input, TabbedPane, TabContent } from 'svelte-integration-red/components'
  import { createApi, getRequestContentTypes, getResponseContentTypes, createParameters, createOperationDescription } from './utils/htmlFunctions.js'
  import GeneralOptions from './components/GeneralOptions.svelte'
  import ApiOptions from './components/ApiOptions.svelte'
  import Parameters from './components/Parameters.svelte'

  import { createBackwardCompatible } from './utils/utils.js'

  let data = {
    openApiSpec: {
      apiList: {},
      servers: []  
    },
    error: '',
    operationDescription: '',
    prevOperation: node.operation ? node.operation.toString() : '',
    contentTypes: {
      request: [],
      response: []
    },
    oldParameters: {},
    init: true
  }

  createBackwardCompatible(node)
  node.internalErrors.readUrl = true

  // let init = true
  if (node.openApiUrl.toString().trim()) {
    createApi(node, data).then(() => {
      node = node
      data = data
    })
  }

  let tabs = { "general": "General", "advanced": "Advanced" }

  const initContentType = (type) => {
    if (!data.contentTypes[type].length) {
      node[type + 'ContentType'] = ''
    } else if (!data.contentTypes[type].includes(node[type + 'ContentType'])) {
      node[type + 'ContentType'] = data.contentTypes[type][0]
    }
  }

   // create content type selection and parameter list
  $: if (Object.keys(data.openApiSpec.apiList || {}).length && node.operation) {
    data.operationDescription = createOperationDescription(data.openApiSpec.apiList, node)
    // set valid content Types if operation is set
    const operationSchema = data.openApiSpec.apiList?.[node.api]?.[node.operation]
    data.contentTypes.request = getRequestContentTypes(operationSchema)
    initContentType('request')
    
    data.contentTypes.response = getResponseContentTypes(operationSchema)
    initContentType('response')

    // clear parameters if operation has changed
    if (data.prevOperation !== node.operation) {
      node.parameters.splice(0, node.parameters.length)      
      data.prevOperation = node.operation
      node.operationData = data.openApiSpec.apiList?.[node.api]?.[node.operation] || {}
      createParameters(node, data.oldParameters)
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
    color: var(--red-ui-text-color-success);
  }
</style>

{#if data.error}
  <Callout type="error">
    <span slot="header">Error</span>
    {data.error}
  </Callout>
{/if}

<TabbedPane bind:tabs>
	<TabContent tab="general">
    <GeneralOptions bind:node bind:data />
    <ApiOptions bind:node bind:data/>
    {#if !data.error }
      <Parameters bind:node />
    {/if}
  </TabContent>
  <TabContent tab="advanced">
    <Input bind:node prop="keepAuth" labelBeforeCheckbox={true}/>
    {#if node.keepAuth}
      <Callout type="info" small>
        msg.openApiToken and msg.headers will not be deleted and can be seen by other nodes in the flow.
      </Callout>
    {/if}
    <Input bind:node prop="devMode" labelBeforeCheckbox={true}/>
    {#if node.devMode}
      <Callout type="warning">
        <span slot="header">Warning!</span>
        <p>Dev mode is experimental!</p>
        <p>Allows to make otherwise rejected calls like when using self signed or expired certificates.</p>
      </Callout>
    {/if}
  </TabContent>
</TabbedPane>
