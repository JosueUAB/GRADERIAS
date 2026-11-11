<template>
  <q-page class="q-pa-sm">
    <q-card flat bordered>
      <q-card-section class="row items-center q-py-sm">
        <div>
          <div class="text-subtitle1 text-weight-bold">Venta / Administración de Asientos</div>
          <div class="text-caption text-grey-7">
            Clic para seleccionar. Luego abre el panel para aplicar estado y datos.
          </div>
        </div>

        <q-space />

        <q-btn flat icon="arrow_back" label="Volver" no-caps @click="$router.push('/mis-graderias')" />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-sm">
        <!-- HEADER INFO + RESUMEN -->
        <q-card flat bordered>
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle2 text-weight-bold">
              {{ graderia?.nombre || 'Gradería' }}
              <span class="text-grey-7">— {{ graderia?.direccion || '' }}</span>
            </div>

            <q-space />

            <q-btn dense no-caps color="primary" icon="refresh" label="Recargar" :loading="loading" @click="load()" class="q-mr-sm" />
<!--            btn dropdown para limpiar o gestionar-->
            <q-btn-dropdown dense no-caps color="primary" icon="more_vert" label="Acciones" class="q-mr-sm">
              <q-list>
                <q-item clickable @click="modificarAsiento" v-close-popup>
                  <q-item-section avatar>
                    <q-icon name="edit" />
                  </q-item-section>
                  <q-item-section> Modificar asiento </q-item-section>
                </q-item>
                <q-item clickable @click="imprimirPorCliente" v-close-popup>
                  <q-item-section avatar><q-icon name="print" /></q-item-section>
                  <q-item-section>Imprimir por clientes</q-item-section>
                </q-item>

                <q-item clickable @click="imprimirPorAsiento" v-close-popup>
                  <q-item-section avatar><q-icon name="print" /></q-item-section>
                  <q-item-section>Imprimir por asientos</q-item-section>
                </q-item>
                <q-item clickable @click="openWhatsappTicketsDialog" v-close-popup>
                  <q-item-section avatar><q-icon name="fa-brands fa-whatsapp" /></q-item-section>
                  <q-item-section>Mandar boletos por WhatsApp</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable @click="copyPublicLink" v-close-popup>
                  <q-item-section avatar><q-icon name="link" /></q-item-section>
                  <q-item-section>Copiar link publico</q-item-section>
                </q-item>
                <q-item clickable @click="openPublicLink" v-close-popup>
                  <q-item-section avatar><q-icon name="open_in_new" /></q-item-section>
                  <q-item-section>Abrir link publico</q-item-section>
                </q-item>

                <!--                imprirmi por cliente -->
<!--                imprimir por hacieno-->
              </q-list>
            </q-btn-dropdown>
<!--            <q-btn dense no-caps flat icon="clear_all" label="Limpiar selección" :disable="selectedIds.length === 0" @click="clearSelection" class="q-mr-sm" />-->
            <q-btn dense no-caps color="primary" icon="edit" label="Gestionar selección" :disable="selectedIds.length === 0" @click="openBulkDialog()" />
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-sm">
            <div class="row q-col-gutter-xs">
              <div class="col-6 col-md-3">
                <q-banner dense class="bg-grey-1">
                  <div class="text-caption text-grey-7">Total Bs</div>
                  <div class="text-subtitle1 text-weight-bold" >
                    <span :style="{ filter: mostrarMontoReal ? 'none' : 'blur(4px)' }">
  {{ totalMontoReal === 0 ? '0.00' : money(totalMontoReal) }}
</span>

                    <q-btn
                      dense
                      flat
                      :icon="mostrarMontoReal ? 'visibility' : 'visibility_off'"
                      @click="mostrarMontoReal = !mostrarMontoReal"
                    />

                  </div>
                </q-banner>
              </div>
              <div class="col-6 col-md-3">
                <q-banner dense class="bg-grey-1">
                  <div class="text-caption text-grey-7">Libres</div>
                  <div class="text-subtitle1 text-weight-bold">{{ stats.libre }}</div>
                </q-banner>
              </div>
              <div class="col-6 col-md-3">
                <q-banner dense class="bg-grey-1">
                  <div class="text-caption text-grey-7">Ocupados</div>
                  <div class="text-subtitle1 text-weight-bold">{{ stats.ocupado }}</div>
                </q-banner>
              </div>
              <div class="col-6 col-md-3">
                <q-banner dense class="bg-grey-1">
                  <div class="text-caption text-grey-7">Seleccionados</div>
                  <div class="text-subtitle1 text-weight-bold">{{ selectedIds.length }}</div>
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

            <div class="text-caption text-grey-7 q-mt-sm">
              Click = seleccionar / deseleccionar.
              <span v-if="mismatchWarning" class="text-negative">
                — Aviso: tu gradería dice {{ graderia?.filas }}x{{ graderia?.columnas }},
                pero en BD hay {{ asientosCount }} asientos. (Los grises son NO GENERADOS).
              </span>
            </div>
          </q-card-section>
        </q-card>

        <!-- GRID -->
        <q-card flat bordered class="q-mt-sm">
          <q-card-section class="row items-center q-py-sm">
            <div class="text-subtitle2 text-weight-bold">Asientos</div>
            <q-space />
            <q-badge outline color="primary">
