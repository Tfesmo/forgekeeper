import { createApp } from "vue";

import { applyTheme, getUserOverrides } from "../../themes/manager.js";
import App from "./App.vue";

applyTheme(getUserOverrides());

createApp(App).mount("#app");
