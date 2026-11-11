<template>
  <q-page class="q-pa-sm">
    <q-card flat bordered>
      <q-card-section class="row items-center q-py-sm">
        <div>
          <div class="text-subtitle1 text-weight-bold">
            {{ isEdit ? 'Editar Gradería' : 'Nueva Gradería' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ isEdit ? 'Actualiza la gradería' : 'Crea la gradería y genera asientos automáticamente' }}
          </div>
        </div>
        <q-space />
        <q-btn flat icon="arrow_back" label="Volver" no-caps @click="$router.push('/mis-graderias')" />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="save">
          <div class="row q-col-gutter-xs">
            <div class="col-12 col-md-6">
              <q-input v-model="form.nombre" label="Nombre" dense outlined :rules="[req]" />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.direccion" label="Dirección" dense outlined  />
            </div>

            <div class="col-6 col-md-2">
              <q-input v-model.number="form.filas" type="number" label="Filas (X)" dense outlined :rules="[req]" />
            </div>

            <div class="col-6 col-md-2">
              <q-input v-model.number="form.columnas" type="number" label="Columnas (Y)" dense outlined :rules="[req]" />
            </div>

            <div class="col-12 col-md-3">
              <q-select
                v-model="form.etiqueta_modo"
                dense
                outlined
                label="Etiquetado"
                :options="['fila','columna']"
                :rules="[req]"
              />
            </div>

            <div class="col-12 col-md-3">
              <q-select
                v-model="form.activo"
                dense
                outlined
                label="Estado"
                :options="[
                  { label: 'Activo', value: true },
                  { label: 'Inactivo', value: false }
                ]"
                emit-value
                map-options
              />
            </div>

            <div class="col-6 col-md-2">
              <q-toggle v-model="form.start_top" label="Empieza arriba" />
            </div>

            <div class="col-6 col-md-2">
              <q-toggle v-model="form.start_left" label="Empieza izquierda" />
            </div>

            <div class="col-12" v-if="isEdit">
              <q-toggle
                v-model="form.regenerar_asientos"
                label="Regenerar asientos (borra y crea de nuevo)"
                color="negative"
              />

              <!-- ⚠️ ADVERTENCIA GRANDE -->
              <q-banner
                v-if="form.regenerar_asientos"
                class="bg-red-1 text-negative q-mt-sm"
                dense
                rounded
              >
                <div class="text-subtitle1 text-weight-bold">
                  ⚠️ ADVERTENCIA IMPORTANTE
                </div>

                <div class="text-body2 q-mt-xs">
                  Al <b>regenerar los asientos</b>:
                  <ul class="q-mt-xs">
                    <li>❌ Se eliminarán <b>todos los asientos existentes</b></li>
                    <li>❌ Se perderán <b>reservas, pagos y clientes</b></li>
                    <li>✔️ Todos los asientos volverán a estado <b>LIBRE</b></li>
                  </ul>
                  <b>Esta acción no se puede deshacer.</b>
                </div>
              </q-banner>
            </div>

          </div>

          <div class="row justify-end q-gutter-sm q-mt-sm">
            <q-btn
              color="negative"
              label="Cancelar"
              no-caps
              flat
              @click="$router.push('/mis-graderias')"
              :disable="loading"
            />
            <q-btn
              color="primary"
              :label="isEdit ? 'Guardar' : 'Crear gradería'"
              no-caps
              type="submit"
              :loading="loading"
            />
          </div>
        </q-form>

        <q-separator class="q-mt-md q-mb-md" />

        <!-- PREVIEW PRO (BD) -->
        <q-card flat bordered class="q-mt-sm">
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle2 text-weight-bold">Vista previa de asientos</div>

            <q-space />

            <q-badge outline color="primary" class="q-mr-sm">
              Total: {{ totalAsientos }}
            </q-badge>

            <q-btn
              v-if="isEdit"
              dense
              no-caps
              color="primary"
              icon="refresh"
              label="Recargar"
              :loading="loadingSeats"
              @click="loadSeatsPreview()"
              class="q-mr-sm"
            />

            <q-toggle v-model="showPreview" dense label="Mostrar" />
          </q-card-section>

          <q-separator />

          <q-card-section v-if="showPreview" class="q-pa-sm">
            <div class="row items-center q-col-gutter-sm q-mb-sm">
              <div class="col-12 col-md-8">
                <div class="text-caption text-grey-7">
                  Preview limitado a {{ previewRows }} x {{ previewCols }}.
                  Click en un asiento <b>LIBRE</b> para ver info en un diálogo.
                </div>
              </div>

              <div class="col-12 col-md-4">
                <div class="row items-center justify-end q-gutter-xs">
                  <q-chip dense :color="statusMeta.LIBRE.color" text-color="white" icon="event_seat">LIBRE</q-chip>
                  <q-chip dense :color="statusMeta.RESERVADO.color" text-color="white" icon="bookmark">RESERVADO</q-chip>
                  <q-chip dense :color="statusMeta.PAGADO.color" text-color="white" icon="paid">PAGADO</q-chip>
                  <q-chip dense :color="statusMeta.BLOQUEADO.color" text-color="white" icon="block">BLOQUEADO</q-chip>
                </div>
              </div>
            </div>

            <div style="width: 100%; overflow: auto;">
              <table border="1" cellpadding="6" cellspacing="0" width="100%">
                <tbody>
                <tr v-for="(row, rIdx) in previewSeats" :key="rIdx">
                  <td
                    v-for="seat in row"
                    :key="seat.code"
                    :bgcolor="statusMeta[seat.status].bg"
                    @click="openSeatDialog(seat)"
                    style="cursor:pointer; text-align:center;"
                  >
                    <div><b>{{ seat.code }}</b></div>
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

        <!-- DIALOG INFO ASIENTO -->
        <q-dialog v-model="seatDialog.open">
          <q-card style="min-width: 420px; max-width: 92vw;">
            <q-card-section class="row items-center q-py-sm">
              <div>
                <div class="text-subtitle1 text-weight-bold">
                  Asiento: {{ seatDialog.seat?.code }}
                </div>
                <div class="text-caption text-grey-7">
                  Fila: {{ seatDialog.seat?.fila }} — Columna: {{ seatDialog.seat?.columna }}
                </div>
              </div>
              <q-space />
              <q-btn dense flat round icon="close" v-close-popup />
            </q-card-section>

            <q-separator />

            <q-card-section class="q-pt-sm">
              <q-badge
                :color="statusMeta[seatDialog.seatStatus].color"
                text-color="white"
                class="q-mb-md"
              >
                {{ statusMeta[seatDialog.seatStatus].label }}
              </q-badge>

              <q-list bordered separator>
                <q-item>
                  <q-item-section>
                    <q-item-label>Descripción</q-item-label>
                    <q-item-label caption>
                      {{ seatDialog.db?.descripcion || '—' }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="seatDialog.seatStatus !== 'LIBRE'">
                  <q-item-section>
                    <q-item-label>Cliente</q-item-label>
                    <q-item-label caption>
                      {{ seatDialog.db?.cliente_nombre || '—' }} — {{ seatDialog.db?.cliente_celular || '—' }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="seatDialog.seatStatus !== 'LIBRE'">
                  <q-item-section>
                    <q-item-label>Monto</q-item-label>
                    <q-item-label caption>
                      {{ seatDialog.db?.monto ?? '—' }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="seatDialog.db?.reservado_at">
                  <q-item-section>
                    <q-item-label>Reservado</q-item-label>
                    <q-item-label caption>
                      {{ seatDialog.db.reservado_at }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="seatDialog.db?.pagado_at">
                  <q-item-section>
                    <q-item-label>Pagado</q-item-label>
                    <q-item-label caption>
                      {{ seatDialog.db.pagado_at }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="text-caption text-grey-7 q-mt-sm">
                * Este diálogo es solo informativo. La administración se hará en otra pantalla.
              </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
              <q-btn flat no-caps label="Cerrar" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>

      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
export default {
  name: 'GraderiaForm',
  data () {
    return {
      loading: false,
      loadingSeats: false,
      showPreview: true,

      // Mapa real de asientos desde BD: code => asiento(DB)
      seatDBMap: {},

      seatDialog: {
        open: false,
        seat: null,        // {code,r,c,fila,columna,status}
        seatStatus: 'LIBRE',
        db: null           // asiento db completo
      },

      statusMeta: {
        LIBRE:     { label: 'Libre',     color: 'positive', bg: '#82f38b' },
        RESERVADO: { label: 'Reservado', color: 'warning',  bg: '#f3d77d' },
        PAGADO:    { label: 'Pagado',    color: 'primary',  bg: '#79bcee' },
        BLOQUEADO: { label: 'Bloqueado', color: 'negative', bg: '#ec7385' }
      },

      form: {
        nombre: '',
        direccion: '',
        filas: 10,
        columnas: 10,
        etiqueta_modo: 'fila',
        start_top: true,
        start_left: true,
        activo: true,
        regenerar_asientos: false
      }
    }
  },

  computed: {
    isEdit () {
      return !!this.$route.params.id
    },

    totalAsientos () {
      const x = Number(this.form.filas || 0)
      const y = Number(this.form.columnas || 0)
      return Math.max(0, x) * Math.max(0, y)
    },

    previewRows () {
      return Math.min(Number(this.form.filas || 0), 30)
    },
    previewCols () {
      return Math.min(Number(this.form.columnas || 0), 30)
    },

    previewSeats () {
      const rows = this.previewRows
      const cols = this.previewCols
      if (rows <= 0 || cols <= 0) return []

      const rowOrder = this.form.start_top
        ? this.range(1, rows)
        : this.range(1, rows).reverse()

      const colOrder = this.form.start_left
        ? this.range(1, cols)
        : this.range(1, cols).reverse()

      const matrix = []
      for (const r of rowOrder) {
        const line = []
        for (const c of colOrder) {
          const code = this.makeCode(r, c)

          // Estado REAL desde BD si existe
          const dbSeat = this.seatDBMap[code]
          const status = this.normalizeEstado(dbSeat?.estado) || 'LIBRE'

          line.push({
            code,
            r,
            c,
            fila: r,
            columna: c,
            status
          })
        }
        matrix.push(line)
      }
      return matrix
    }
  },

  watch: {
    // si cambia el layout, limpia la data de seats preview (para no mezclar)
    'form.filas' () { this.seatDBMap = {} },
    'form.columnas' () { this.seatDBMap = {} },
    'form.etiqueta_modo' () { this.seatDBMap = {} },
    'form.start_top' () { this.seatDBMap = {} },
    'form.start_left' () { this.seatDBMap = {} }
  },

  mounted () {
    if (this.isEdit) this.getOne()
  },

  methods: {
    req (v) {
      return (v !== null && v !== undefined && v !== '') || 'Campo requerido'
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
      // fila => letra=fila, numero=col
      // columna => letra=col, numero=fila
      if (this.form.etiqueta_modo === 'fila') {
        return `${this.numToLetters(r)}${c}`
      }
      return `${this.numToLetters(c)}${r}`
    },

    openSeatDialog (seat) {
      const db = this.seatDBMap[seat.code] || null
      const status = this.normalizeEstado(db?.estado) || seat.status || 'LIBRE'

      // Lo que pediste: click en LIBRE abre el dialog
      // (si quieres SOLO LIBRE, descomenta el if)
      // if (status !== 'LIBRE') return

      this.seatDialog.seat = seat
      this.seatDialog.db = db
      this.seatDialog.seatStatus = status
      this.seatDialog.open = true
    },

    loadSeatsPreview () {
      if (!this.isEdit) return
      this.loadingSeats = true

      const id = this.$route.params.id

      this.$axios.get(`mis-graderias/${id}`, {
        params: {
          preview_rows: this.previewRows,
          preview_cols: this.previewCols
        }
      })
        .then(r => {
          const payload = r.data
          const g = payload.graderia

          // set form (por si backend cambió algo)
          this.form = {
            nombre: g.nombre || '',
            direccion: g.direccion || '',
            filas: g.filas || 1,
            columnas: g.columnas || 1,
            etiqueta_modo: g.etiqueta_modo || 'fila',
            start_top: !!g.start_top,
            start_left: !!g.start_left,
            activo: !!g.activo,
            regenerar_asientos: false
          }

          const map = {}
          const seats = payload.asientos_preview || []
          for (const s of seats) {
            map[s.codigo] = s
          }
          this.seatDBMap = map
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo cargar asientos (preview)'))
        .finally(() => { this.loadingSeats = false })
    },

    getOne () {
      this.loading = true

      // Primero trae gradería + preview asientos desde BD
      this.$axios.get(`mis-graderias/${this.$route.params.id}`, {
        params: {
          preview_rows: this.previewRows,
          preview_cols: this.previewCols
        }
      })
        .then(r => {
          const payload = r.data
          const g = payload.graderia

          this.form = {
            nombre: g.nombre || '',
            direccion: g.direccion || '',
            filas: g.filas || 1,
            columnas: g.columnas || 1,
            etiqueta_modo: g.etiqueta_modo || 'fila',
            start_top: !!g.start_top,
            start_left: !!g.start_left,
            activo: !!g.activo,
            regenerar_asientos: false
          }

          const map = {}
          const seats = payload.asientos_preview || []
          for (const s of seats) {
            map[s.codigo] = s
          }
          this.seatDBMap = map
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo cargar'))
        .finally(() => { this.loading = false })
    },

    save () {
      // ⚠️ si está marcado regenerar_asientos → confirmar
      if (this.isEdit && this.form.regenerar_asientos) {
        this.$q.dialog({
          title: '⚠️ Confirmar regeneración',
          message: `
        <div class="text-negative">
          <b>Esta acción eliminará TODOS los asientos existentes.</b><br><br>
          Se perderán reservas, pagos y clientes.<br>
          Todos los asientos volverán a estado <b>LIBRE</b>.<br><br>
          <b>¿Estás completamente seguro de continuar?</b>
        </div>
      `,
          html: true,
          ok: {
            label: 'Sí, regenerar asientos',
            color: 'negative'
          },
          cancel: {
            label: 'Cancelar',
            color: 'grey'
          },
          persistent: true
        }).onOk(() => {
          this.doSave()
        })

        return
      }

      // normal
      this.doSave()
    },
    doSave () {
      this.loading = true
      const id = this.$route.params.id
      const payload = { ...this.form }

      const req = this.isEdit
        ? this.$axios.put(`mis-graderias/${id}`, payload)
        : this.$axios.post('mis-graderias', payload)

      req.then(() => {
        this.$alert.success(
          this.isEdit ? 'Gradería actualizada correctamente' : 'Gradería creada'
        )
        this.$router.push('/mis-graderias')
      })
        .catch(e => {
          this.$alert.error(e.response?.data?.message || 'No se pudo guardar')
        })
        .finally(() => {
          this.loading = false
        })
    }

  }
}
</script>
