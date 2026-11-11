<template>
  <q-page class="q-pa-md bg-grey-2">
    <!-- HEADER -->
    <div class="row items-center q-mb-md">
      <div class="col-12 col-md-7">
        <div class="text-h5 text-weight-bold">Dashboard — Mis graderías</div>
        <div class="text-caption text-grey-7">
          Resumen de capacidad, estado y ocupación.
        </div>
      </div>
      <div class="col-12 col-md-5">
        <div class="row items-center justify-end q-col-gutter-sm">
          <div class="col-12 col-sm-7">
            <q-input v-model="filter" dense outlined debounce="250" label="Buscar gradería..." clearable>
              <template #prepend><q-icon name="search"/></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-5">
            <q-btn
              class="full-width"
              color="primary"
              icon="refresh"
              no-caps
              :loading="loading"
              label="Recargar"
              @click="load()"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="row items-center">
            <q-avatar size="42px" color="primary" text-color="white" icon="stadium"/>
            <div class="q-ml-md">
              <div class="text-caption text-grey-7">Graderías</div>
              <div class="text-h6 text-weight-bold">{{ kpis.total }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="row items-center">
            <q-avatar size="42px" color="positive" text-color="white" icon="check_circle"/>
            <div class="q-ml-md">
              <div class="text-caption text-grey-7">Activas</div>
              <div class="text-h6 text-weight-bold">{{ kpis.activas }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="row items-center">
            <q-avatar size="42px" color="grey-8" text-color="white" icon="grid_on"/>
            <div class="q-ml-md">
              <div class="text-caption text-grey-7">Capacidad total</div>
              <div class="text-h6 text-weight-bold">{{ fmtInt(kpis.capacidadTotal) }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="row items-center">
            <q-avatar size="42px" color="warning" text-color="white" icon="local_activity"/>
            <div class="q-ml-md">
              <div class="text-caption text-grey-7">Ocupados (aprox)</div>
              <div class="text-h6 text-weight-bold">{{ fmtInt(kpis.ocupadosAprox) }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- CHARTS -->
    <div class="row q-col-gutter-md q-mt-md">
      <!-- Donut -->
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle1 text-weight-bold">Estado de graderías</div>
            <q-space />
            <q-badge outline color="primary">{{ kpis.total }} total</q-badge>
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pa-sm">
            <apexchart
              type="donut"
              height="280"
              :options="donutOptions"
              :series="donutSeries"
            />
            <div class="text-caption text-grey-7 q-mt-sm">
              Activas vs Inactivas según el campo <b>activo</b>.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Capacidad por gradería -->
      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle1 text-weight-bold">Capacidad por gradería</div>
            <q-space />
            <q-chip dense outline icon="bar_chart" color="primary">Top {{ topN }}</q-chip>
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pa-sm">
            <apexchart
              type="bar"
              height="280"
              :options="capOptions"
              :series="capSeries"
            />
            <div class="text-caption text-grey-7 q-mt-sm">
              Usa <b>capacidad_total</b> (si está vacío, se calcula filas × columnas).
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- STACKED: estados de asientos (si hay detalle) -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle1 text-weight-bold">Estados de asientos (top)</div>
            <q-space />
            <q-btn
              dense
              flat
              icon="insights"
              no-caps
              label="Recalcular estados"
              :loading="loadingEstados"
              @click="loadEstadosAsientos()"
            />
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-sm">
            <q-banner v-if="estadosHint" dense class="bg-grey-1 q-mb-sm">
              <div class="text-caption text-grey-7">
                {{ estadosHint }}
              </div>
            </q-banner>

            <apexchart
              type="bar"
              height="320"
              :options="estadoOptions"
              :series="estadoSeries"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- TABLE -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle1 text-weight-bold">Listado</div>
            <q-space />
            <q-chip dense outline icon="info" color="grey-8">
              Click en “Ver” para administrar asientos
            </q-chip>
          </q-card-section>
          <q-separator />

          <q-table
            flat
            bordered
            dense
            :rows="rowsFiltered"
            :columns="columns"
            row-key="id"
            :pagination="{ rowsPerPage: 10 }"
          >
            <template #body-cell_activo="props">
              <q-td :props="props">
                <q-chip dense :color="props.row.activo ? 'positive' : 'grey-7'" text-color="white">
                  {{ props.row.activo ? 'ACTIVO' : 'INACTIVO' }}
                </q-chip>
              </q-td>
            </template>

            <template #body-cell_capacidad="props">
              <q-td :props="props" class="text-right">
                {{ fmtInt(capacidadDe(props.row)) }}
              </q-td>
            </template>

            <template #body-cell_acciones="props">
              <q-td :props="props" class="text-right">
                <q-btn
                  dense
                  no-caps
                  color="primary"
                  icon="event_seat"
                  label="Ver"
                  @click="goVenta(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

  </q-page>
</template>

<script>
export default {
  name: 'IndexPage',

  data () {
    return {
      loading: false,
      loadingEstados: false,
      filter: '',

      topN: 8,

      graderias: [],

      // estadosHint: texto informativo si no hay endpoint de detalle / etc
      estadosHint: 'Se calcula consultando /mis-graderias/{id}/venta (uno por gradería). Si tienes muchas graderías, puedes optimizar con un endpoint agregado.',

      columns: [
        { name: 'nombre', label: 'Gradería', field: 'nombre', align: 'left', sortable: true },
        { name: 'direccion', label: 'Dirección', field: 'direccion', align: 'left', sortable: true },
        { name: 'filas', label: 'Filas', field: 'filas', align: 'center', sortable: true },
        { name: 'columnas', label: 'Cols', field: 'columnas', align: 'center', sortable: true },
        { name: 'capacidad', label: 'Capacidad', field: row => row.capacidad_total, align: 'right', sortable: true },
        { name: 'activo', label: 'Estado', field: 'activo', align: 'left', sortable: true },
        { name: 'acciones', label: '', field: 'id', align: 'right' }
      ],

      // CHART STATES (se llenan en computed)
      estadosTopLabels: [],
      estadosTopCounts: {
        libre: [],
        reservado: [],
        pagado: [],
        bloqueado: []
      }
    }
  },

  computed: {
    rowsFiltered () {
      const f = (this.filter || '').trim().toUpperCase()
      if (!f) return this.graderias
      return this.graderias.filter(g =>
        (g.nombre || '').toUpperCase().includes(f) ||
        (g.direccion || '').toUpperCase().includes(f) ||
        (g.codigo || '').toUpperCase().includes(f)
      )
    },

    kpis () {
      const total = this.graderias.length
      const activas = this.graderias.filter(x => !!x.activo).length

      let capacidadTotal = 0
      for (const g of this.graderias) capacidadTotal += this.capacidadDe(g)

      // aprox = reservado + pagado + bloqueado (si ya calculamos estadosTopCounts sumamos top)
      // como no tenemos endpoint agregado, dejamos estimación parcial basada en lo que se cargó
      let ocupadosAprox = 0
      ocupadosAprox += (this.estadosTopCounts.reservado || []).reduce((a, b) => a + (Number(b) || 0), 0)
      ocupadosAprox += (this.estadosTopCounts.pagado || []).reduce((a, b) => a + (Number(b) || 0), 0)
      ocupadosAprox += (this.estadosTopCounts.bloqueado || []).reduce((a, b) => a + (Number(b) || 0), 0)

      return { total, activas, capacidadTotal, ocupadosAprox }
    },

    donutSeries () {
      const activas = this.kpis.activas
      const inactivas = this.kpis.total - activas
      return [activas, inactivas]
    },

    donutOptions () {
      return {
        labels: ['Activas', 'Inactivas'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true },
        stroke: { show: false },
        plotOptions: { pie: { donut: { size: '72%' } } }
      }
    },

    capSeries () {
      return [{
        name: 'Capacidad',
        data: this.topCapacidad().map(x => x.capacidad)
      }]
    },

    capOptions () {
      return {
        chart: { toolbar: { show: false } },
        xaxis: { categories: this.topCapacidad().map(x => x.nombre) },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (v) => this.fmtInt(v) } }
      }
    },

    estadoSeries () {
      return [
        { name: 'LIBRE', data: this.estadosTopCounts.libre || [] },
        { name: 'RESERVADO', data: this.estadosTopCounts.reservado || [] },
        { name: 'PAGADO', data: this.estadosTopCounts.pagado || [] },
        { name: 'BLOQUEADO', data: this.estadosTopCounts.bloqueado || [] }
      ]
    },

    estadoOptions () {
      return {
        chart: { stacked: true, toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        xaxis: { categories: this.estadosTopLabels || [] },
        dataLabels: { enabled: false },
        legend: { position: 'bottom' },
        tooltip: { y: { formatter: (v) => this.fmtInt(v) } }
      }
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    async load () {
      this.loading = true
      try {
        // Tu ruta: GET mis-graderias
        const { data } = await this.$axios.get('mis-graderias')
        // Asumimos que devuelve array o {data:[]}
        const arr = Array.isArray(data) ? data : (data.data || [])
        this.graderias = arr

        // calcula estados top automáticamente (opcional)
        await this.loadEstadosAsientos()
      } catch (e) {
        this.$alert?.error?.(e.response?.data?.message || 'No se pudo cargar graderías')
      } finally {
        this.loading = false
      }
    },

    capacidadDe (g) {
      // si existe capacidad_total úsala, si no calcula filas*columnas
      const ct = Number(g?.capacidad_total || 0)
      if (ct > 0) return ct
      const filas = Number(g?.filas || 0)
      const cols = Number(g?.columnas || 0)
      return Math.max(0, filas * cols)
    },

    topCapacidad () {
      // top N por capacidad (filtrado)
      const base = (this.rowsFiltered || []).map(g => ({
        id: g.id,
        nombre: g.nombre || `#${g.id}`,
        capacidad: this.capacidadDe(g)
      }))

      base.sort((a, b) => b.capacidad - a.capacidad)
      return base.slice(0, this.topN)
    },

    fmtInt (n) {
      const x = Number(n || 0)
      return x.toLocaleString('es-BO')
    },

    goVenta (g) {
      // Ajusta a tu ruta real
      this.$router.push(`/mis-graderias/${g.id}/venta`)
    },

    async loadEstadosAsientos () {
      // Esto hace N requests (topN) a /mis-graderias/{id}/venta para contar estados
      // Es simple y funcional. Si quieres pro, creamos endpoint agregado en backend.
      const top = this.topCapacidad()
      if (!top.length) return

      this.loadingEstados = true
      try {
        const labels = []
        const libre = []
        const reservado = []
        const pagado = []
        const bloqueado = []

        for (const g of top) {
          labels.push(g.nombre)

          try {
            const { data } = await this.$axios.get(`mis-graderias/${g.id}/venta`)

            // tu venta() devuelve { graderia, asientos, total }
            const asientos = data.asientos || []
            const counts = { LIBRE: 0, RESERVADO: 0, PAGADO: 0, BLOQUEADO: 0 }

            for (const a of asientos) {
              const st = String(a.estado || 'LIBRE').toUpperCase()
              if (counts[st] !== undefined) counts[st]++
            }

            libre.push(counts.LIBRE)
            reservado.push(counts.RESERVADO)
            pagado.push(counts.PAGADO)
            bloqueado.push(counts.BLOQUEADO)
          } catch (inner) {
            // si falla una gradería, no rompe todo
            libre.push(0); reservado.push(0); pagado.push(0); bloqueado.push(0)
          }
        }

        this.estadosTopLabels = labels
        this.estadosTopCounts = { libre, reservado, pagado, bloqueado }
      } finally {
        this.loadingEstados = false
      }
    }
  }
}
</script>
