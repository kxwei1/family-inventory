import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import piniaPersistedState from "pinia-plugin-persistedstate";
import App from "./App.vue";

export function createApp() {
  const app = createSSRApp(App);

  const pinia = createPinia();
  pinia.use(piniaPersistedState);
  app.use(pinia);

  return {
    app,
  };
}
