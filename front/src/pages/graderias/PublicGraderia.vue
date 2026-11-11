<template>
  <q-page class="q-pa-sm">
    <q-card flat bordered>
      <q-card-section class="row items-center q-py-sm">
        <div>
          <div class="text-subtitle1 text-weight-bold">
            {{ graderia?.nombre || 'Graderias' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ graderia?.direccion || '' }}
            <span v-if="graderia?.user?.telefono_contacto_1 || graderia?.user?.telefono_contacto_2">
              - Contacto:
            {{graderia.user.telefono_contacto_1}}
            {{graderia.user.telefono_contacto_2}}
            </span>
          </div>
        </div>

        <q-space />

        <q-btn
          dense
          no-caps
          color="primary"
          icon="refresh"
          label="Recargar"
          :loading="loading"
          @click="load()"
        />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-sm">
        <div class="row q-col-gutter-xs">
          <div class="col-6 col-md-3">
            <q-banner dense class="bg-grey-1">
              <div class="text-caption text-grey-7">Total asientos</div>
              <div class="text-subtitle1 text-weight-bold">{{ stats.total }}</div>
            </q-banner>
          </div>
          <div class="col-6 col-md-3">
            <q-banner dense class="bg-grey-1">
              <div class="text-caption text-grey-7">Disponibles</div>
              <div class="text-subtitle1 text-weight-bold">{{ stats.libre }}</div>
            </q-banner>
          </div>
          <div class="col-6 col-md-3">
            <q-banner dense class="bg-grey-1">
              <div class="text-caption text-grey-7">Reservados</div>
              <div class="text-subtitle1 text-weight-bold">{{ stats.reservado }}</div>
            </q-banner>
          </div>
          <div class="col-6 col-md-3">
            <q-banner dense class="bg-grey-1">
              <div class="text-caption text-grey-7">Pagados/Bloqueados</div>
              <div class="text-subtitle1 text-weight-bold">{{ stats.ocupado }}</div>
            </q-banner>
          </div>
        </div>

        <div class="row q-col-gutter-xs q-mt-xs">
          <div class="col-12 col-md-3">
            <q-chip dense :color="statusMeta.LIBRE.color" text-color="white" icon="event_seat">
              LIBRE: {{ stats.libre }}
            </q-chip>
          </div>
          <div class="col-12 col-md-3">
            <q-chip dense :color="statusMeta.RESERVADO.color" text-color="white" icon="bookmark">
              RESERVADO: {{ stats.reservado }}
            </q-chip>
          </div>
          <div class="col-12 col-md-3">
            <q-chip dense :color="statusMeta.PAGADO.color" text-color="white" icon="paid">
              PAGADO: {{ stats.pagado }}
            </q-chip>
          </div>
          <div class="col-12 col-md-3">
            <q-chip dense :color="statusMeta.BLOQUEADO.color" text-color="white" icon="block">
              BLOQUEADO: {{ stats.bloqueado }}
            </q-chip>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mt-sm">
      <q-card-section class="row items-center q-py-sm">
        <div class="text-subtitle2 text-weight-bold">Mapa de asientos</div>
        <q-space />
        <q-badge outline color="primary">
          Total {{ stats.total }} asientos
        </q-badge>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-sm">
        <div style="width: 100%; overflow: auto;">
          <table border="1" cellpadding="6" cellspacing="0" width="100%">
            <tbody>
            <tr v-for="(row, rIdx) in gridSeats" :key="rIdx">
              <td
                v-for="seat in row"
                :key="seat.codigo"
                :bgcolor="seatBg(seat)"
                :style="cellStyle(seat)"
              >
                <div class="text-weight-bold">{{ seat.codigo }}</div>
                <div style="font-size: 11px;">
                  {{ statusMeta[seat.status].label }}
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
export default {
  name: 'PublicGraderia',

  data () {
    return {
      loading: false,
      graderia: null,
      asientos: [],
      seatMap: {},
      statusMeta: {
        NO_GENERADO: { label: 'No generado', color: 'grey-7', bg: '#e6e6e6' },
        LIBRE:       { label: 'Libre',       color: 'positive', bg: '#82f38b' },
        RESERVADO:   { label: 'Reservado',   color: 'warning',  bg: '#f3d77d' },
        PAGADO:      { label: 'Pagado',      color: 'primary',  bg: '#79bcee' },
        BLOQUEADO:   { label: 'Bloqueado',   color: 'negative', bg: '#ec7385' }
      }
    }
  },

  computed: {
    code () {
      return this.$route.params.code
    },

    stats () {
      const total = Number(this.graderia?.filas || 0) * Number(this.graderia?.columnas || 0)
      const s = { total, libre: 0, reservado: 0, pagado: 0, bloqueado: 0, ocupado: 0 }

      for (const a of this.asientos) {
        const st = this.normalizeEstado(a.estado) || 'LIBRE'
        if (st === 'LIBRE') s.libre++
        if (st === 'RESERVADO') s.reservado++
        if (st === 'PAGADO') s.pagado++
        if (st === 'BLOQUEADO') s.bloqueado++
      }
      s.ocupado = (s.reservado + s.pagado + s.bloqueado)
      return s
    },

    gridSeats () {
      if (!this.graderia) return []

      const filas = Number(this.graderia.filas || 0)
      const cols  = Number(this.graderia.columnas || 0)
      if (filas <= 0 || cols <= 0) return []

      const rowOrder = this.graderia.start_top ? this.range(1, filas) : this.range(1, filas).reverse()
      const colOrder = this.graderia.start_left ? this.range(1, cols)  : this.range(1, cols).reverse()

      const matrix = []
      for (const r of rowOrder) {
        const line = []
        for (const c of colOrder) {
          const codigo = this.makeCode(r, c)
          const db = this.seatMap[codigo] || null
          const status = db ? (this.normalizeEstado(db.estado) || 'LIBRE') : 'NO_GENERADO'

          line.push({
            codigo,
            status
          })
        }
        matrix.push(line)
      }
      return matrix
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    load () {
      if (!this.code) return
      this.loading = true
      this.$axios.get(`public/graderias/${this.code}`)
        .then(r => {
          const payload = r.data
          this.graderia = payload.graderia
          this.asientos = payload.asientos || []

          const map = {}
          for (const s of this.asientos) {
            map[s.codigo] = s
          }
          this.seatMap = map
        })
        .catch(() => {
          this.$alert?.error?.('No se pudo cargar la graderÃ­a')
        })
        .finally(() => { this.loading = false })
    },

    normalizeEstado (v) {
      if (!v) return ''
      const up = String(v).toUpperCase()
      if (['LIBRE', 'RESERVADO', 'PAGADO', 'BLOQUEADO'].includes(up)) return up
      return ''
    },

    range (a, b) {
      const arr = []
      for (let i = a; i <= b; i++) arr.push(i)
      return arr
    },

    numToLetters (n) {
      let s = ''
      n = Number(n)
      while (n > 0) {
        n--
        s = String.fromCharCode(65 + (n % 26)) + s
        n = Math.floor(n / 26)
      }
      return s
    },

    makeCode (r, c) {
      if (String(this.graderia.etiqueta_modo) === 'fila') {
        return `${this.numToLetters(r)}${c}`
      }
      return `${this.numToLetters(c)}${r}`
    },

    seatBg (seat) {
      return this.statusMeta[seat.status]?.bg || '#ffffff'
    },

    cellStyle () {
      return {
        textAlign: 'center',
        opacity: 1
      }
    }
  }
}
</script>
