<script context="module">
  RED.nodes.registerType("openApi-red", {
     category: "network",
     color: "#b197ff",
     defaults: {
       name: 			{ value: "",  label: "Name" },
       openApiUrl: { value: "",  label: "URL" },
       api:        { value: "",  label: "API tag" },
       operation:  { value: "",  label: "Operation"},
       operationData: {value: {}},
       errorHandling: {value: "",label: "Error handling"},
       parameters: { value: [],  label: "Parameters"},
       contentType: {value: "",  label: "Content Type"},
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
     
     update(this)
   },
   oneditcancel: function() {
     revert(this)
   }
 })
 </script>
 
 <script>
 export let node
 import { Input, TypedInput, Select, EditableList, Collapsible, Row, Button } from "svelte-integration-red/components"
 import { getApiList, getAllowedTypes, getCorrectType, setJsonKeys, sortKeys} from "./utils/htmlFunctions"
 
 let apiList = {}
 let error = ""
 let apis = []
 let operations = {}
 let operationDescription = "-"
 let prevOperation
 if (node.operation) prevOperation = node.operation.toString()
 let contentTypes = []
 let hideJsonKeys = true
 
 const createApi = async () => {
  try {
    error = ""
    apiList = await getApiList(node.openApiUrl)
    // if a string was returned it is a node error
    if (typeof apiList === "string") {
      // setError(node, apiList, error)
      apis = []
      operations = {}
      contentTypes = []
      error = apiList
    } else {
      apis = Object.keys(apiList)
    }
  } catch (e) {
    setError(e)
  }
}
if (node.openApiUrl.toString().trim()) createApi()
 
