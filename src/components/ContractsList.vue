<template>
  <div class="q-pa-md">
    <!-- Upload Button -->
    <q-btn
      color="primary"
      icon="cloud_upload"
      label="Upload Contract"
      @click="triggerFileInput"
      class="q-mb-md"
    />
    <input
      type="file"
      ref="fileInput"
      @change="uploadContract"
      style="display: none"
      accept=".pdf,.docx,.doc"
    />

    <!-- Progress Bar -->
    <q-linear-progress
      v-if="loading"
      indeterminate
      color="primary"
      class="q-my-sm"
    />

    <!-- Contracts Table -->
    <q-table
      title="Stored Contracts"
      :rows="contracts"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :pagination="{ rowsPerPage: 10 }"
      wrap-cells
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" auto-width>
          <q-btn
            icon="visibility"
            color="info"
            flat
            dense
            @click="viewContract(props.row)"
            class="q-mr-xs"
          />
          <q-btn
            icon="delete"
            color="negative"
            flat
            dense
            @click="confirmDelete(props.row.id)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- View Dialog -->
    <q-dialog v-model="viewDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">{{ currentContract.filename }}</div>
        </q-card-section>

        <q-card-section>
          <div>Uploaded: {{ formatDate(currentContract.upload_date) }}</div>
          <div>File size: {{ formatFileSize(currentContract.size) }}</div>
          <div v-if="currentContract.download_url">
            <q-btn
              label="Download"
              icon="cloud_download"
              :href="currentContract.download_url"
              target="_blank"
              flat
              color="primary"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'
import { Notify } from 'quasar'
import { useAuthStore } from 'stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    const contracts = ref([])
    const loading = ref(false)
    const fileInput = ref(null)
    const viewDialog = ref(false)
    const currentContract = ref({})

    const columns = [
      { name: 'id', label: 'ID', field: 'id', align: 'left' },
      { name: 'filename', label: 'Filename', field: 'filename', align: 'left' },
      { name: 'upload_date', label: 'Upload Date', field: 'upload_date', align: 'left' },
      { name: 'actions', label: 'Actions', align: 'center' }
    ]

    const triggerFileInput = () => {
      fileInput.value.click()
    }

    const uploadContract = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      if (contracts.value.some(c => c.filename === file.name)) {
        Notify.create({
          type: 'negative',
          message: `File '${file.name}' already exists`
        })
        event.target.value = ''
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        loading.value = true
        await api.post('/api/upload-contract/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${auth.token}`
          }
        })

        Notify.create({
          type: 'positive',
          message: 'Contract uploaded successfully'
        })
        await fetchContracts()
      } catch (error) {
        console.error('Upload error:', error)
        let errorMessage = 'Upload failed'
        if (error.response) {
          if (error.response.status === 401) {
            auth.logout()
            errorMessage = 'Session expired. Please login again.'
          } else if (error.response.data?.detail) {
            errorMessage = error.response.data.detail
          }
        }
        Notify.create({
          type: 'negative',
          message: errorMessage
        })
      } finally {
        loading.value = false
        event.target.value = ''
      }
    }

    const fetchContracts = async () => {
      try {
        loading.value = true
        const { data } = await api.get('/api/contracts/', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        })
        contracts.value = data.map(contract => ({
          ...contract,
          upload_date: new Date(contract.upload_date).toLocaleString(),
          download_url: `/api/contracts/${contract.id}/download`
        }))
      } catch (error) {
        console.error('Fetch error:', error)
        if (error.response?.status === 401) {
          auth.logout()
          Notify.create({
            type: 'negative',
            message: 'Session expired. Please login again.'
          })
        } else {
          Notify.create({
            type: 'negative',
            message: 'Failed to load contracts',
            caption: error.message
          })
        }
      } finally {
        loading.value = false
      }
    }

    const viewContract = (contract) => {
      currentContract.value = contract
      viewDialog.value = true
    }

    const confirmDelete = async (id) => {
      Notify.create({
        type: 'info',
        message: 'Are you sure you want to delete this contract?',
        actions: [
          { label: 'Cancel', color: 'white', handler: () => {} },
          {
            label: 'Delete',
            color: 'yellow',
            handler: async () => {
              try {
                loading.value = true
                await api.delete(`/api/contracts/${id}/`, {
                  headers: {
                    'Authorization': `Bearer ${auth.token}`
                  }
                })
                Notify.create({
                  type: 'positive',
                  message: 'Contract deleted successfully'
                })
                await fetchContracts()
              } catch (error) {
                console.error('Delete error:', error)
                if (error.response?.status === 401) {
                  auth.logout()
                  Notify.create({
                    type: 'negative',
                    message: 'Session expired. Please login again.'
                  })
                } else {
                  Notify.create({
                    type: 'negative',
                    message: 'Delete failed',
                    caption: error.response?.data?.detail || error.message
                  })
                }
              } finally {
                loading.value = false
              }
            }
          }
        ]
      })
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString()
    }

    const formatFileSize = (bytes) => {
      if (!bytes) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i])
    }

    onMounted(() => {
      if (auth.isAuthenticated) {
        fetchContracts()
      }
    })

    return {
      contracts,
      loading,
      columns,
      fileInput,
      viewDialog,
      currentContract,
      triggerFileInput,
      uploadContract,
      viewContract,
      confirmDelete,
      formatDate,
      formatFileSize
    }
  }
}
</script>

<style scoped>
/* Keep your existing styles */
</style>

<style scoped>
.q-table {
  height: calc(100vh - 180px);
}
</style>
