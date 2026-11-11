<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="bg-white text-black" bordered>
      <q-toolbar>
        <q-icon name="stadium" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-medium">Estos son los asientos disponibles en: </div>
        <q-space />
        <q-badge color="primary" outline>Vista publico</q-badge>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
export default {
  name: 'PublicLayout'
}
</script>
