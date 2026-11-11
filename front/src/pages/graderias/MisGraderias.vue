<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center">
        <div>
          <div class="text-h6 text-title">Mis Graderías</div>
          <div class="text-caption text-grey-7">Gestión de graderías del usuario</div>
        </div>
        <q-space />
        <q-input v-model="filter" label="Buscar" dense outlined debounce="300" style="width: 280px">
          <template v-slot:append><q-icon name="search" /></template>
        </q-input>
      </q-card-section>
    </q-card>

    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      dense
      flat
      bordered
      wrap-cells
      :filter="filter"
      :rows-per-page-options="[0]"
      loading-label="Cargando..."
      no-data-label="Sin registros"
      :loading="loading"
    >
      <template v-slot:top-right>
        <q-btn
          color="positive"
          label="Crear nueva gradería"
          no-caps
          icon="add_circle_outline"
          class="q-mr-sm"
          @click="$router.push('/mis-graderias/nueva')"
        />
        <q-btn
          color="primary"
          label="Actualizar"
          no-caps
          icon="refresh"
          :loading="loading"
          @click="getData"
        />
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn-dropdown label="Opciones" no-caps size="10px" dense color="primary">
            <q-list>

              <q-item clickable v-close-popup @click="$router.push(`/mis-graderias/${props.row.id}/venta`)">
                <q-item-section avatar><q-icon name="confirmation_number" /></q-item-section>
                <q-item-section><q-item-label>Venta / Asientos</q-item-label></q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup @click="editRow(props.row)">
                <q-item-section avatar><q-icon name="edit" /></q-item-section>
                <q-item-section><q-item-label>Editar</q-item-label></q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup @click="deleteRow(props.row.id)">
                <q-item-section avatar><q-icon name="delete" /></q-item-section>
                <q-item-section><q-item-label>Eliminar</q-item-label></q-item-section>
              </q-item>

            </q-list>
          </q-btn-dropdown>

        </q-td>
      </template>

      <template v-slot:body-cell_layout="props">
        <q-td :props="props">
          <q-badge outline color="primary" class="q-mr-xs">
            {{ props.row.filas }} x {{ props.row.columnas }}
          </q-badge>
          <q-badge outline color="grey-7">
            Total: {{ props.row.capacidad_total }}
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell_activo="props">
        <q-td :props="props">
          <q-badge :color="props.row.activo ? 'positive' : 'grey-6'">
            {{ props.row.activo ? 'Activo' : 'Inactivo' }}
          </q-badge>
        </q-td>
      </template>

    </q-table>
  </q-page>
</template>

<script>
export default {
  name: 'MisGraderias',
  data () {
    return {
      loading: false,
      filter: '',
      rows: [],
      columns: [
        { name: 'actions', label: 'Acciones', align: 'center' },
        { name: 'nombre', label: 'Nombre', align: 'left', field: 'nombre' },
        { name: 'direccion', label: 'Dirección', align: 'left', field: 'direccion' },
        { name: 'layout', label: 'Layout', align: 'left', field: row => `${row.filas}x${row.columnas}` },
        { name: 'activo', label: 'Estado', align: 'left', field: 'activo' }
      ]
    }
  },
  mounted () {
    this.getData()
  },
  methods: {
    getData () {
      this.loading = true
      this.$axios.get('mis-graderias')
        .then(r => { this.rows = r.data })
        .catch(e => this.$alert.error(e.response?.data?.message || 'Error cargando graderías'))
        .finally(() => { this.loading = false })
    },

    editRow (row) {
      this.$router.push(`/mis-graderias/${row.id}`)
    },

    deleteRow (id) {
      this.loading = true
      this.$axios.delete(`mis-graderias/${id}`)
        .then(() => {
          this.$alert.success('Gradería eliminada')
          this.getData()
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo eliminar'))
        .finally(() => { this.loading = false })
    }
  }
}
</script>
