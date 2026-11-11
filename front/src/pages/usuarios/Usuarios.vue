<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center">
        <div>
          <div class="text-h6 text-title">Usuarios</div>
          <div class="text-caption text-grey-7">Gestión de usuarios, roles, permisos y avatar</div>
        </div>
        <q-space />
        <q-input v-model="filter" label="Buscar" dense outlined debounce="300" style="width: 280px">
          <template v-slot:append><q-icon name="search" /></template>
        </q-input>
      </q-card-section>
    </q-card>

    <q-table
      :rows="users"
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
    >
      <template v-slot:top-right>
        <q-btn
          color="positive"
          label="Nuevo"
          no-caps
          icon="add_circle_outline"
          :loading="loading"
          class="q-mr-sm"
          @click="userNew"
        />
        <q-btn
          color="primary"
          label="Actualizar"
          no-caps
          icon="refresh"
          :loading="loading"
          @click="usersGet"
        />
      </template>

      <!-- acciones -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn-dropdown label="Opciones" no-caps size="10px" dense color="primary">
            <q-list>
              <q-item clickable v-close-popup @click="userEdit(props.row)">
                <q-item-section avatar><q-icon name="edit" /></q-item-section>
                <q-item-section><q-item-label>Editar</q-item-label></q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="userEditPassword(props.row)">
                <q-item-section avatar><q-icon name="lock_reset" /></q-item-section>
                <q-item-section><q-item-label>Cambiar contraseña</q-item-label></q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="cambiarAvatar(props.row)">
                <q-item-section avatar><q-icon name="image" /></q-item-section>
                <q-item-section><q-item-label>Cambiar avatar</q-item-label></q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="permisosShow(props.row)">
                <q-item-section avatar><q-icon name="lock" /></q-item-section>
                <q-item-section><q-item-label>Permisos</q-item-label></q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup @click="userDelete(props.row.id)">
                <q-item-section avatar><q-icon name="delete" /></q-item-section>
                <q-item-section><q-item-label>Eliminar</q-item-label></q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </q-td>
      </template>

      <!-- avatar -->
      <template v-slot:body-cell-avatar="props">
        <q-td :props="props">
          <q-avatar rounded size="42px">
            <q-img v-if="props.row.avatar" :src="imgUser(props.row.avatar)" />
            <q-icon v-else name="person" size="28px" />
          </q-avatar>
        </q-td>
      </template>

      <!-- role -->
      <template v-slot:body-cell-role="props">
        <q-td :props="props">
          <q-chip
            :label="props.row.role"
            :color="$filters.color(props.row.role)"
            text-color="white"
            dense
            size="13px"
          />
        </q-td>
      </template>

      <!-- permissions -->
      <template v-slot:body-cell-permissions="props">
        <q-td :props="props">
          <div class="row items-center q-col-gutter-xs">
            <q-chip
              v-for="(perm, idx) in (props.row.permissions || []).slice(0, 3)"
              :key="perm.id || idx"
              dense
              color="grey-3"
              text-color="black"
              size="12px"
              class="q-mr-xs q-mb-xs"
            >
              {{ perm.name }}
            </q-chip>

            <template v-if="(props.row.permissions || []).length > 3">
              <q-badge outline color="primary" class="q-ml-xs">
                +{{ (props.row.permissions || []).length - 3 }}
                <q-tooltip anchor="top middle" self="bottom middle" :offset="[0,8]">
                  <div class="text-left">
                    <div v-for="perm in props.row.permissions" :key="perm.id">• {{ perm.name }}</div>
                  </div>
                </q-tooltip>
              </q-badge>
            </template>

            <q-badge v-if="!(props.row.permissions || []).length" color="grey-5" outline>
              Sin permisos
            </q-badge>
          </div>
        </q-td>
      </template>
    </q-table>

    <!-- DIALOG: CREAR / EDITAR -->
    <q-dialog v-model="userDialog" persistent>
      <q-card style="width: 420px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">
            {{ user.id ? 'Editar usuario' : 'Nuevo usuario' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense @click="userDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <q-form @submit.prevent="user.id ? userPut() : userPost()">
            <q-input v-model="user.name" label="Nombre" dense outlined :rules="[req]" class="q-mb-sm" />
            <q-input v-model="user.username" label="Usuario" dense outlined :rules="[req]" class="q-mb-sm" />
            <q-input v-model="user.email" label="Email" dense outlined type="email" class="q-mb-sm" />
            <q-input v-model="user.telefono_contacto_1" label="Teléfono de contacto 1" dense outlined class="q-mb-sm" />
            <q-input v-model="user.telefono_contacto_2" label="Teléfono de contacto 2" dense outlined class="q-mb-sm" />

            <q-input
              v-if="!user.id"
              v-model="user.password"
              label="Contraseña"
              dense
              outlined
              type="password"
              :rules="[req]"
              class="q-mb-sm"
            />

            <q-select
              v-model="user.role"
              label="Rol"
              dense
              outlined
              :options="roles"
              :rules="[req]"
              class="q-mb-md"
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn color="negative" label="Cancelar" no-caps flat @click="userDialog = false" :disable="loading" />
              <q-btn color="primary" label="Guardar" no-caps type="submit" :loading="loading" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- DIALOG: CAMBIAR AVATAR -->
    <q-dialog v-model="cambioAvatarDialogo" persistent>
      <q-card style="width: 420px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none text-weight-bold">
          Cambiar avatar
          <q-space />
          <q-btn icon="close" flat round dense @click="cambioAvatarDialogo = false" />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="row items-start q-col-gutter-md">
            <div class="col-12">
              <div class="avatar-box">
                <q-btn
                  icon="edit"
                  size="10px"
                  class="absolute q-mt-sm q-ml-sm"
                  @click="$refs.fileInput.click()"
                  dense
                  outline
                  label="Cambiar foto"
                  no-caps
                />
                <img v-if="user.avatar" :src="imgUser(user.avatar)" class="avatar-img" />
                <div v-else class="row items-center justify-center avatar-img">
                  <q-icon name="person" size="88px" />
                </div>
                <input ref="fileInput" type="file" style="display:none" @change="onFileChange" accept="image/*" />
              </div>
            </div>
          </div>

          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn color="negative" label="Cancelar" no-caps flat @click="cambioAvatarDialogo = false" :disable="loading" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- DIALOG: PERMISOS -->
    <q-dialog v-model="dialogPermisos" persistent>
      <q-card style="min-width: 420px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-none text-weight-bold">
          Permisos de {{ user.username }}
          <q-space />
          <q-btn icon="close" flat round dense @click="dialogPermisos = false" />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <q-input v-model="permFilter" dense outlined placeholder="Filtrar permisos..." class="q-mb-sm">
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>

          <q-list dense bordered class="rounded-borders">
            <q-item v-for="perm in filteredPermissions" :key="perm.id">
              <q-item-section>{{ perm.name }}</q-item-section>
              <q-item-section side>
                <q-toggle v-model="perm.checked" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn color="negative" label="Cancelar" no-caps flat @click="dialogPermisos = false" :disable="loading" />
          <q-btn color="primary" label="Guardar" no-caps @click="permisosPost" :loading="loading" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script>
export default {
  name: 'UsuariosPage',
  data () {
    return {
      users: [],
      user: {},
      userDialog: false,
      loading: false,
      filter: '',

      roles: ['Administrador', 'Soporte', 'Operador', 'Cliente'],

      columns: [
        { name: 'actions', label: 'Acciones', align: 'center' },
        { name: 'avatar', label: 'Avatar', align: 'left', field: row => row.avatar },
        { name: 'name', label: 'Nombre', align: 'left', field: 'name' },
        { name: 'username', label: 'Usuario', align: 'left', field: 'username' },
        { name: 'email', label: 'Email', align: 'left', field: 'email' },
        { name: 'telefono_contacto_1', label: 'Contacto 1', align: 'left', field: 'telefono_contacto_1' },
        { name: 'telefono_contacto_2', label: 'Contacto 2', align: 'left', field: 'telefono_contacto_2' },
        { name: 'role', label: 'Rol', align: 'left', field: 'role' },
        {
          name: 'permissions',
          label: 'Permisos',
          align: 'left',
          field: row => (row.permissions || []).map(p => p.name).join(', ')
        }
      ],

      // permisos
      permissions: [],
      dialogPermisos: false,
      permFilter: '',

      // avatar
      cambioAvatarDialogo: false
    }
  },

  mounted () {
    this.usersGet()
  },

  computed: {
    filteredPermissions () {
      if (!this.permFilter) return this.permissions
      const t = this.permFilter.toLowerCase()
      return this.permissions.filter(p => p.name.toLowerCase().includes(t))
    }
  },

  methods: {
    req (v) {
      return !!v || 'Campo requerido'
    },

    imgUser (avatar) {
      return `${this.$url}../../images/${avatar}`
    },

    // CRUD
    userNew () {
      this.user = {
        name: '',
        username: '',
        email: '',
        telefono_contacto_1: '',
        telefono_contacto_2: '',
        password: '',
        role: 'Operador'
      }
      this.userDialog = true
    },

    userEdit (u) {
      this.user = {
        ...u,
        telefono_contacto_1: u.telefono_contacto_1 || '',
        telefono_contacto_2: u.telefono_contacto_2 || ''
      }
      this.userDialog = true
    },

    usersGet () {
      this.loading = true
      this.$axios.get('users')
        .then(res => { this.users = res.data })
        .catch(e => this.$alert.error(e.response?.data?.message || 'Error cargando usuarios'))
        .finally(() => { this.loading = false })
    },

    userPost () {
      this.loading = true
      this.$axios.post('users', this.user)
        .then(() => {
          this.userDialog = false
          this.$alert.success('Usuario creado')
          this.usersGet()
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo crear'))
        .finally(() => { this.loading = false })
    },

    userPut () {
      this.loading = true
      this.$axios.put(`users/${this.user.id}`, this.user)
        .then(() => {
          this.userDialog = false
          this.$alert.success('Usuario actualizado')
          this.usersGet()
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo actualizar'))
        .finally(() => { this.loading = false })
    },

    userDelete (id) {
      this.$alert.dialog('¿Desea eliminar el usuario?')
        .onOk(() => {
          this.loading = true
          this.$axios.delete(`users/${id}`)
            .then(() => {
              this.$alert.success('Usuario eliminado')
              this.usersGet()
            })
            .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo eliminar'))
            .finally(() => { this.loading = false })
        })
    },

    userEditPassword (u) {
      this.user = { ...u }
      this.$alert.dialogPrompt('Nueva contraseña', 'Ingrese la nueva contraseña', 'password')
        .onOk(password => {
          this.loading = true
          this.$axios.put(`updatePassword/${u.id}`, { password })
            .then(() => {
              this.$alert.success('Contraseña actualizada')
              this.usersGet()
            })
            .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo actualizar'))
            .finally(() => { this.loading = false })
        })
    },

    // Avatar
    cambiarAvatar (u) {
      this.user = { ...u }
      this.cambioAvatarDialogo = true
    },

    onFileChange (event) {
      const file = event.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('avatar', file)

      this.loading = true
      this.$axios.post(`${this.user.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
        .then(() => {
          this.cambioAvatarDialogo = false
          this.$alert.success('Avatar actualizado')
          this.usersGet()
        })
        .catch(e => this.$alert.error(e.response?.data?.message || 'No se pudo subir avatar'))
        .finally(() => { this.loading = false })
    },

    // Permisos
    async permisosShow (u) {
      this.user = { ...u }
      this.dialogPermisos = true
      this.loading = true
      try {
        const all = await this.$axios.get('permissions').then(r => r.data)
        const userPermIds = await this.$axios.get(`users/${u.id}/permissions`).then(r => r.data)

        this.permissions = all.map(p => ({
          ...p,
          checked: userPermIds.includes(p.id)
        }))
      } catch (e) {
        this.$alert.error(e.response?.data?.message || 'Error cargando permisos')
      } finally {
        this.loading = false
      }
    },

    async permisosPost () {
      this.loading = true
      try {
        const ids = this.permissions.filter(p => p.checked).map(p => p.id)
        await this.$axios.put(`users/${this.user.id}/permissions`, { permissions: ids })
        this.dialogPermisos = false
        this.$alert.success('Permisos actualizados')
        this.usersGet()
      } catch (e) {
        this.$alert.error(e.response?.data?.message || 'No se pudo guardar permisos')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.avatar-box {
  position: relative;
  width: 100%;
}
.avatar-img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.08);
  background: #f6f7f9;
}
</style>
