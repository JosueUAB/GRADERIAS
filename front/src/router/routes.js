const routes = [
  {
    path: '/g/:code',
    component: () => import('layouts/PublicLayout.vue'),
    children: [
      { path: '', component: () => import('pages/graderias/PublicGraderia.vue') }
    ]
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue'), meta: {requiresAuth: true} },
      {
        path: '/usuarios',
        component: () => import('pages/usuarios/Usuarios.vue'),
        meta: {requiresAuth: true, perm: 'Usuarios'}
      },
      {
        path: '/mis-graderias',
        component: () => import('pages/graderias/MisGraderias.vue'),
        meta: { requiresAuth: true, perm: 'Graderias' }
      },
      {
        path: '/mis-graderias/nueva',
        component: () => import('pages/graderias/GraderiaForm.vue'),
        meta: { requiresAuth: true, perm: 'Graderias' }
      },
      {
        path: '/mis-graderias/:id',
        component: () => import('pages/graderias/GraderiaForm.vue'),
        meta: { requiresAuth: true, perm: 'Graderias' }
      },
      {
        path: '/mis-graderias/:id/venta',
        component: () => import('pages/graderias/GraderiaVenta.vue'),
        meta: { requiresAuth: true, perm: 'Graderias' }
      },
      // to="/cambiar-contrasena"
      {
        path:'/cambiar-contrasena',
        component: () => import('pages/cambiar-contrasena/CambiarContrasena.vue'),
        meta: { requiresAuth: true }
      }

    ]
  },
  {
    path: '/login',
    component: () => import('layouts/Login.vue'),
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
