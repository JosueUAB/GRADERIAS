import { defineBoot } from '#q-app/wrappers'
import { createI18n } from 'vue-i18n'

import es from 'src/i18n/es.json'
import en from 'src/i18n/en.json'

export default defineBoot(({ app }) => {
  const saved = localStorage.getItem('lang') || 'es'

  const i18n = createI18n({
    legacy: false,
    globalInjection: true, // <-- IMPORTANTE para usar $t() sin importar nada
    locale: saved,
    fallbackLocale: 'es',
    messages: { es, en }
  })

  app.use(i18n)

  app.config.globalProperties.$setLang = (lang) => {
    i18n.global.locale.value = lang
    localStorage.setItem('lang', lang)
  }
})