<!--              Monto selección: {{ money(selectedTotalMonto) }}-->
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
                    @click="toggleSeat(seat)"
                    :style="cellStyle(seat)"
                  >
                    <div class="text-weight-bold">{{ seat.codigo }}</div>

                    <div style="font-size: 11px;">
                      {{ statusMeta[seat.status].label }}
                      <span v-if="seat.id && isSelected(seat.id)" class="text-weight-bold"> ✓</span>
                    </div>

                    <div style="font-size: 11px; margin-top: 2px;">
                      <span v-if="seat.cliente_nombre" class="text-grey-9">
                        {{ seat.cliente_nombre }} <br>
                        <span style="font-size: 10px;" class="text-grey-9`">
                          {{seat.cliente_celular}}
                        </span>
                        <br>
                        {{ seat.monto }} Bs
                      </span>
                      <span v-else class="text-grey-6">—</span>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </q-card-section>
        </q-card>

      </q-card-section>
    </q-card>

    <!-- DIALOG MASIVO -->
    <q-dialog v-model="bulkDialog.open">
      <q-card style="width: 520px; max-width: 95vw;">
        <q-card-section class="row items-center q-py-sm">
          <div>
            <div class="text-subtitle1 text-weight-bold">Gestionar selección</div>
            <div class="text-caption text-grey-7">
              Seleccionados: <b>{{ selectedIds.length }}</b> — Total actual: <b>{{ money(selectedTotalMonto) }}</b>
            </div>
          </div>
          <q-space />
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-sm">
          <q-input v-model="bulkForm.cliente_nombre" dense outlined label="Nombre cliente" clearable/>
          <q-input v-model="bulkForm.cliente_celular" dense outlined label="Celular" class="q-mt-sm" clearable />

          <q-input
            v-model.number="bulkForm.monto_total"
            type="number"
            dense
            outlined
            label="Monto TOTAL (se divide entre seleccionados)"
            class="q-mt-sm"
            :min="0"
            step="1"
            clearable
          />

          <q-banner dense class="bg-grey-1 q-mt-sm">
            <div class="text-caption text-grey-7">Resumen</div>
            <div class="row q-col-gutter-xs q-mt-xs">
              <div class="col-6">
                <div class="text-caption text-grey-7">Libres sel.</div>
                <div class="text-weight-bold">{{ selectedStats.libre }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Ocupados sel.</div>
                <div class="text-weight-bold">

<!--                  {{ selectedStats.ocupado }} si es mayo de cero un rojo furerte y que diha alerta-->
                  <span :class="selectedStats.ocupado > 0 ? 'text-negative text-weight-bold' : ''">
                    {{ selectedStats.ocupado }}
                    <template v-if="selectedStats.ocupado > 0">
                    Cuidado!
                    </template>
                  </span>
                </div>
              </div>
            </div>
          </q-banner>

          <div class="row q-col-gutter-xs q-mt-sm">
            <div class="col-6">
              <q-btn
                class="full-width"
                no-caps
                :disable="selectedIds.length === 0 || saving"
                :loading="saving && actionRunning==='RESERVADO'"
                :color="statusMeta.RESERVADO.color"
                icon="bookmark"
                label="Reservar"
                @click="applyBulk('RESERVADO')"
              />
            </div>
            <div class="col-6">
              <q-btn
                class="full-width"
                no-caps
                :disable="selectedIds.length === 0 || saving"
                :loading="saving && actionRunning==='PAGADO'"
                :color="statusMeta.PAGADO.color"
                icon="paid"
                label="Pagar"
                @click="applyBulk('PAGADO')"
              />
            </div>

            <div class="col-6 q-mt-xs">
              <q-btn
                class="full-width"
                no-caps
                :disable="selectedIds.length === 0 || saving"
                :loading="saving && actionRunning==='BLOQUEADO'"
                :color="statusMeta.BLOQUEADO.color"
                icon="block"
                label="Bloquear"
                @click="applyBulk('BLOQUEADO')"
              />
            </div>
            <div class="col-6 q-mt-xs">
              <q-btn
                class="full-width"
                no-caps
                :disable="selectedIds.length === 0 || saving"
                :loading="saving && actionRunning==='LIBRE'"
                color="grey-8"
                icon="restart_alt"
                label="Liberar"
                @click="applyBulk('LIBRE')"
              />
            </div>
          </div>

          <div class="text-caption text-grey-7 q-mt-sm">
            * Solo se pueden seleccionar asientos existentes (no grises).
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cerrar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- DIALOG MODIFICAR ASIENTO (ADMIN) -->
    <q-dialog v-model="asientoSeleccionadoDialog">
      <q-card style="width: 540px; max-width: 95vw;">
        <q-card-section class="row items-center q-py-sm">
          <div>
            <div class="text-subtitle1 text-weight-bold">
              Modificar Asiento: {{ asientoEdit.codigo }}
            </div>
            <div class="text-caption text-grey-7">
              Estado actual: <b>{{ asientoSeleccionado?.estado }}</b>
              <span v-if="asientoSeleccionado?.cliente_nombre"> — {{ asientoSeleccionado?.cliente_nombre }}</span>
            </div>
          </div>
          <q-space />
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-sm">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-6">
              <q-select
                v-model="asientoEdit.estado"
                dense outlined
                label="Estado"
                :options="estadoOptions"
                emit-value
                map-options
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model.number="asientoEdit.monto"
                dense outlined
                type="number"
                label="Monto (Bs)"
                :min="0"
                step="1"
                clearable
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="asientoEdit.cliente_nombre"
                dense outlined
                label="Cliente"
                clearable
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="asientoEdit.cliente_celular"
                dense outlined
                label="Celular"
                clearable
              />
            </div>
          </div>

          <q-banner dense class="bg-grey-1 q-mt-sm">
            <div class="text-caption text-grey-7">
              Tips:
              <ul class="q-ma-none q-pl-md">
                <li>LIBRE limpia cliente/monto/fechas</li>
                <li>PAGADO setea pagado_at</li>
                <li>RESERVADO setea reservado_at</li>
              </ul>
            </div>
          </q-banner>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="q-px-md q-py-sm">
          <q-btn
            color="negative"
            flat
            no-caps
            icon="restart_alt"
            label="Liberar asiento"
            :loading="modificando"
            @click="liberarAsientoDirecto"
          />
          <div class="row q-gutter-sm">
            <q-btn flat no-caps label="Cancelar" v-close-popup />
            <q-btn
              color="primary"
              no-caps
              icon="save"
              label="Guardar cambios"
              :loading="modificando"
              @click="guardarAsientoDirecto"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- DIALOG: ENVIAR BOLETOS WHATSAPP -->
    <q-dialog v-model="waDialog.open">
      <q-card style="width: 760px; max-width: 96vw;">
        <q-card-section class="row items-center q-py-sm">
          <div>
            <div class="text-subtitle1 text-weight-bold">Mandar boletos por WhatsApp</div>
            <div class="text-caption text-grey-7">
              Selecciona un cliente para generar sus boletas (por asiento) y enviarlas.
            </div>
          </div>
          <q-space />
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-sm">
          <div class="row items-center q-col-gutter-sm">
            <div class="col-12 col-md-6">
              <q-input v-model="waDialog.filter" dense outlined debounce="250" label="Buscar cliente / celular">
                <template #prepend><q-icon name="search"/></template>
              </q-input>
            </div>
            <div class="col-12 col-md-6">
              <q-banner dense class="bg-grey-1">
                <div class="text-caption text-grey-7">Seleccionado</div>
                <div class="text-weight-bold">
                  {{ waDialog.selected ? waDialog.selected.nombre : '—' }}
                </div>
                <div class="text-caption text-grey-8">
                  Cel: {{ waDialog.selected ? waDialog.selected.celular : '—' }}
                </div>
              </q-banner>
            </div>
          </div>

          <q-table
            class="q-mt-sm"
            dense
            flat
            bordered
            :rows="waClientsFiltered"
            :columns="waDialog.columns"
            row-key="key"
            :pagination="{ rowsPerPage: 8 }"
            @row-click="(_, row) => selectWaClient(row)"
          >
            <template #body-cell-total="props">
              <q-td :props="props">
                {{ money(props.row.total) }} Bs
              </q-td>
            </template>

            <template #body-cell_count="props">
              <q-td :props="props">
                <q-badge outline color="primary">{{ props.row.count }}</q-badge>
              </q-td>
            </template>

            <template #body-cell_estado="props">
              <q-td :props="props">
                <q-chip dense :color="props.row.estadoColor" text-color="white">
                  {{ props.row.estadoLabel }}
                </q-chip>
              </q-td>
            </template>
          </q-table>

          <q-banner dense class="bg-grey-1 q-mt-sm">
            <div class="text-caption text-grey-7">
              Nota: “Enviar” real por WhatsApp requiere backend (WhatsApp Cloud API).
              Si no lo tienes, se descargará el PDF y se abrirá WhatsApp con mensaje listo.
            </div>
          </q-banner>
        </q-card-section>

        <q-separator />

        <q-card-actions align="between" class="q-px-md q-py-sm">
          <q-btn flat no-caps label="Cerrar" v-close-popup />

          <div class="row q-gutter-sm">
            <q-btn
              no-caps
              color="grey-8"
              icon="download"
              label="Solo generar PDF"
              :disable="!waDialog.selected || waDialog.generating"
              :loading="waDialog.generating && waDialog.mode==='PDF'"
              @click="generarPdfTicketsSeleccionado('PDF')"
            />
            <q-btn
              no-caps
              color="positive"
              icon="fa-brands fa-whatsapp"
              label="Generar y Enviar"
              :disable="!waDialog.selected || waDialog.generating"
              :loading="waDialog.generating && waDialog.mode==='SEND'"
              @click="generarPdfTicketsSeleccionado('SEND')"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>


  </q-page>
</template>

<script>
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
export default {
  name: 'GraderiaVenta',

  data () {
    return {
      waDialog: {
        open: false,
        filter: '',
        selected: null,
        generating: false,
        mode: '',
        columns: [
          { name: 'nombre', label: 'Cliente', field: 'nombre', align: 'left', sortable: true },
          { name: 'celular', label: 'Celular', field: 'celular', align: 'left', sortable: true },
          { name: 'count', label: 'Asientos', field: 'count', align: 'center', sortable: true },
          { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
          { name: 'estado', label: 'Estado', field: 'estadoLabel', align: 'left' }
        ]
      },
      totalMontoRealCss: false,
      mostrarMontoReal: true,
      // asientoSeleccionado: null,
      // asientoSeleccionadoDialog: false,
      loading: false,
      saving: false,
      actionRunning: '',

      graderia: null,
      asientosCount: 0,

      seatsDB: [],
      seatDBMap: {},

      selectedIds: [],

      bulkDialog: { open: false },
      bulkForm: {
        cliente_nombre: '',
        cliente_celular: '',
        monto_total: null
      },

      statusMeta: {
        NO_GENERADO: { label: 'No generado', color: 'grey-7', bg: '#e6e6e6' },
        LIBRE:       { label: 'Libre',       color: 'positive', bg: '#82f38b' },
        RESERVADO:   { label: 'Reservado',   color: 'warning',  bg: '#f3d77d' },
        PAGADO:      { label: 'Pagado',      color: 'primary',  bg: '#79bcee' },
        BLOQUEADO:   { label: 'Bloqueado',   color: 'negative', bg: '#ec7385' }
      },
      modificando: false,
      asientoSeleccionado: null,
      asientoSeleccionadoDialog: false,

      asientoEdit: {
        id: null,
        codigo: '',
        estado: 'LIBRE',
        cliente_nombre: '',
        cliente_celular: '',
        monto: null
      },

      estadoOptions: [
        { label: 'LIBRE', value: 'LIBRE' },
        { label: 'RESERVADO', value: 'RESERVADO' },
        { label: 'PAGADO', value: 'PAGADO' },
        { label: 'BLOQUEADO', value: 'BLOQUEADO' }
      ],
    }
  },

  computed: {
    waClients () {
      // agrupa SOLO los que tienen cliente + celular (y normalmente RESERVADO/PAGADO)
      const seats = (this.seatsDB || [])
        .filter(s => (s.cliente_nombre && String(s.cliente_nombre).trim() !== '') || (s.cliente_celular && String(s.cliente_celular).trim() !== ''))
        .map(s => ({
          codigo: s.codigo,
          estado: this.normalizeEstado(s.estado) || 'LIBRE',
          cliente_nombre: (s.cliente_nombre || '').trim(),
          cliente_celular: (s.cliente_celular || '').trim(),
          monto: (s.monto != null && s.monto !== '' && !isNaN(Number(s.monto))) ? Number(s.monto) : 0,
          reservado_at: s.reservado_at,
          pagado_at: s.pagado_at,
          created_at: s.created_at
        }))

      const map = {}
      for (const s of seats) {
        const key = `${(s.cliente_nombre || '').toUpperCase()}|${(s.cliente_celular || '')}`
        if (!map[key]) map[key] = { key, nombre: s.cliente_nombre, celular: s.cliente_celular, items: [] }
        map[key].items.push(s)
      }

      const groups = Object.values(map).map(g => {
        const itemsSorted = this.sortSeatsByCodigo(g.items)

        const total = itemsSorted.reduce((acc, it) => acc + (it.monto || 0), 0)

        // estado “dominante” para el chip (si hay PAGADO en cualquiera, mostramos PAGADO)
        const hasPagado = itemsSorted.some(x => x.estado === 'PAGADO')
        const hasReserv = itemsSorted.some(x => x.estado === 'RESERVADO')
        const estadoLabel = hasPagado ? 'PAGADO' : (hasReserv ? 'RESERVADO' : 'MIXTO')
        const estadoColor = hasPagado ? this.statusMeta.PAGADO.color : (hasReserv ? this.statusMeta.RESERVADO.color : 'grey-8')

        return {
          key: g.key,
          nombre: g.nombre,
          celular: g.celular,
          count: itemsSorted.length,
          total,
          estadoLabel,
          estadoColor,
          items: itemsSorted
        }
      })

      // ordenar clientes alfabético
      return groups.sort((a, b) => {
        const an = (a.nombre || '').toUpperCase()
        const bn = (b.nombre || '').toUpperCase()
        if (an < bn) return -1
        if (an > bn) return 1
        return (a.celular || '').localeCompare(b.celular || '')
      })
    },

    waClientsFiltered () {
      const f = (this.waDialog.filter || '').trim().toUpperCase()
      if (!f) return this.waClients
      return this.waClients.filter(x =>
        (x.nombre || '').toUpperCase().includes(f) ||
        (x.celular || '').toUpperCase().includes(f)
      )
    },
    totalMontoReal () {
      let sum = 0
      for (const s of this.seatsDB) {
        if (s.monto != null && s.monto !== '' && !isNaN(Number(s.monto))) {
          sum += Number(s.monto)
        }
      }
      return sum
    },
    graderiaId () {
      return this.$route.params.id
    },

    mismatchWarning () {
      if (!this.graderia) return false
      const expected = Number(this.graderia.filas || 0) * Number(this.graderia.columnas || 0)
      return expected > 0 && this.asientosCount > 0 && expected !== this.asientosCount
    },

    stats () {
      // stats sobre la grilla completa (config)
      const total = Number(this.graderia?.filas || 0) * Number(this.graderia?.columnas || 0)
      const s = { total, libre: 0, reservado: 0, pagado: 0, bloqueado: 0, ocupado: 0 }

      // contamos solo los existentes según BD (porque los no generados no tienen estado real)
      for (const a of this.seatsDB) {
        const st = this.normalizeEstado(a.estado) || 'LIBRE'
        if (st === 'LIBRE') s.libre++
        if (st === 'RESERVADO') s.reservado++
        if (st === 'PAGADO') s.pagado++
        if (st === 'BLOQUEADO') s.bloqueado++
      }
      s.ocupado = (s.reservado + s.pagado + s.bloqueado)
      return s
    },

    selectedSeats () {
      return this.selectedIds.map(id => {
        const s = this.seatsDB.find(x => x.id === id)
        if (!s) return null
        return { ...s, status: this.normalizeEstado(s.estado) || 'LIBRE' }
      }).filter(Boolean)
    },

    selectedStats () {
      const st = { libre: 0, ocupado: 0 }
      for (const s of this.selectedSeats) {
        if (s.status === 'LIBRE') st.libre++
        else st.ocupado++
      }
      return st
    },

    selectedTotalMonto () {
      const mt = this.bulkForm.monto_total
      if (mt !== null && mt !== '' && !isNaN(Number(mt))) return Number(mt)

      let sum = 0
      for (const s of this.selectedSeats) {
        if (s.monto != null) sum += Number(s.monto)
      }
      return sum
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

          const db = this.seatDBMap[codigo] || null
          const status = db ? (this.normalizeEstado(db.estado) || 'LIBRE') : 'NO_GENERADO'

          line.push({
            id: db?.id || null,
            fila: r,
            columna: c,
            codigo,
            status,
            cliente_nombre: db?.cliente_nombre || null,
            cliente_celular: db?.cliente_celular || null,
            monto: db?.monto ?? null,
            reservado_at: db?.reservado_at || null,
            pagado_at: db?.pagado_at || null
          })
        }
        matrix.push(line)
      }

      return matrix
    }
  },
  watch: {
    mostrarMontoReal (val) {
      localStorage.setItem('graderia_mostrar_monto', val ? '1' : '0')
    }
  },

  mounted () {
    const v = localStorage.getItem('graderia_mostrar_monto')
    this.mostrarMontoReal = (v === null) ? true : (v === '1')

    this.load()
  },

  methods: {
    openWhatsappTicketsDialog () {
      if (!this.graderia) return
      if (!this.seatsDB || this.seatsDB.length === 0) {
        this.$alert.error('No hay asientos cargados.')
        return
      }
      this.waDialog.filter = ''
      this.waDialog.selected = null
      this.waDialog.open = true
    },

    publicLink () {
      if (!this.graderia?.code) return ''
      return `${window.location.origin}/g/${encodeURIComponent(this.graderia.code)}`
    },

    async copyPublicLink () {
      const link = this.publicLink()
      if (!link) {
        this.$alert.error('No hay cÃ³digo pÃºblico para esta graderÃ­a.')
        return
      }
      try {
        await navigator.clipboard.writeText(link)
        this.$alert.success('Link copiado')
      } catch (e) {
        // fallback simple
        const el = document.createElement('textarea')
        el.value = link
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        this.$alert.success('Link copiado')
      }
    },

    openPublicLink () {
      const link = this.publicLink()
      if (!link) {
        this.$alert.error('No hay cÃ³digo pÃºblico para esta graderÃ­a.')
        return
      }
      window.open(link, '_blank')
    },

    selectWaClient (row) {
      this.waDialog.selected = row
    },

    normalizePhoneToWa (phone) {
      // Ajusta a tu realidad. Ej: Bolivia +591
      // si ya viene con +, lo dejamos; si viene "7xxxxxxx" le ponemos 591
      const raw = String(phone || '').replace(/[^\d+]/g, '')
      if (!raw) return ''
      if (raw.startsWith('+')) return raw
      if (raw.startsWith('591')) return `+${raw}`
      // si es 8 dígitos típico BO (7xxxxxxx)
      if (raw.length === 8) return `+591${raw}`
      return `+${raw}`
    },

    async generarPdfTicketsSeleccionado (mode) {
      if (!this.waDialog.selected) return
      this.waDialog.generating = true
      this.waDialog.mode = mode

      try {
        const g = this.waDialog.selected
        const doc = this.buildTicketsPdf(g) // genera “boletas” (1 página por asiento)

        if (mode === 'PDF') {
          const filename = `boletos_${this.graderiaId}_${Date.now()}.pdf`
          doc.save(filename)
          this.$alert.success('PDF generado')
          return
        }

        // SEND: Opción A (sin backend) = descargar + abrir WhatsApp con texto
        // (WhatsApp web no permite adjuntar automáticamente desde navegador)
        const filename = `boletos_${this.graderiaId}_${Date.now()}.pdf`
        doc.save(filename)

        const waPhone = this.normalizePhoneToWa(g.celular)
        const msg =
          `Hola ${this.safe(g.nombre)}. Aquí están tus boletos.\n` +
          `Gradería: ${this.safe(this.graderia?.nombre)}\n` +
          `Asientos: ${g.items.map(x => x.codigo).join(', ')}\n` +
          `Total: ${this.money(g.total)} Bs\n` +
          `Enviado por: ${this.safe(this.$store?.user?.name || this.$store?.user?.nombre || '')}`

        const url = `https://wa.me/${waPhone.replace('+','')}?text=${encodeURIComponent(msg)}`
        window.open(url, '_blank')

        this.$alert.success('WhatsApp abierto. Adjunta el PDF descargado y envía.')

        // ✅ Opción B (PRO): si tienes endpoint, comenta lo de arriba y usa esto:
        // await this.sendPdfToBackendAndWhatsApp(doc, g)

      } catch (e) {
        this.$alert.error(e.message || 'No se pudo generar/enviar los boletos')
      } finally {
        this.waDialog.generating = false
        this.waDialog.mode = ''
      }
    },

    buildTicketsPdf (group) {
      // “Boleta” bonita: 1 asiento = 1 página
      // Letter portrait
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

      const now = this.fmtDateTime(new Date())
      const usuario = this.safe(this.$store?.user?.name || this.$store?.user?.nombre || '')
      const graderia = this.safe(this.graderia?.nombre)
      const direccion = this.safe(this.graderia?.direccion)

      const items = this.sortSeatsByCodigo(group.items)

      // helpers simples de layout
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 40

      const drawTicket = (it, idx) => {
        if (idx > 0) doc.addPage()

        // marco
        doc.setLineWidth(1)
        doc.rect(margin, 35, pageW - margin*2, 720)

        // encabezado
        doc.setFontSize(16)
        doc.text('BOLETO / ENTRADA', margin + 14, 70)

        doc.setFontSize(10)
        doc.text(`Gradería: ${graderia}`, margin + 14, 95)
        if (direccion) doc.text(`Dirección: ${direccion}`, margin + 14, 112)

        // asiento grande
        doc.setFontSize(42)
        doc.text(this.safe(it.codigo), margin + 14, 175)

        // estado y monto
        doc.setFontSize(12)
        doc.text(`Estado: ${this.statusLabel(it.estado)}`, margin + 14, 210)
        doc.text(`Monto: ${this.money(it.monto || 0)} Bs`, margin + 14, 230)

        // cliente
        doc.setFontSize(11)
        doc.text(`Cliente: ${this.safe(group.nombre)}`, margin + 14, 265)
        doc.text(`Celular: ${this.safe(group.celular)}`, margin + 14, 285)

        // fechas
        doc.setFontSize(10)
        doc.text(`Creado: ${this.fmtDateTime(it.created_at)}`, margin + 14, 320)
        doc.text(`Reservado: ${this.fmtDateTime(it.reservado_at)}`, margin + 14, 338)
        doc.text(`Pagado: ${this.fmtDateTime(it.pagado_at)}`, margin + 14, 356)

        // footer auditoría
        doc.setFontSize(9)
        doc.text(`Generado: ${now}`, margin + 14, 720)
        doc.text(`Usuario: ${usuario}`, margin + 14, 735)

        // “corte” (línea punteada)
        doc.setLineWidth(0.7)
        doc.setLineDash([4, 4], 0)
        doc.line(margin, 470, pageW - margin, 470)
        doc.setLineDash([], 0)

        doc.setFontSize(10)
        doc.text('Comprobante (copia)', margin + 14, 500)
        doc.setFontSize(9)
        doc.text(`Asiento: ${this.safe(it.codigo)} — Cliente: ${this.safe(group.nombre)} — Total cliente: ${this.money(group.total)} Bs`, margin + 14, 520)
      }

      items.forEach((it, idx) => drawTicket(it, idx))
      return doc
    },

// ✅ Si quieres envío REAL, usa backend:
// async sendPdfToBackendAndWhatsApp (doc, group) {
//   const blob = doc.output('blob')
//   const base64 = await new Promise((resolve, reject) => {
//     const r = new FileReader()
//     r.onload = () => resolve(String(r.result).split(',')[1])
//     r.onerror = reject
//     r.readAsDataURL(blob)
//   })
//
//   const payload = {
//     graderia_id: this.graderiaId,
//     cliente_nombre: group.nombre,
//     cliente_celular: group.celular,
//     asiento_codigos: group.items.map(x => x.codigo),
//     pdf_base64: base64
//   }
//
//   await this.$axios.post('whatsapp/boletos', payload)
//   this.$alert.success('Boletos enviados por WhatsApp')
// }

    validarAsientoEdit (payload) {
      // reglas simples (ajusta si quieres)
      if (payload.estado === 'RESERVADO' || payload.estado === 'PAGADO') {
        if (!payload.cliente_nombre || !payload.cliente_celular) {
          this.$alert.error('Para RESERVADO/PAGADO necesitas cliente y celular.')
          return false
        }
        if (payload.monto === null || payload.monto === '' || isNaN(Number(payload.monto))) {
          this.$alert.error('Para RESERVADO/PAGADO necesitas un monto.')
          return false
        }
      }
      return true
    },

    async guardarAsientoDirecto () {
      if (!this.asientoEdit?.id) return

      const payload = {
        estado: this.asientoEdit.estado,
        cliente_nombre: this.asientoEdit.cliente_nombre || null,
        cliente_celular: this.asientoEdit.cliente_celular || null,
        monto: (this.asientoEdit.monto === null || this.asientoEdit.monto === '' || isNaN(Number(this.asientoEdit.monto)))
          ? null
          : Number(this.asientoEdit.monto)
      }

      if (!this.validarAsientoEdit(payload)) return

      this.modificando = true
      try {
        const { data } = await this.$axios.patch(`mis-graderias/${this.graderiaId}/asientos/${this.asientoEdit.id}`, payload)

        const updated = data.asiento

        // update maps/local list
        this.seatDBMap = { ...this.seatDBMap, [updated.codigo]: updated }

        const idx = this.seatsDB.findIndex(x => x.id === updated.id)
        if (idx !== -1) {
          const copy = [...this.seatsDB]
          copy.splice(idx, 1, updated)
          this.seatsDB = copy
        } else {
          this.seatsDB = [...this.seatsDB, updated]
        }

        this.$alert.success('Asiento actualizado')
        this.asientoSeleccionadoDialog = false
      } catch (e) {
        this.$alert.error(e.response?.data?.message || 'No se pudo actualizar asiento')
      } finally {
        this.modificando = false
      }
    },

    async liberarAsientoDirecto () {
      if (!this.asientoEdit?.id) return

      this.$q.dialog({
        title: 'Confirmar',
        message: `¿Seguro que quieres LIBERAR el asiento ${this.asientoEdit.codigo}?`,
        cancel: true,
        ok: { label: 'Sí, liberar', color: 'negative', noCaps: true }
      }).onOk(async () => {
        this.modificando = true
        try {
          const { data } = await this.$axios.patch(`mis-graderias/${this.graderiaId}/asientos/${this.asientoEdit.id}`, {
            estado: 'LIBRE',
            cliente_nombre: null,
            cliente_celular: null,
            monto: null
          })

          const updated = data.asiento
          this.seatDBMap = { ...this.seatDBMap, [updated.codigo]: updated }

          const idx = this.seatsDB.findIndex(x => x.id === updated.id)
          if (idx !== -1) {
            const copy = [...this.seatsDB]
            copy.splice(idx, 1, updated)
            this.seatsDB = copy
          }

          this.$alert.success('Asiento liberado')
          this.asientoSeleccionadoDialog = false
        } catch (e) {
          this.$alert.error(e.response?.data?.message || 'No se pudo liberar asiento')
        } finally {
          this.modificando = false
        }
      })
    },
    pad2 (n) { return String(n).padStart(2, '0') },

    fmtDateTime (v) {
      if (!v) return ''
      const d = new Date(v)
      if (isNaN(d.getTime())) return String(v)
      return `${this.pad2(d.getDate())}/${this.pad2(d.getMonth()+1)}/${d.getFullYear()} ${this.pad2(d.getHours())}:${this.pad2(d.getMinutes())}`
    },

    safe (v) {
      return (v === null || v === undefined) ? '' : String(v)
    },

    seatSortKey (codigo) {
      // Orden alfabético: "A1", "A10", "B2" correctamente
      // separa letras y número: A + 10
      const m = String(codigo || '').toUpperCase().match(/^([A-Z]+)(\d+)$/)
      if (!m) return { letters: codigo, num: 0 }
      return { letters: m[1], num: Number(m[2]) }
    },

    sortSeatsByCodigo (arr) {
      return [...arr].sort((a, b) => {
        const ka = this.seatSortKey(a.codigo)
        const kb = this.seatSortKey(b.codigo)
        if (ka.letters < kb.letters) return -1
        if (ka.letters > kb.letters) return 1
        return ka.num - kb.num
      })
    },

    statusLabel (estado) {
      const up = this.normalizeEstado(estado) || 'LIBRE'
      return this.statusMeta[up]?.label || up
    },
    imprimirPorAsiento () {
      if (!this.graderia) return

      const seats = this.sortSeatsByCodigo(this.seatsDB.map(s => ({
        codigo: s.codigo,
        estado: this.normalizeEstado(s.estado) || 'LIBRE',
        cliente_nombre: s.cliente_nombre,
        cliente_celular: s.cliente_celular,
        monto: s.monto,
        reservado_at: s.reservado_at,
        pagado_at: s.pagado_at,
        created_at: s.created_at // si no viene, lo dejamos vacío
      })))

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })

      const title = `Reporte por Asientos - ${this.safe(this.graderia.nombre)}`
      const now = this.fmtDateTime(new Date())

      doc.setFontSize(14)
      doc.text(title, 40, 35)

      doc.setFontSize(10)
      doc.text(`Dirección: ${this.safe(this.graderia.direccion)}`, 40, 55)
      doc.text(`Generado: ${now}`, 40, 70)
      doc.text(`Usuario: ${this.safe(this.$store?.user?.name || this.$store?.user?.nombre || '')}`, 40, 85)

      const head = [[
        'Asiento', 'Estado', 'Cliente', 'Celular', 'Monto (Bs)', 'Reservado', 'Pagado', 'Creado'
      ]]

      const body = seats.map(s => ([
        this.safe(s.codigo),
        this.statusLabel(s.estado),
        this.safe(s.cliente_nombre),
        this.safe(s.cliente_celular),
        (s.monto != null && s.monto !== '' && !isNaN(Number(s.monto))) ? this.money(Number(s.monto)) : '',
        this.fmtDateTime(s.reservado_at),
        this.fmtDateTime(s.pagado_at),
        this.fmtDateTime(s.created_at)
      ]))

      autoTable(doc, {
        head,
        body,
        startY: 105,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 55 }, // asiento
          1: { cellWidth: 70 }, // estado
          2: { cellWidth: 140 }, // cliente
          3: { cellWidth: 70 }, // celular
          4: { cellWidth: 60 }, // monto
          5: { cellWidth: 75 }, // reservado
          6: { cellWidth: 75 }, // pagado
          7: { cellWidth: 75 }  // creado
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages()
          doc.setFontSize(9)
          doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() - 110, doc.internal.pageSize.getHeight() - 15)
        }
      })

      const filename = `graderia_${this.graderiaId}_asientos_${Date.now()}.pdf`
      doc.save(filename)
    },
    imprimirPorCliente () {
      if (!this.graderia) return

      // solo asientos con cliente (reservado/pagado normalmente)
      const seats = this.seatsDB
        .filter(s => (s.cliente_nombre && String(s.cliente_nombre).trim() !== '') || (s.cliente_celular && String(s.cliente_celular).trim() !== ''))
        .map(s => ({
          codigo: s.codigo,
          estado: this.normalizeEstado(s.estado) || 'LIBRE',
          cliente_nombre: (s.cliente_nombre || '').trim(),
          cliente_celular: (s.cliente_celular || '').trim(),
          monto: s.monto,
          reservado_at: s.reservado_at,
          pagado_at: s.pagado_at,
          created_at: s.created_at
        }))

      // agrupar por "cliente_nombre|celular"
      const map = {}
      for (const s of seats) {
        const key = `${(s.cliente_nombre || '').toUpperCase()}|${(s.cliente_celular || '')}`
        if (!map[key]) map[key] = { nombre: s.cliente_nombre, celular: s.cliente_celular, items: [] }
        map[key].items.push(s)
      }

      // ordenar clientes alfabético
      const groups = Object.values(map).sort((a, b) => {
        const an = (a.nombre || '').toUpperCase()
        const bn = (b.nombre || '').toUpperCase()
        if (an < bn) return -1
        if (an > bn) return 1
        return (a.celular || '').localeCompare(b.celular || '')
      })

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

      const title = `Reporte por Clientes - ${this.safe(this.graderia.nombre)}`
      const now = this.fmtDateTime(new Date())

      doc.setFontSize(14)
      doc.text(title, 40, 35)

      doc.setFontSize(10)
      doc.text(`Dirección: ${this.safe(this.graderia.direccion)}`, 40, 55)
      doc.text(`Generado: ${now}`, 40, 70)
      doc.text(`Usuario: ${this.safe(this.$store?.user?.name || this.$store?.user?.nombre || '')}`, 40, 85)

      let cursorY = 105

      for (const g of groups) {
        // si queda poco espacio, nueva página
        if (cursorY > 720) {
          doc.addPage()
          cursorY = 40
        }

        const itemsSorted = this.sortSeatsByCodigo(g.items)

        const total = itemsSorted.reduce((acc, it) => {
          const m = (it.monto != null && it.monto !== '' && !isNaN(Number(it.monto))) ? Number(it.monto) : 0
          return acc + m
        }, 0)

        doc.setFontSize(11)
        doc.text(`Cliente: ${this.safe(g.nombre)}  —  Cel: ${this.safe(g.celular)}  —  Total: ${this.money(total)} Bs`, 40, cursorY)
        cursorY += 10

        const head = [[ 'Asiento', 'Estado', 'Monto (Bs)', 'Reservado', 'Pagado', 'Creado' ]]
        const body = itemsSorted.map(it => ([
          this.safe(it.codigo),
          this.statusLabel(it.estado),
          (it.monto != null && it.monto !== '' && !isNaN(Number(it.monto))) ? this.money(Number(it.monto)) : '',
          this.fmtDateTime(it.reservado_at),
          this.fmtDateTime(it.pagado_at),
          this.fmtDateTime(it.created_at)
        ]))

        autoTable(doc, {
          head,
          body,
          startY: cursorY + 8,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
          headStyles: { fontStyle: 'bold' },
          margin: { left: 40, right: 40 },
          didDrawPage: (data) => {
            const pageCount = doc.getNumberOfPages()
            doc.setFontSize(9)
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() - 110, doc.internal.pageSize.getHeight() - 15)
          }
        })

        cursorY = doc.lastAutoTable.finalY + 18
      }

      if (groups.length === 0) {
        doc.setFontSize(11)
        doc.text('No hay asientos con cliente para imprimir.', 40, 130)
      }

      const filename = `graderia_${this.graderiaId}_clientes_${Date.now()}.pdf`
      doc.save(filename)
    },
    modificarAsiento () {
      this.$q.dialog({
        title: 'Modificar Asiento',
        message: 'Ingresa el código del asiento a modificar:',
        prompt: {
          model: '',
          type: 'text',
          isValid: val => val.trim().length > 0,
          label: 'Código del Asiento',
          hint: 'Ejemplo: A1, B3, C5...',
          attrs: { maxlength: 10 }
        },
        cancel: true
      }).onOk(code => {
        const trimmedCode = String(code || '').trim().toUpperCase()
        const seat = this.seatsDB.find(s => String(s.codigo || '').toUpperCase() === trimmedCode)

        if (!seat) {
          this.$alert.error(`Asiento con código "${trimmedCode}" no encontrado.`)
          return
        }

        this.asientoSeleccionado = seat

        // precarga editor
        this.asientoEdit = {
          id: seat.id,
          codigo: seat.codigo,
          estado: (seat.estado || 'LIBRE').toUpperCase(),
          cliente_nombre: seat.cliente_nombre || '',
          cliente_celular: seat.cliente_celular || '',
          monto: seat.monto != null ? Number(seat.monto) : null
        }

        this.asientoSeleccionadoDialog = true
      })
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
      // EXACTAMENTE como tu "Editar"
      if (String(this.graderia.etiqueta_modo) === 'fila') {
        return `${this.numToLetters(r)}${c}`
      }
      return `${this.numToLetters(c)}${r}`
    },

    money (n) {
      const x = Number(n || 0)
      return x.toFixed(2)
    },

    isSelected (id) {
      return id != null && this.selectedIds.includes(id)
    },

    seatBg (seat) {
      const base = this.statusMeta[seat.status]?.bg || '#ffffff'
      if (seat.id && this.isSelected(seat.id)) return '#d9d9d9'
      return base
    },

    cellStyle (seat) {
      const clickable = !!seat.id && seat.status !== 'NO_GENERADO'
      return {
        cursor: clickable ? 'pointer' : 'not-allowed',
        textAlign: 'center',
        opacity: clickable ? 1 : 0.6
      }
    },

    toggleSeat (seat) {
      // ✅ solo si existe en BD
      if (!seat?.id) return
      // si su estao es pado no se puede selecionar
      if (seat.status === 'PAGADO') return
      // si es bloqueado
      if (seat.status === 'BLOQUEADO') return

      const id = seat.id
      const idx = this.selectedIds.indexOf(id)

      if (idx === -1) this.selectedIds = [...this.selectedIds, id]
      else {
        const copy = [...this.selectedIds]
        copy.splice(idx, 1)
        this.selectedIds = copy
      }
    },

    clearSelection () {
      this.selectedIds = []
    },

    openBulkDialog () {
      this.bulkForm.cliente_nombre = ''
      this.bulkForm.cliente_celular = ''
      this.bulkForm.monto_total = null
      if (this.selectedIds.length === 0) return
      this.bulkDialog.open = true
    },

    load () {
      this.loading = true

      this.$axios.get(`mis-graderias/${this.graderiaId}/venta`)
        .then(r => {
          const payload = r.data
          this.graderia = payload.graderia

          this.seatsDB = payload.asientos || []
          this.asientosCount = Number(payload.total || this.seatsDB.length || 0)

          const map = {}
          for (const s of this.seatsDB) {
            map[s.codigo] = s
          }
          this.seatDBMap = map

          this.selectedIds = []
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo cargar'))
        .finally(() => { this.loading = false })
    },

    applyBulk (estado) {
      if (this.selectedIds.length === 0) return

      if (estado === 'RESERVADO' || estado === 'PAGADO') {
        if (!this.bulkForm.cliente_nombre || !this.bulkForm.cliente_celular) {
          this.$alert.error('Completa nombre y celular para reservar/pagar.')
          return
        }
        if (this.bulkForm.monto_total === null || this.bulkForm.monto_total === '' || isNaN(Number(this.bulkForm.monto_total))) {
          this.$alert.error('Coloca un monto TOTAL para reservar/pagar.')
          return
        }
      }

      this.saving = true
      this.actionRunning = estado

      const payload = {
        seat_ids: this.selectedIds,
        estado,
        cliente_nombre: this.bulkForm.cliente_nombre || null,
        cliente_celular: this.bulkForm.cliente_celular || null,
        monto_total: (this.bulkForm.monto_total === null || this.bulkForm.monto_total === '' || isNaN(Number(this.bulkForm.monto_total)))
          ? null
          : Number(this.bulkForm.monto_total)
      }

      this.$axios.post(`mis-graderias/${this.graderiaId}/asientos/bulk`, payload)
        .then(r => {
          const updated = r.data?.updated || []

          // refrescar mapas
          const dbMap = { ...this.seatDBMap }
          for (const u of updated) dbMap[u.codigo] = u
          this.seatDBMap = dbMap

          // refresca arreglo seatsDB para stats
          const tmp = {}
          for (const s of this.seatsDB) tmp[s.id] = s
          for (const u of updated) tmp[u.id] = u
          this.seatsDB = Object.values(tmp)

          this.$alert.success(`Actualizado: ${updated.length} asiento(s)`)
          this.clearSelection()
          this.bulkDialog.open = false
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo actualizar'))
        .finally(() => {
          this.saving = false
          this.actionRunning = ''
        })
    }
  }
}
</script>
