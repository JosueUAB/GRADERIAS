<template>
  <q-layout view="lHh Lpr lFf">
    <!-- HEADER -->
    <q-header class="bg-white text-black" bordered>
      <q-toolbar>
        <q-btn
          flat
          color="primary"
          :icon="leftDrawerOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          dense
        />

        <div class="row items-center q-gutter-sm">
          <div class="text-subtitle1 text-weight-medium" style="line-height: 0.9">
            Dashboard de Tickets <br>
            <q-badge color="warning" text-color="black" v-if="roleText" class="text-bold">
              {{ roleText }}
            </q-badge>
          </div>
        </div>

        <q-space />

        <div class="row items-center q-gutter-sm">
          <q-btn-dropdown flat unelevated no-caps dropdown-icon="expand_more">
            <template v-slot:label>
              <div class="row items-center no-wrap q-gutter-sm">
                <q-avatar rounded>
                  <q-img
                    v-if="$store.user && $store.user.avatar"
                    :src="`${$url}../../images/${$store.user.avatar}`"
                    width="40px"
                    height="40px"
                  />
                  <q-icon name="person" v-else />
                </q-avatar>

                <div class="text-left" style="line-height: 1">
                  <div class="ellipsis" style="max-width: 130px;">
                    {{ $store.user ? $store.user.username : '' }}
                  </div>
                  <q-chip
                    dense
                    size="10px"
                    :color="$filters.color($store.user ? $store.user.role : '')"
                    text-color="white"
                  >
                    {{ $store.user ? $store.user.role : '' }}
                  </q-chip>
                </div>
              </div>
            </template>

            <q-item clickable v-close-popup>
              <q-item-section>
                <q-item-label class="text-grey-7">
                  Permisos asignados
                </q-item-label>
                <q-item-label caption class="q-mt-xs">
                  <div class="row q-col-gutter-xs" style="min-width: 150px; max-width: 150px;">
                    <q-chip
                      v-for="(p, i) in $store.permissions"
                      :key="i"
                      dense
                      color="grey-3"
                      text-color="black"
                      size="12px"
                      class="q-mr-xs q-mb-xs"
                    >
                      {{ p }}
                    </q-chip>
                    <q-badge v-if="!$store.permissions || !$store.permissions.length" color="grey-5" outline>
                      Sin permisos
                    </q-badge>
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />
<!--            cambiar contrseña-->
            <q-item clickable v-close-popup @click="$router.push('/cambiar-contrasena')">
              <q-item-section avatar>
                <q-icon name="vpn_key" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Cambiar Contraseña</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple @click="logout" v-close-popup>
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Salir</q-item-label>
              </q-item-section>
            </q-item>
          </q-btn-dropdown>
        </div>
      </q-toolbar>
    </q-header>

    <!-- DRAWER -->
    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      show-if-above
      :width="220"
      :breakpoint="500"
      class="bg-primary text-white"
    >
      <q-list class="q-pb-none">
        <q-item-label header class="text-center q-pa-none q-pt-md">
          <q-avatar size="64px" class="q-mb-sm bg-white" rounded>
            <q-img src="/logo.png" width="90px" />
          </q-avatar>
          <div class="text-weight-bold text-white">TICKETS</div>
          <div class="text-caption text-white">Sistema de Gestión</div>
        </q-item-label>

        <q-item-label header class="q-px-md text-grey-3 q-mt-sm">
          Módulos del Sistema
        </q-item-label>

        <!-- DASHBOARD -->
        <q-item
          dense
          to="/"
          exact
          clickable
          class="menu-item"
          active-class="menu-active"
          v-close-popup
          v-if="hasPermission('Dashboard')"
        >
          <q-item-section avatar>
            <q-icon name="dashboard" class="text-white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <!-- USUARIOS -->
        <q-item
          dense
          to="/usuarios"
          exact
          clickable
          class="menu-item"
          active-class="menu-active"
          v-close-popup
          v-if="hasPermission('Usuarios')"
        >
          <q-item-section avatar>
            <q-icon name="people" class="text-white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Usuarios</q-item-label>
          </q-item-section>
        </q-item>

        <!-- ========================= -->
        <!-- GRADERÍAS (NUEVO MÓDULO) -->
        <!-- ========================= -->

        <!-- MIS GRADERÍAS -->
        <q-item
          dense
          to="/mis-graderias"
          exact
          clickable
          class="menu-item"
          active-class="menu-active"
          v-close-popup
          v-if="hasPermission('Graderias')"
        >
          <q-item-section avatar>
            <q-icon name="stadium" class="text-white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Mis graderías</q-item-label>
          </q-item-section>
        </q-item>

        <!-- CREAR GRADERÍA -->
        <q-item
          dense
          to="/mis-graderias/nueva"
          exact
          clickable
          class="menu-item"
          active-class="menu-active"
          v-close-popup
          v-if="hasPermission('Graderias')"
        >
          <q-item-section avatar>
            <q-icon name="add_box" class="text-white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Nueva gradería</q-item-label>
          </q-item-section>
        </q-item>
<!--        cambiar contraseña-->
        <q-item
          dense
          to="/cambiar-contrasena"
          exact
          clickable
          class="menu-item"
          active-class="menu-active"
          v-close-popup
        >
          <q-item-section avatar>
            <q-icon name="vpn_key" class="text-white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Cambiar Contraseña</q-item-label>
          </q-item-section>
        </q-item>

        <!-- FOOTER -->
        <div class="q-pa-md">
          <div class="text-white-7 text-caption">
            Tickets v{{ $version }}
          </div>
          <div class="text-white-7 text-caption">
            © {{ new Date().getFullYear() }} Sistema de Tickets
          </div>
        </div>

        <q-item clickable class="text-white" @click="logout" v-close-popup>
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Salir</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- PAGE -->
    <q-page-container class="bg-grey-2">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
export default {
  name: 'MainLayout',
  data () {
    return {
      leftDrawerOpen: false
    }
  },
  mounted () {
    // this.fetchMenuEventos()
  },
  computed: {
    roleText () {
      const role = this.$store && this.$store.user ? this.$store.user.role : ''
      if (!role) return ''
      return role
    }
  },
  methods: {
    // fetchMenuEventos () {
    //   this.$axios.get('/eventosMenu')
    //     .then(res => {
    //       this.$store.menuEventosByPais = res.data.items || []
    //     })
    //     .catch(() => {
    //       this.$store.menuEventosByPais = []
    //     })
    // },
    toggleLeftDrawer () {
      this.leftDrawerOpen = !this.leftDrawerOpen
    },
    hasPermission (perm) {
      return this.$store && this.$store.permissions
        ? this.$store.permissions.includes(perm)
        : false
    },
    logout () {
      this.$alert.dialog('¿Desea salir del sistema?')
        .onOk(() => {
          this.$axios.post('/logout')
            .then(() => {
              this.$store.isLogged = false
              this.$store.user = {}
              this.$store.permissions = []
              localStorage.removeItem('tokenSIL')
              this.$router.push('/login')
            })
            .catch(() => {
              this.$store.isLogged = false
              this.$store.user = {}
              this.$store.permissions = []
              localStorage.removeItem('tokenSIL')
              this.$router.push('/login')
            })
        })
    }
  }
}
</script>

<style scoped>
.menu-item {
  border-radius: 10px;
  margin: 4px 8px;
  padding: 4px 6px;
}
.menu-active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff !important;
  border-radius: 10px;
}
</style>
