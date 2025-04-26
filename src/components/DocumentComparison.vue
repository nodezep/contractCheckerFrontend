<template>
  <div class="document-comparison">
    <div class="row justify-center q-mb-md">
      <q-btn-toggle
        v-model="comparisonMode"
        toggle-color="primary"
        color="primary"
        text-color="white"
        :options="[
          { label: 'Database vs Upload', value: 'db-upload' },
          { label: 'Upload vs Upload', value: 'upload-upload' }
        ]"
        unelevated
        rounded
      />
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <!-- Original Document -->
      <div class="col-12 col-md-6">
        <div class="text-subtitle1 q-mb-sm">Original Document</div>

        <q-select
          v-if="comparisonMode === 'db-upload'"
          v-model="selectedContract1"
          :options="contractOptions"
          label="Select from database"
          option-label="name"
          option-value="id"
          clearable
          emit-value
          map-options
          class="q-mb-sm"
          @update:model-value="handleContract1Select"
        >
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey">
                No contracts available
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <q-file
          v-if="comparisonMode === 'upload-upload'"
          v-model="file1"
          label="Upload file"
          accept=".pdf,.docx,.txt"
          outlined
          @update:model-value="handleFile1Upload"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="attach_file" />
          </template>
        </q-file>

        <div v-if="selectedContract1 && comparisonMode === 'db-upload'" class="q-mt-sm text-caption text-grey">
          Selected: {{ contract1Name }} ({{ formatFileSize(contract1Size) }})
        </div>
        <div v-if="file1" class="q-mt-sm text-caption text-grey">
          File selected: {{ file1.name }} ({{ formatFileSize(file1.size) }})
        </div>

        <!-- Document preview for original -->
        <div v-if="previewOriginal" class="q-mt-md">
          <div class="text-subtitle2 q-mb-xs">Original Preview</div>
          <iframe
            v-if="previewOriginalUrl"
            :src="previewOriginalUrl"
            class="preview-iframe"
            frameborder="0"
          ></iframe>
          <div v-else class="text-caption text-grey">
            Preview not available
          </div>
        </div>
      </div>

      <!-- Modified Document -->
      <div class="col-12 col-md-6">
        <div class="text-subtitle1 q-mb-sm">Modified Document</div>
        <q-file
          v-model="file2"
          label="Upload file"
          accept=".pdf,.docx,.txt"
          outlined
          @update:model-value="handleFile2Upload"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="attach_file" />
          </template>
        </q-file>
        <div v-if="file2" class="q-mt-sm text-caption text-grey">
          File selected: {{ file2.name }} ({{ formatFileSize(file2.size) }})
        </div>

        <!-- Document preview for modified -->
        <div v-if="previewModified" class="q-mt-md">
          <div class="text-subtitle2 q-mb-xs">Modified Preview</div>
          <iframe
            v-if="previewModifiedUrl"
            :src="previewModifiedUrl"
            class="preview-iframe"
            frameborder="0"
          ></iframe>
          <div v-else class="text-caption text-grey">
            Preview not available
          </div>
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-6">
        <q-checkbox v-model="previewOriginal" label="Show original preview" />
      </div>
      <div class="col-12 col-md-6">
        <q-checkbox v-model="previewModified" label="Show modified preview" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-6">
        <q-select
          v-model="pageRange"
          label="Page range"
          :options="pageRangeOptions"
          outlined
          clearable
        />
      </div>
      <div class="col-12 col-md-6">
        <q-select
          v-model="diffAlgorithm"
          label="Comparison algorithm"
          :options="algorithmOptions"
          outlined
        />
      </div>
    </div>

    <div class="row justify-center q-mb-md">
      <q-btn
        color="primary"
        icon="compare"
        label="Compare Documents"
        :disable="!hasComparisonSources"
        :loading="loading"
        @click="compareDocuments"
        class="q-px-xl"
      />
    </div>

    <div v-if="comparisonResult" class="comparison-results">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <q-badge color="primary" class="q-mr-sm text-h6">
            Similarity: {{ similarityScore.toFixed(2) }}%
          </q-badge>
          <q-badge color="orange" class="q-mr-sm text-h6">
            Changes: {{ changeCount }}
          </q-badge>
          <q-badge color="red" class="q-mr-sm text-h6">
            Deletions: {{ deletionCount }}
          </q-badge>
          <q-badge color="green" class="q-mr-sm text-h6">
            Additions: {{ additionCount }}
          </q-badge>
          <q-icon
            v-if="similarityScore < 80"
            name="warning"
            color="warning"
            size="sm"
            class="q-mr-xs"
          />
          <span v-if="similarityScore < 80" class="text-warning text-caption">
            Significant differences detected
          </span>
        </div>
        <div>
          <q-btn
            color="grey"
            icon="history"
            label="Save Comparison"
            @click="saveComparison"
            v-if="!savedComparison"
            class="q-mr-sm"
          />
          <q-btn
            color="grey"
            icon="picture_as_pdf"
            label="Export PDF"
            @click="exportToPDF"
            class="q-mr-sm"
          />
          <q-btn
            color="grey"
            icon="refresh"
            label="Reset"
            @click="resetComparison"
          />
        </div>
      </div>

      <div class="row q-mb-md">
        <div class="col">
          <q-toggle v-model="sideBySideView" label="Side-by-side view" />
          <q-toggle v-model="showInlineDiffs" label="Show inline differences" />
          <q-toggle v-model="highlightChanges" label="Highlight changes" />
        </div>
      </div>

      <div class="diff-viewer-container">
        <div v-if="sideBySideView" class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="text-subtitle2 text-center q-mb-sm">Original Document</div>
            <div class="diff-viewer-original q-pa-md">
              <div v-html="comparisonResult.original_content"></div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="text-subtitle2 text-center q-mb-sm">Modified Document</div>
            <div class="diff-viewer-modified q-pa-md">
              <div v-html="comparisonResult.modified_content"></div>
            </div>
          </div>
        </div>

        <div v-else class="diff-viewer q-pa-md">
          <div v-html="comparisonResult.highlighted_diff"></div>
        </div>
      </div>

      <div class="row justify-center q-mt-md">
        <q-pagination
          v-if="comparisonResult.total_pages > 1"
          v-model="currentPage"
          :max="comparisonResult.total_pages"
          direction-links
          boundary-links
          @update:model-value="loadPage"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'

