<script>
  export let node, data
  import { Button, Callout, Collapsible, Group, Input, Row, Select } from 'svelte-integration-red/components'
  import { createApi } from '../utils/htmlFunctions.js'
  
  const errorHandlingOptions = ['Standard', 'other output', 'throw exception']
  const getApiFromUrl = () => {
    createApi(node, data).then(() => {
      node = node
      data = data
    })
  }

</script>

<Collapsible label="General" indented={false}>
  <Group clazz="paddingBottom">
    <Input bind:node prop="name"/>
    <Row>
      <Input bind:node prop="openApiUrl" inline on:change={() => node.internalErrors.readUrl = true}/>
      <Button icon={node.internalErrors.readUrl ?  "edit" : "check-square"} clazz={node.internalErrors.readUrl ? "" :  "success"} label={node.internalErrors.readUrl ? "read" : "ok"} on:click={getApiFromUrl} inline disabled={!node.internalErrors.readUrl}/>      
    </Row>
    {#if data.openApiSpec.servers?.length > 1}
      <div style="margin-left: 113px; margin-bottom: 12px;">
        {#if node.alternServer}
        <Callout type="warning" closeable>
          <span slot="header">Alternative Server is an experimental Feature!</span>
          Setting an alternative server was not tested in a practical environment, but should work. If not, please make a bug report!
        </Callout>
        {/if}
      </div>
      <Row>
        <Select inline bind:node prop="server"  disabled={!node.alternServer}>
          {#each data.openApiSpec.servers as s}
            {#if s.description}
              <option disabled>{s.description}</option>
            {/if}
            <option value={s.url}>{s.url}</option>
            <option disabled>-------------------------</option>
          {/each}
        </Select>
        <Input bind:node prop="alternServer" inline />
      </Row>
      
    {/if}
    <Select bind:node prop="errorHandling" icon="warning" >
      {#each errorHandlingOptions as eOption}
        <option value={eOption}>{eOption}</option>
      {/each}
    </Select>
  </Group>
</Collapsible>