const setError = (message) => {
  apis = []
  operations = {}
  contentTypes = []
  error = message
  return
}
 // set valid operations if api is set
 $: if (node.api && apiList?.[node.api]) {
    operations = apiList[node.api]
    node.operation = node.operation
 } else {
    operations = {}
 }
 
 // create content type selection and parameter list
 $: if (node.operation) {
  operationDescription = "-"
  if (apiList?.[node.api]?.[node.operation]?.description) {
    operationDescription = apiList[node.api][node.operation].description
  }
  // set valid content Types if operation is set
  if (apiList?.[node.api]?.[node.operation]?.requestBody?.content) {
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
    //  node.parameters = []
    console.log(1, node.parameters)
    node.parameters.splice(0, node.parameters.length)
    console.log(2, node.parameters)
      
    prevOperation = node.operation
    let operationData = apiList[node.api][node.operation]
    // openApi 3 new body style with selection // Warning: Experimental
    if (!operationData.parameters && operationData?.requestBody?.content) {
      let content = operationData.requestBody.content
      let keys = sortKeys(content[node.contentType].schema)
      if (content[node.contentType]) {
        node.parameters.push({
          name: "Request body",
          in: "",
          schema:  content[node.contentType].schema,
          value: "{}",
          required: operationData?.requestBody?.required || false,
          type: "json",
          allowedTypes: getAllowedTypes("json"),
          keys
        })
      }
    } else {
      operationData.parameters.forEach(param => {
      let keys = sortKeys(param.schema)       
        node.parameters.push(
          {
            name: param.name,
            in: param.in,
            required: param.required,
            value: "",
            isActive: param.required || false,
            type: getCorrectType(param), // selected type
            allowedTypes: getAllowedTypes(getCorrectType(param)),
            description: param.description,
            schema: param.schema,
            keys
          }
        )
      })
    }
    node.parameters = node.parameters
   }
 }

 const errorHandlingOptions = ["Standard", "other output", "throw exception"]
 $: if (node.errorHandling) {
   if ("other output" === node.errorHandling) node.outputs = 2
   else node.outputs = 1
 }
 </script>
 
 <style>
  :global(.required, .required label) {
      color: red; font-weight: bold!important;
	}
  :global(.urlInput label) {
    width: 104px;
  }
  .jsonKeys {
    display: none;
  }
   
 </style>
 <Input bind:node prop="name" placeholder="openApi-red" />
  <Input bind:node prop="openApiUrl"/>
  <div style="margin:0 0 12px 104px;">
    <Button icon="edit" label="read" on:click={createApi}></Button>
  </div>
 <Select bind:node prop="errorHandling" >
   {#each errorHandlingOptions as eOption}
     <option value={eOption}>{eOption}</option>
   {/each}
 </Select>
 <div class="nodeError">{error}</div>
 <hr>
 <Select bind:node prop="api" >
     <option value=""></option>
   {#each apis as api}
         {#if node.api === api} 
             <option value={api} selected>{api}</option>
         {:else}
             <option value={api}>{api}</option>
         {/if}
   {/each}
 </Select>
 <div>
  <Select bind:node prop="operation" inline>
      <option value=""></option>
      {#each Object.entries(operations) as [key]}
          {#if node.operation === operations[key].operationId}
              <option value={operations[key].operationId} selected>{operations[key].summary}</option>
      {:else}
          <option value={operations[key].operationId}>{operations[key].summary}</option>
      {/if}
    {/each}
  </Select> 
  {#if {operationDescription} }
    <div style="display: flex; margin-bottom:12px;">
      <div style="min-width: 104px;">Description:</div>
      <div style="widht: 70%">{operationDescription}</div>
    </div>
  {/if}
 </div>
 
 <Select bind:node prop="contentType">
   {#each contentTypes as contentType}
         {#if node.contentType === contentType}
             <option value={contentType} selected>{contentType}</option>
         {:else}
             <option value={contentType}>{contentType}</option>
         {/if}
   {/each}
 </Select>
 Parameters <span style="font-size: 10px;">(bold & red = required parameters)</span>
 {#if node.parameters.length > 0} 
  <EditableList bind:elements={node.parameters} let:element={param} let:index style="height: 400px;">
     <div class:required={param.required} style="display:flex; margin-top: -21px; margin-bottom: -10px" > <!-- workaround because SIR creates a checkbox with a huge fix margin-top -->
        <div style="min-width: 104px;">
          <Input type="checkbox" label={param.name} value={param.isActive} disabled={param.required} on:change={e => node.parameters[index].isActive = e.detail.value}/>
        </div>
      <div style="margin-left: 10px; margin-top: 21px;"> <!-- workaround css styling-->
        {param.description}
      </div>
    </div>
    <TypedInput label={"Value"} types={param.allowedTypes} type={param.type} value={param.value} id={param.name+param.in} disabled={param.isActive}
      on:change={(e) => {
        node.parameters[index].value = e.detail.value
        node.parameters[index].type = e.detail.type
      }
    }
    />
    <!-- Json Object additional information and helper buttons-->
    {#if param.schema}
      <div style="margin-left: 104px;">
        <Collapsible icon="sticky-note" label={"json parameters"}>
          <Row>
            <Button icon="show" label="Show keys" on:click={() => hideJsonKeys = !hideJsonKeys}></Button>
            <Button icon="edit" label="Set default" on:click={() => setJsonKeys(param, "default")}></Button>
            <Button icon="edit" label="Set required" on:click={() => setJsonKeys(param, "required")}></Button>
          </Row>  
          <div class:jsonKeys={hideJsonKeys}>
            <!-- {#if param.schema.properties}
              {#each Object.entries(param.schema.properties) as [propKey, prop] (propKey) } -->
            {#if param.schema && param.keys}
              {#each param.keys as propKey}
                <ul>
                  <li>
                    <div class:required={param.schema.required && param.schema.required.find(reqParam => reqParam === propKey)}>
                        {propKey}: {param.schema.properties[propKey].type}
                    </div>
                    {#if param.schema.properties[propKey].description}<div>Description: {param.schema.properties[propKey].description}</div>{/if}
                    {#if param.schema.properties[propKey].example}<div>Example: {param.schema.properties[propKey].example}</div>{/if}
                    {#if param.schema.properties[propKey].type === "object"} 
                      <ul>
                        {#each Object.entries(param.schema.properties[propKey].properties) as [pKey, p] (pKey) }
                        <li>
                          {pKey} - {p.type}
                        </li>
                        {/each}
                      </ul>
                    {:else if param.schema.properties[propKey].type === "array" && param.schema.properties[propKey]?.items?.type}
                      <div>
                        containing: {param.schema.properties[propKey].items.type}
                        <ul>
                          {#if param.schema.properties[propKey].items.type === "object" && param.schema.properties[propKey].items.properties}
                            {#each Object.entries(param.schema.properties[propKey].items.properties) as [pKey, p] (pKey) }
                              <li>
                                {pKey} - {p.type}
                              </li>
                            {/each}
                          {/if}
                        </ul>
                      </div>              
                    {/if}
                  </li>
                </ul>
              {/each}
            {:else} No properties defined.
            {/if}
          </div>
      </Collapsible>
      </div>
    {/if}
  </EditableList>  
 {:else}
   <div style="margin-top: 30px; font-weight: bold;">No parameters found!</div>
 {/if}
 