<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin q-pa-lg text-center">
      <!-- Icono de verificación -->
      <!--      <q-icon name="check_circle" color="green" size="xl" class="q-mb-md" />-->
      <!--      icon de confimacion-->
      <q-icon :name="icon" :color="color" size="120px" class="q-mb-md" />
      <!-- Mensaje principal -->
      <div class="text-h6 text-bold">
        {{ title }}
      </div>

      <!-- Mensaje secundario -->
      <div class="text-subtitle1 text-grey-7 q-mt-sm">
        {{ message }}
      </div>

      <!-- Botón de acción -->
      <q-card-section>
        <div class="row">
          <div class="col-6">
            <q-btn color="red" label="Cancelar" @click="onDialogHide" rounded unelevated class="full-width text-white" no-caps/>
          </div>
          <div class="col-6">
            <q-btn color="green" label="OK" @click="onOKClick" rounded unelevated class="full-width text-white" no-caps />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from 'quasar'
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
defineProps({
  title: String,
  message: String,
  icon: String,
  color: String
})
function onOKClick() {
  onDialogOK()
}
</script>

<style scoped>
.q-dialog-plugin {
  max-width: 400px;
  border-radius: 12px;
}
</style>