export default {
  name: 'DocumentComparison',
  setup() {
    const $q = useQuasar()
    const file1 = ref(null)
    const file2 = ref(null)
    const loading = ref(false)
    const comparisonResult = ref(null)
    const contracts = ref([])
    const selectedContract1 = ref(null)
    const comparisonMode = ref('db-upload')
    const savedComparison = ref(false)
    const previewOriginal = ref(false)
    const previewModified = ref(false)
    const previewOriginalUrl = ref(null)
    const previewModifiedUrl = ref(null)
    const sideBySideView = ref(false)
    const showInlineDiffs = ref(true)
    const highlightChanges = ref(true)
    const pageRange = ref(null)
    const diffAlgorithm = ref('word')
    const currentPage = ref(1)

    const pageRangeOptions = [
      { label: 'All pages', value: 'all' },
      { label: 'First page only', value: 'first' },
      { label: 'Last page only', value: 'last' },
      { label: 'Pages 1-5', value: '1-5' },
      { label: 'Custom range...', value: 'custom' }
    ]

    const algorithmOptions = [
      { label: 'Word-level', value: 'word' },
      { label: 'Character-level', value: 'char' },
      { label: 'Line-level', value: 'line' },
      { label: 'Semantic', value: 'semantic' }
    ]

    const contractOptions = computed(() => {
      return contracts.value.map(c => ({
        id: c.id,
        name: c.filename || c.name,
        upload_date: c.upload_date,
        size: c.size
      }))
    })

    const contract1Name = computed(() => {
      if (!selectedContract1.value) return ''
      const contract = contracts.value.find(c => c.id === selectedContract1.value)
      return contract?.filename || ''
    })

    const contract1Size = computed(() => {
      if (!selectedContract1.value) return 0
      const contract = contracts.value.find(c => c.id === selectedContract1.value)
      return contract?.size || 0
    })

    const similarityScore = computed(() => {
      return comparisonResult.value?.similarity_score || 0
    })

    const changeCount = computed(() => {
      return comparisonResult.value?.change_count || 0
    })

    const deletionCount = computed(() => {
      return comparisonResult.value?.deletion_count || 0
    })

    const additionCount = computed(() => {
      return comparisonResult.value?.addition_count || 0
    })

    const hasComparisonSources = computed(() => {
      if (comparisonMode.value === 'db-upload') {
        return selectedContract1.value && file2.value
      } else {
        return file1.value && file2.value
      }
    })

    const fetchContracts = async () => {
      try {
        const { data } = await api.get('/api/contracts/')
        contracts.value = data
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load contracts',
          caption: err.message
        })
      }
    }

    const handleContract1Select = () => {
      file1.value = null
      generatePreviewUrl('original')
    }

    const handleFile1Upload = () => {
      selectedContract1.value = null
      generatePreviewUrl('original')
    }

    const handleFile2Upload = () => {
      generatePreviewUrl('modified')
    }

    const generatePreviewUrl = async (type) => {
      try {
        if (type === 'original') {
          previewOriginalUrl.value = null
          if (comparisonMode.value === 'db-upload' && selectedContract1.value) {
            previewOriginalUrl.value = `/api/documents/${selectedContract1.value}/preview`
          } else if (file1.value) {
            previewOriginalUrl.value = URL.createObjectURL(file1.value)
          }
        } else {
          previewModifiedUrl.value = null
          if (file2.value) {
            previewModifiedUrl.value = URL.createObjectURL(file2.value)
          }
        }
      } catch (error) {
        console.error('Error generating preview:', error)
      }
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const resetComparison = () => {
      file1.value = null
      file2.value = null
      selectedContract1.value = null
      comparisonResult.value = null
      savedComparison.value = false
      previewOriginalUrl.value = null
      previewModifiedUrl.value = null
      currentPage.value = 1
    }

    const compareDocuments = async () => {
      loading.value = true
      try {
        const formData = new FormData()

        if (comparisonMode.value === 'db-upload') {
          formData.append('db_doc1', selectedContract1.value)
        } else {
          formData.append('file1', file1.value)
        }

        formData.append('file2', file2.value)
        formData.append('algorithm', diffAlgorithm.value)
        formData.append('page_range', pageRange.value || 'all')
        formData.append('highlight_changes', highlightChanges.value)
        formData.append('show_inline_diffs', showInlineDiffs.value)

        const { data } = await api.post('/api/compare/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        comparisonResult.value = data
        currentPage.value = 1
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Comparison failed',
          caption: err.response?.data?.detail || err.message
        })
      } finally {
        loading.value = false
      }
    }

    const loadPage = async (page) => {
      try {
        loading.value = true
        const params = {
          page,
          algorithm: diffAlgorithm.value,
          highlight_changes: highlightChanges.value,
          show_inline_diffs: showInlineDiffs.value
        }

        const { data } = await api.get(`/api/comparisons/${comparisonResult.value.id}/page`, {
          params,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        comparisonResult.value = { ...comparisonResult.value, ...data }
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load page',
          caption: error.message
        })
      } finally {
        loading.value = false
      }
    }

    const saveComparison = async () => {
      try {
        loading.value = true
        await api.post('/api/comparisons/', {
          contract1_id: selectedContract1.value,
          contract1_name: contract1Name.value,
          contract2_name: file2.value?.name,
          similarity_score: similarityScore.value,
          change_count: changeCount.value,
          deletion_count: deletionCount.value,
          addition_count: additionCount.value,
          diff_html: comparisonResult.value.highlighted_diff,
          algorithm_used: diffAlgorithm.value
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        $q.notify({
          type: 'positive',
          message: 'Comparison saved successfully'
        })
        savedComparison.value = true
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Failed to save comparison',
          caption: error.message
        })
      } finally {
        loading.value = false
      }
    }

    const exportToPDF = async () => {
      try {
        loading.value = true
        const response = await api.post(
          '/api/comparisons/export-pdf',
          {
            comparison_id: comparisonResult.value.id,
            side_by_side: sideBySideView.value
          },
          {
            responseType: 'blob',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        )

        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `document_comparison_${new Date().toISOString()}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Failed to export PDF',
          caption: error.message
        })
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      fetchContracts()
    })

    return {
      file1,
      file2,
      loading,
      comparisonResult,
      similarityScore,
      changeCount,
      deletionCount,
      additionCount,
      contracts,
      selectedContract1,
      contractOptions,
      contract1Name,
      contract1Size,
      hasComparisonSources,
      comparisonMode,
      savedComparison,
      previewOriginal,
      previewModified,
      previewOriginalUrl,
      previewModifiedUrl,
      sideBySideView,
      showInlineDiffs,
      highlightChanges,
      pageRange,
      pageRangeOptions,
      diffAlgorithm,
      algorithmOptions,
      currentPage,
      compareDocuments,
      resetComparison,
      saveComparison,
      exportToPDF,
      handleContract1Select,
      handleFile1Upload,
      handleFile2Upload,
      loadPage,
      formatFileSize
    }
  }
}
</script>

<style scoped>
.document-comparison {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

.diff-viewer-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  max-height: 70vh;
  overflow-y: auto;
}

.diff-viewer, .diff-viewer-original, .diff-viewer-modified {
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  line-height: 1.6;
}

.preview-iframe {
  width: 100%;
  height: 300px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

/* Diff highlighting styles */
:deep(.diff_add) {
  background-color: #e6ffed;
  color: #22863a;
}

:deep(.diff_sub) {
  background-color: #ffebee;
  color: #cb2431;
  text-decoration: line-through;
}

:deep(.diff_chg) {
  background-color: #fff5b1;
  color: #735c0f;
}

:deep(table.diff) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.diff_header) {
  background-color: #f6f8fa;
  color: #6a737d;
  font-weight: bold;
  padding: 4px 8px;
}

:deep(td.diff_header) {
  width: 2em;
}

:deep(.diff_next) {
  background-color: #f6f8fa;
  width: 2em;
}

:deep(.diff_panel) {
  width: 48%;
}

@media (max-width: 768px) {
  .diff-viewer, .diff-viewer-original, .diff-viewer-modified {
    font-size: 0.8em;
  }

  :deep(table.diff) {
    display: block;
    overflow-x: auto;
  }

  .side-by-side .col-md-6 {
    width: 100%;
  }
}
</style>