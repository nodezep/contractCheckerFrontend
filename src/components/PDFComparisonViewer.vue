<template>
  <div class="pdf-comparison-viewer">
    <div class="toolbar">
      <q-btn icon="chevron_left" @click="prevDifference" :disable="!hasDifferences || currentDiffIndex <= 0" />
      <span class="diff-counter" v-if="hasDifferences">
        Difference {{ currentDiffIndex + 1 }} of {{ totalDifferences }}
      </span>
      <q-btn icon="chevron_right" @click="nextDifference" :disable="!hasDifferences || currentDiffIndex >= totalDifferences - 1" />

      <q-select
        v-model="zoomLevel"
        :options="zoomOptions"
        label="Zoom"
        dense
        class="zoom-select"
      />
    </div>

    <div class="comparison-container" ref="comparisonContainer">
      <div class="document-view" :style="{ zoom: zoomLevel.value }">
        <div class="document-page" v-for="page in file1Pages" :key="'file1-'+page.page_number">
          <div class="page-header">Original - Page {{ page.page_number }}</div>
          <img :src="getPageImageUrl(1, page.page_number)" class="page-image" />
          <div
            class="diff-highlight"
            v-for="(diff, idx) in getDiffsForPage(1, page.page_number)"
            :key="'file1-diff-'+idx"
            :style="getHighlightStyle(diff)"
            :title="diff.text"
          ></div>
        </div>
      </div>

      <div class="document-view" :style="{ zoom: zoomLevel.value }">
        <div class="document-page" v-for="page in file2Pages" :key="'file2-'+page.page_number">
          <div class="page-header">Modified - Page {{ page.page_number }}</div>
          <img :src="getPageImageUrl(2, page.page_number)" class="page-image" />
          <div
            class="diff-highlight"
            v-for="(diff, idx) in getDiffsForPage(2, page.page_number)"
            :key="'file2-diff-'+idx"
            :style="getHighlightStyle(diff)"
            :title="diff.text"
          ></div>
        </div>
      </div>
    </div>

    <div class="summary-section" v-if="hasDifferences">
      <h3>Summary of Changes</h3>
      <ul>
        <li v-for="(page, idx) in differences.pages_changed" :key="'changed-'+idx">
          Page {{ page.page_number }}: {{ page.changes.length }} changes
        </li>
        <li v-if="differences.pages_added.length">
          Pages added: {{ differences.pages_added.join(', ') }}
        </li>
        <li v-if="differences.pages_removed.length">
          Pages removed: {{ differences.pages_removed.join(', ') }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'

export default {
  props: {
    file1: File,
    file2: File,
    comparisonData: Object
  },

  setup(props) {
    const zoomLevel = ref({ label: '100%', value: '1' })
    const zoomOptions = [
      { label: '50%', value: '0.5' },
      { label: '75%', value: '0.75' },
      { label: '100%', value: '1' },
      { label: '125%', value: '1.25' },
      { label: '150%', value: '1.5' }
    ]

    const currentDiffIndex = ref(0)
    const file1Pages = ref([])
    const file2Pages = ref([])
    const differences = ref({})
    const pageImages = ref({ file1: {}, file2: {} })

    // Load comparison data when component mounts
    onMounted(async () => {
      if (props.comparisonData) {
        differences.value = props.comparisonData.differences
        file1Pages.value = props.comparisonData.file1_pages
        file2Pages.value = props.comparisonData.file2_pages

        // Preload images for the first few pages
        await loadPageImages(1, 1)
        await loadPageImages(2, 1)
      }
    })

    const hasDifferences = computed(() => {
      return differences.value.pages_changed?.length > 0 ||
             differences.value.pages_added?.length > 0 ||
             differences.value.pages_removed?.length > 0
    })

    const totalDifferences = computed(() => {
      if (!hasDifferences.value) return 0
      let count = 0
      differences.value.pages_changed?.forEach(page => {
        count += page.changes.length
      })
      return count +
             differences.value.pages_added?.length +
             differences.value.pages_removed?.length
    })

    const allDiffs = computed(() => {
      if (!hasDifferences.value) return []

      const diffs = []

      // Changed pages
      differences.value.pages_changed?.forEach(page => {
        page.changes.forEach(change => {
          diffs.push({
            ...change,
            page_number: page.page_number
          })
        })
      })

      // Added pages
      differences.value.pages_added?.forEach(page_num => {
        diffs.push({
          type: 'page_added',
          page_number: page_num
        })
      })

      // Removed pages
      differences.value.pages_removed?.forEach(page_num => {
        diffs.push({
          type: 'page_removed',
          page_number: page_num
        })
      })

      return diffs
    })

    function getDiffsForPage(fileNum, pageNum) {
      if (!hasDifferences.value) return []

      if (fileNum === 1) {
        // For original file, show removed content
        const pageChanges = differences.value.pages_changed?.find(
          p => p.page_number === pageNum
        )
        return pageChanges?.changes?.filter(c => c.type === 'removed') || []
      } else {
        // For modified file, show added content
        const pageChanges = differences.value.pages_changed?.find(
          p => p.page_number === pageNum
        )
        return pageChanges?.changes?.filter(c => c.type === 'added') || []
      }
    }

    function getHighlightStyle(diff) {
      const baseStyle = {
        position: 'absolute',
        backgroundColor: diff.type === 'added' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)',
        border: diff.type === 'added' ? '1px solid #00ff00' : '1px solid #ff0000',
        pointerEvents: 'none'
      }

      if (diff.position) {
        return {
          ...baseStyle,
          left: `${diff.position[0]}px`,
          top: `${diff.position[1]}px`,
          width: `${diff.position[2] - diff.position[0]}px`,
          height: `${diff.position[3] - diff.position[1]}px`
        }
      }
      return baseStyle
    }

    async function getPageImageUrl(fileNum, pageNum) {
      const fileKey = `file${fileNum}`
      if (!pageImages.value[fileKey][pageNum]) {
        await loadPageImages(fileNum, pageNum)
      }
      return pageImages.value[fileKey][pageNum]
    }

    async function loadPageImages(fileNum, pageNum) {
      const file = fileNum === 1 ? props.file1 : props.file2
      const fileKey = `file${fileNum}`

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await api.post(
          `/render-page/?page_number=${pageNum}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )

        // Create object URL from blob
        const blob = await response.blob()
        pageImages.value[fileKey][pageNum] = URL.createObjectURL(blob)
      } catch (error) {
        console.error(`Error loading page ${pageNum} image:`, error)
      }
    }

    function nextDifference() {
      if (currentDiffIndex.value < totalDifferences.value - 1) {
        currentDiffIndex.value++
        scrollToDifference()
      }
    }

    function prevDifference() {
      if (currentDiffIndex.value > 0) {
        currentDiffIndex.value--
        scrollToDifference()
      }
    }

    function scrollToDifference() {
      const diff = allDiffs.value[currentDiffIndex.value]
      if (!diff) return

      // Find the page container and scroll to it
      const container = document.querySelector('.comparison-container')
      const pageElement = document.querySelector(
        `.document-page:nth-child(${diff.page_number})`
      )

      if (container && pageElement) {
        container.scrollTo({
          top: pageElement.offsetTop - 50,
          behavior: 'smooth'
        })
      }
    }

    return {
      zoomLevel,
      zoomOptions,
      currentDiffIndex,
      file1Pages,
      file2Pages,
      differences,
      hasDifferences,
      totalDifferences,
      getDiffsForPage,
      getHighlightStyle,
      getPageImageUrl,
      nextDifference,
      prevDifference
    }
  }
}
</script>

<style scoped>
.pdf-comparison-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.diff-counter {
  margin: 0 10px;
}

.comparison-container {
  display: flex;
  overflow: auto;
  flex-grow: 1;
  background: #f0f0f0;
}

.document-view {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-width: 50%;
  position: relative;
}

.document-page {
  margin-bottom: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
}

.page-header {
  padding: 8px;
  background: #eee;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
}

.page-image {
  max-width: 100%;
  display: block;
}

.diff-highlight {
  position: absolute;
  z-index: 10;
}

.summary-section {
  padding: 15px;
  background: #f9f9f9;
  border-top: 1px solid #ddd;
}

.zoom-select {
  width: 120px;
  margin-left: auto;
}
</style>