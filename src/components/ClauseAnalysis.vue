<template>
  <div class="clause-analysis">
    <div class="row q-col-gutter-md q-mb-md">
      <!-- Toggle Between Upload and Database Selection -->
      <div class="col-12">
        <q-option-group
          v-model="doc1Source"
          :options="[
            { label: 'Upload Original Document', value: 'upload' },
            { label: 'Select from Database', value: 'database' }
          ]"
          type="radio"
          inline
        />
      </div>

      <!-- Original Document: Upload or Select from DB -->
      <div class="col">
        <q-file
          v-if="doc1Source === 'upload'"
          v-model="file1"
          label="Upload First Document"
          accept=".pdf,.docx,.txt"
          outlined
          clearable
          :rules="[val => !!val || 'File is required']"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="attach_file" />
          </template>
        </q-file>

        <q-select
          v-if="doc1Source === 'database'"
          v-model="selectedDbDoc1"
          :options="dbDocuments"
          label="Select Original Document from Database"
          outlined
          emit-value
          map-options
          :rules="[val => !!val || 'Document selection is required']"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="folder" />
          </template>
        </q-select>
      </div>

      <!-- Second Document Upload -->
      <div class="col">
        <q-file
          v-model="file2"
          label="Upload Second Document"
          accept=".pdf,.docx,.txt"
          outlined
          clearable
          :rules="[val => !!val || 'File is required']"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="attach_file" />
          </template>
        </q-file>
      </div>
    </div>

    <div class="row q-mb-md">
      <q-select
        v-model="selectedQuestion"
        :options="questionsShort"
        label="Select a legal question to analyze"
        outlined
        class="col"
        :rules="[val => !!val || 'Question is required']"
        lazy-rules
        emit-value
        map-options
        option-label="label"
        option-value="value"
      >
        <template v-slot:prepend>
          <q-icon name="help_outline" />
        </template>
      </q-select>
    </div>

    <div class="row justify-center q-mb-md">
      <q-btn
        color="primary"
        icon="search"
        label="Analyze Both Documents"
        :disable="isAnalyzeDisabled"
        :loading="analyzing"
        @click="analyzeDocuments"
        class="q-px-xl"
      />
    </div>

    <div v-if="analysisResult" class="analysis-results">
      <div class="row q-col-gutter-md">
        <div class="col">
          <q-card>
            <q-card-section class="bg-primary text-white">
              <div class="text-h6">First Document Analysis</div>
            </q-card-section>
            <q-card-section>
              <q-chip
                color="green-1"
                text-color="dark"
                class="full-width q-pa-md"
              >
                {{ analysisResult.doc1_answer || 'No relevant clause found' }}
              </q-chip>
            </q-card-section>
          </q-card>
        </div>
        <div class="col">
          <q-card>
            <q-card-section class="bg-primary text-white">
              <div class="text-h6">Second Document Analysis</div>
            </q-card-section>
            <q-card-section>
              <q-chip
                color="green-1"
                text-color="dark"
                class="full-width q-pa-md"
              >
                {{ analysisResult.doc2_answer || 'No relevant clause found' }}
              </q-chip>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'

export default {
  name: 'ClauseAnalysis',
  setup() {
    const $q = useQuasar()
    const file1 = ref(null)
    const file2 = ref(null)
    const doc1Source = ref('upload')
    const selectedDbDoc1 = ref(null)
    const dbDocuments = ref([])
    const questions = ref([])
    const questionsShort = ref([])
    const selectedQuestion = ref(null)
    const analyzing = ref(false)
    const analysisResult = ref(null)

    const fetchQuestions = async () => {
      try {
        const response = await api.get('/questions/')
        questions.value = response.data.questions
        questionsShort.value = response.data.questions_short.map((q, i) => ({
          label: q,
          value: response.data.questions[i]
        }))
      } catch {
        $q.notify({
          type: 'negative',
          message: 'Failed to load questions'
        })
      }
    }

    const fetchDbDocuments = async () => {
      try {
        const response = await api.get('/documents/')
        dbDocuments.value = response.data.map(doc => ({
          label: doc.name,
          value: doc.id
        }))
      } catch {
        $q.notify({
          type: 'negative',
          message: 'Failed to load documents from database'
        })
      }
    }

    const isAnalyzeDisabled = computed(() => {
      const file1Valid = doc1Source.value === 'upload' ? !!file1.value : !!selectedDbDoc1.value
      return !file1Valid || !file2.value || !selectedQuestion.value
    })

    const analyzeDocuments = async () => {
      analyzing.value = true
      try {
        const formData = new FormData()
        formData.append('question', selectedQuestion.value)

        if (doc1Source.value === 'upload') {
          formData.append('file1', file1.value)
        } else {
          formData.append('db_doc1_id', selectedDbDoc1.value)
        }

        formData.append('file2', file2.value)

        const response = await api.post('/analyze/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        analysisResult.value = response.data
      } catch {
        $q.notify({
          type: 'negative',
          message: 'Failed to analyze documents'
        })
        analysisResult.value = null
      } finally {
        analyzing.value = false
      }
    }

    onMounted(() => {
      fetchQuestions()
      fetchDbDocuments()
    })

    return {
      file1,
      file2,
      doc1Source,
      selectedDbDoc1,
      dbDocuments,
      questions,
      questionsShort,
      selectedQuestion,
      analyzing,
      analysisResult,
      analyzeDocuments,
      isAnalyzeDisabled
    }
  }
}
</script>
