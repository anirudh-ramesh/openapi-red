<script>
  export let node, data
  import { Button, Callout, Collapsible, Group, Row, Select } from 'svelte-integration-red/components'
</script>

<Collapsible label="Api options" indented={false}>
  <Group clazz="paddingBottom">
    <Select bind:node prop="api" icon="tag" on:change={() => node.operation = ""}>
      <option value=""></option>
        { #each Object.keys(data.openApiSpec.apiList || {}) as api}
          {#if node.api === api} 
            <option value={api} selected>{api}</option>
          {:else}
            <option value={api}>{api}</option>
          {/if}
        {/each}
    </Select>
    <Row>
      <Select inline bind:node prop="operation" icon="wrench">
        <option value=""></option>
        {#each Object.values(data.openApiSpec?.apiList?.[node.api] || {}) as operation}
          <option value={operation.operationId} selected={node.operation === operation.operationId}>{operation.summary}</option>
        {/each}
      </Select>
      {#if data.operationDescription && !node.showDescription}
        <Button inline label="show description" icon="eye" on:click={() => node.showDescription = !node.showDescription}/>
      {/if}
    </Row>
    
    {#if data.operationDescription}
    <!-- <div style="margin-bottom: 12px;"> -->
      <Callout type="info" closeable bind:show={node.showDescription} fading={!data.init}>
        <!-- <span slot="header">Description</span> -->
        {@html data.operationDescription}
      </Callout>
    <!-- </div> -->
    {/if}
    
    <Select clazz="noLongLabel" bind:node prop="requestContentType">
      {#each data.contentTypes.request as reqCT}
        <option value={reqCT} selected={node.requestContentType === reqCT}>{reqCT}</option>
      {/each}
    </Select>
    {#if data.contentTypes.response.length }
      <Select clazz="noLongLabel" bind:node prop="responseContentType" fading={!data.init} >
        {#each data.contentTypes.response as resCT}
          <option value={resCT} selected={node.responseContentType === resCT}>{resCT}</option>
        {/each}
      </Select>
    {/if}
  </Group>
</Collapsible>