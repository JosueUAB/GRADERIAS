<template>
  <q-layout class="login-layout">
    <q-page-container>
      <q-page class="full-height">
        <div class="login-bg-overlay"></div>

        <q-form @submit.prevent="login" class="login-wrap">
          <q-card flat bordered class="login-card">
            <q-card-section class="q-pt-lg text-center">
              <q-img src="logo.png" width="110px" class="q-mb-sm" ratio="1" fit="contain" />
              <br>
              <div class="text-subtitle2 text-grey-7 brand-chip">
                <b>Reserva Tickets</b> · Compra y reserva tus entradas
              </div>
            </q-card-section>

            <q-separator spaced />

            <q-card-section class="q-pt-none">
              <div class="text-h6 text-bold q-mb-xs">Iniciar sesión</div>
              <div class="text-body2 text-grey-7 q-mb-md">
                Compra tus tickets y gestiona tus reservas ingresando con tus credenciales.
              </div>

              <div class="q-mb-sm text-caption text-grey-7">Usuario</div>
              <q-input
                v-model="username"
                outlined
                dense
                placeholder="Ingresa tu usuario"
                :rules="[v => !!v || 'Ingrese su usuario']"
                class="q-mb-md"
              >
                <template v-slot:prepend>
                  <q-icon name="account_circle" size="18px" />
                </template>
              </q-input>

              <div class="q-mb-sm text-caption text-grey-7">Contraseña</div>
              <q-input
                v-model="password"
                outlined
                dense
                :type="showPassword ? 'text' : 'password'"
                placeholder="Ingresa tu contraseña"
                :rules="[v => !!v || 'Ingrese su contraseña']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" size="18px" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility' : 'visibility_off'"
                    size="18px"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <div class="row items-center q-mt-sm q-mb-md">
                <q-checkbox v-model="rememberMe" label="Recuérdame" color="primary" dense />
                <q-space />
                <q-btn
                  flat
                  dense
                  no-caps
                  class="text-weight-medium link-muted"
                  label="¿Olvidaste tu contraseña?"
                  @click="forgotPassword"
                />
              </div>

              <q-btn
                color="primary"
                label="Entrar"
                class="full-width btnLogin"
                no-caps
                unelevated
                size="16px"
                :loading="loading"
                type="submit"
              />
            </q-card-section>

            <q-card-section class="q-pt-none text-center">
              <div class="text-body2">
                ¿Aún no tienes cuenta?
                <q-btn flat dense no-caps class="text-weight-medium" label="Regístrate" @click="goRegister" />
              </div>

              <q-separator spaced />

              <div class="text-caption text-grey-6">
                © {{ year }} Reserva Tickets. Todos los derechos reservados.
              </div>
            </q-card-section>
          </q-card>
        </q-form>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
export default {
  name: 'LoginTickets',
  data () {
    return {
      username: '',
      password: '',
      showPassword: false,
      rememberMe: false,
      loading: false
    }
  },
  computed: {
    year () {
      return new Date().getFullYear()
    }
  },
  methods: {
    login () {
      this.loading = true

      this.$axios.post('/login', {
        username: this.username,
        password: this.password
      })
        .then(res => {
          const { user, token } = res.data

          // set header global
          this.$axios.defaults.headers.common.Authorization = `Bearer ${token}`

          // store global (si lo usas en tu proyecto)
          if (this.$store) {
            this.$store.isLogged = true
            this.$store.user = user
            this.$store.permissions = (user.permissions || []).map(p => p.name)
          }

          // token key para tickets
          localStorage.setItem('tokenTicket', token)
          localStorage.setItem('user', JSON.stringify(user))

          if (this.$alert && this.$alert.success) {
            this.$alert.success('Bienvenido', user?.name || '')
          }

          // ir al home (o al panel)
          this.$router.push('/')
        })
        .catch(err => {
          const msg = err?.response?.data?.message || 'Error de autenticación'
          if (this.$alert && this.$alert.error) this.$alert.error(msg, 'Error')
        })
        .finally(() => {
          this.loading = false
        })
    },

    forgotPassword () {
      // Ajusta a tu ruta real si tienes flujo de recuperación
      // this.$router.push('/forgot-password')
      if (this.$alert && this.$alert.info) this.$alert.info('Función no disponible por ahora')
    },

    goRegister () {
      // Ajusta a tu ruta real de registro
      // this.$router.push('/register')
      if (this.$alert && this.$alert.info) this.$alert.info('Registro no disponible por ahora')
    }
  }
}
</script>

<style scoped>
/* ===== Fondo ===== */
.login-layout {
  background-image: url('./../bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
}
.full-height { min-height: 100vh; position: relative; }
.login-bg-overlay {
  position: absolute; inset: 0;
  backdrop-filter: blur(3px);
  background: radial-gradient(1200px 800px at 70% 40%, rgba(0,0,0,0.12), rgba(0,0,0,0.25));
}

/* ===== Wrapper / Card ===== */
.login-wrap {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 12px;
  display: flex;
  align-items: center;
  min-height: 100vh;
}
.login-card {
  width: 100%;
  border-radius: 18px;
  background: rgba(255,255,255,0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow:
    0 10px 25px rgba(0,0,0,0.08),
    0 2px 8px rgba(0,0,0,0.05);
}

/* ===== Tipografía & detalles ===== */
.brand-chip {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
}
.link-muted { color: #6b7280 !important; }
.link-muted:hover { color: var(--q-primary) !important; }

/* ===== Botón ===== */
.btnLogin {
  height: 42px;
  border-radius: 10px;
  transition: all .25s ease;
}
.btnLogin:hover {
  background-color: #fff !important;
  color: var(--q-primary) !important;
  outline: 1px solid var(--q-primary) !important;
}

/* ===== Responsivo ===== */
@media (max-width: 768px) {
  .login-wrap { max-width: 92vw; padding: 16px 8px; }
  .login-card { border-radius: 14px; }
}
</style>
