<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section class="row items-center q-py-sm">
            <div>
              <div class="text-h6 text-weight-bold">Cambiar contraseña</div>
              <div class="text-caption text-grey-7">
                Al guardar se cerrarán todas las sesiones (incluyéndote).
              </div>
            </div>
            <q-space />
            <q-icon name="vpn_key" color="primary" size="28px" />
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-md">
            <q-form @submit.prevent="submit">
              <q-input
                v-model="form.current_password"
                dense outlined
                :type="showCurrent ? 'text' : 'password'"
                label="Contraseña actual"
                autocomplete="current-password"
                class="q-mb-sm"
                :rules="[v => !!v || 'Requerido']"
              >
                <template #append>
                  <q-btn dense flat round :icon="showCurrent ? 'visibility' : 'visibility_off'" @click="showCurrent = !showCurrent" />
                </template>
              </q-input>

              <q-input
                v-model="form.password"
                dense outlined
                :type="showNew ? 'text' : 'password'"
                label="Nueva contraseña"
                autocomplete="new-password"
                class="q-mb-sm"
                :rules="[v => (v && v.length >= 6) || 'Mínimo 6 caracteres']"
              >
                <template #append>
                  <q-btn dense flat round :icon="showNew ? 'visibility' : 'visibility_off'" @click="showNew = !showNew" />
                </template>
              </q-input>

              <q-input
                v-model="form.password_confirmation"
                dense outlined
                :type="showConfirm ? 'text' : 'password'"
                label="Confirmar nueva contraseña"
                autocomplete="new-password"
                class="q-mb-md"
                :rules="[
                  v => !!v || 'Requerido',
                  v => v === form.password || 'No coincide'
                ]"
              >
                <template #append>
                  <q-btn dense flat round :icon="showConfirm ? 'visibility' : 'visibility_off'" @click="showConfirm = !showConfirm" />
                </template>
              </q-input>

              <q-banner dense class="bg-grey-1 q-mb-md">
                <div class="text-caption text-grey-7">
                  Nota: al cambiar la contraseña, se eliminarán todos los tokens de Sanctum para evitar sesiones abiertas.
                </div>
              </q-banner>

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-btn
                    class="full-width"
                    no-caps
                    color="primary"
                    icon="save"
                    label="Guardar"
                    type="submit"
                    :loading="loading"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-btn
                    class="full-width"
                    no-caps
                    flat
                    color="grey-8"
                    icon="arrow_back"
                    label="Volver"
                    @click="$router.push('/')"
                    :disable="loading"
                  />
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
export default {
  name: 'CambiarContrasena',
  data () {
    return {
      loading: false,
      showCurrent: false,
      showNew: false,
      showConfirm: false,
      form: {
        current_password: '',
        password: '',
        password_confirmation: ''
      }
    }
  },
  methods: {
    async submit () {
      this.loading = true
      try {
        await this.$axios.post('/me/password', this.form)

        // ✅ como el backend revocó todos los tokens, este token ya no sirve
        this.$alert.success('Contraseña actualizada. Inicia sesión nuevamente.')

        this.$store.isLogged = false
        this.$store.user = {}
        this.$store.permissions = []
        localStorage.removeItem('tokenSIL')

        this.$router.push('/login')
      } catch (e) {
        this.$alert.error(e.response?.data?.message || 'No se pudo cambiar la contraseña')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
