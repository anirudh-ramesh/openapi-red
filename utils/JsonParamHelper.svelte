<script>
import { Collapsible, Row, Button } from "svelte-integration-red/components"
import { setJsonKeys} from "./htmlFunctions"

export let param

let hideJsonKeys = true
</script>

<style>
    .jsonObjectKeyList {
        margin-bottom: 0px;
        margin-left: 2px;
    }
    .jsonKeys {
        display: none;
    }
</style>

<Collapsible icon="sticky-note" label={"json parameters"}>
    <Row>
      <Button icon="show" label="Show keys" on:click={() => hideJsonKeys = !hideJsonKeys}></Button>
      <Button icon="edit" label="Set default" on:click={() => setJsonKeys(param, "default")}></Button>
      <Button icon="edit" label="Set required" on:click={() => setJsonKeys(param, "required")}></Button>
    </Row>  
    <div class:jsonKeys={hideJsonKeys}>
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
               {'{'}  
               <ul>
                 {#each Object.entries(param.schema.properties[propKey].properties) as [pKey, p] (pKey) }
                   <p class="jsonObjectKeyList">{pKey}: {p.type}</p>
                 {/each}
               </ul>
               {'}'}
             {:else if param.schema.properties[propKey].type === "array" && param.schema.properties[propKey]?.items?.type}
               <div>
                 Containing: {param.schema.properties[propKey].items.type}
                 <ul>
                   {#if param.schema.properties[propKey].items.type === "object" && param.schema.properties[propKey]?.items?.properties}
                   {'{'}    
                   {#each Object.entries(param.schema.properties[propKey].items.properties) as [pKey, p] (pKey) } 
                     <p class="jsonObjectKeyList">{pKey}: {p.type}</p>
                   {/each}
                   {'}'}
                 {/if}
                 </ul>
               </div>              
             {/if}
           </li>
         </ul>
       {/each}
     {:else} 
       No properties defined.
     {/if}
   </div>
</Collapsible>