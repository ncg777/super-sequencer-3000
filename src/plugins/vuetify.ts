/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#151612',
          surface: '#1c1e19',
          'surface-bright': '#303229',
          'surface-light': '#272920',
          'surface-variant': '#3b3b2f',
          'on-surface': '#e8dfc8',
          primary: '#f2b84b',
          'on-primary': '#231b0c',
          secondary: '#5da69a',
          'on-secondary': '#0b211e',
          info: '#72a9a0',
          success: '#9eaa69',
          warning: '#e6a23c',
          error: '#d85b4d',
        },
      },
    },
  },
})
