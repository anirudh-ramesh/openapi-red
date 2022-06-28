<script>
  export let node
  import { Button, Callout, EditableList, Input, Row, TypedInput } from 'svelte-integration-red/components'
  import JsonParamHelper from './JsonParamHelper.svelte'

  node.parameters.forEach(param => param.showDescription = false)

  let showAllDescriptions = false
  const toggleAllShowDescription = () => {
    showAllDescriptions = !showAllDescriptions
    node.parameters.forEach(param => param.showDescription = showAllDescriptions)
    node.parameters = node.parameters
  }
</script>

<style>
  .header { 
    min-width: 70%;
    display: inline-flex;
    justify-content: flex-end;
  }
  :global(#openApi-red-svelte-container .shortParameterLabel) {
    width: 250px;
    min-width: 250px;
  }
  :global(#openApi-red-svelte-container #openApiDescriptionButton button) {
    width: 100px;
  }
</style>

{#if node.api && node.operation}
  {#if node.parameters.length > 0}
    <EditableList label="Parameters" bind:elements={node.parameters} let:element={param} let:index maxHeight="1000" >
      <span slot="header" class="header" >
        <Button inline small id="openApiDescriptionButton" icon={showAllDescriptions ? "eye-slash" : "eye"} label={showAllDescriptions ? "hide description" : "show description"} on:click={toggleAllShowDescription}/>
      </span>
      <span slot="tableHeader" class="tableHeader">
        <Row>
          <span style="width: 255px;">Name <b>(*=required)</b></span>
          <span>Value</span>
        </Row>
      </span>
      <Row>
        <Input inline type="checkbox" label={param.required ? param.name + '*' : param.name} value={param.isActive} disabled={param.required} clazz={param.required ? "shortParameterLabel required" : "shortParameterLabel"}
          on:change={e => node.parameters[index].isActive = e.detail.value}
        />
        <TypedInput inline types={param.allowedTypes} type={param.type} value={param.value} id={param.id} disabled={!param.isActive} 
          on:change={(e) => {
              node.parameters[index].value = e.detail.value
              node.parameters[index].type = e.detail.type
          }}
        />
        <Button inline small icon={node.parameters[index].showDescription ? "eye-slash" : "eye"} on:click={() => node.parameters[index].showDescription = !node.parameters[index].showDescription}/>
      </Row>
      {#if param.showDescription}
        <Callout type="info" small>{param.description}</Callout>
      {/if}

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
