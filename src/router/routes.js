const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') }
    ]
  },
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),  // ✅ Use layout
    children: [
      {
        path: '',
        component: () => import('pages/LoginPage.vue'),
        meta: { requiresGuest: true, title: 'Login' }
      }
    ]
  },
  {
    path: '/register',
    component: () => import('layouts/AuthLayout.vue'),  // ✅ Use layout
    children: [
      {
        path: '',
        component: () => import('pages/RegisterPage.vue'),
        meta: { requiresGuest: true, title: 'Register' }
      }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]
export default routes
