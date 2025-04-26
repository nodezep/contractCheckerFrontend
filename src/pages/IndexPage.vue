<template>
  <q-page class="q-pa-md">
    <q-tabs
      v-model="tab"
      align="justify"
      narrow-indicator
      class="bg-primary text-white"
    >
      <q-tab name="contracts" icon="list_alt" label="Contracts" />
      <q-tab name="comparison" icon="compare" label="Comparison" />
      <q-tab name="analysis" icon="insights" label="Analysis" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="tab" animated>
      <!-- Contracts Tab -->
      <q-tab-panel name="contracts">
        <contracts-list />
      </q-tab-panel>

      <!-- Comparison Tab -->
      <q-tab-panel name="comparison">
        <document-comparison />
      </q-tab-panel>

      <!-- Analysis Tab -->
      <q-tab-panel name="analysis">
        <clause-analysis />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import ContractsList from 'components/ContractsList.vue'
import DocumentComparison from 'components/DocumentComparison.vue'
import ClauseAnalysis from 'components/ClauseAnalysis.vue'

export default {
  name: 'IndexPage',
  components: {
    ContractsList,
    DocumentComparison,
    ClauseAnalysis
  },
  setup() {
    return {
      tab: ref('contracts')
    }
  }
}
</script>