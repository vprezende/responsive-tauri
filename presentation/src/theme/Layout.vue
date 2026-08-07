<script>
  import { ref } from 'vue';
  import { useLayoutController } from '../controllers/LayoutController.js';
  import { Sun, Moon } from 'lucide-vue-next';

  export default {
    components: {
      Sun,
      Moon,
    },
    setup() {
      const {
        url,
        currentUrl,
        hasNavigated,
        minWidth,
        currentWidth,
        theme,
        toggleTheme,
      } = useLayoutController();

      const webview = ref(null);

      const presets = [
        { label: 'Mobile', width: 375 },
        { label: 'Tablet', width: 768 },
        { label: 'Desktop', width: 1280 },
      ];

      const setPresetWidth = (w) => {
        currentWidth.value = w;
      };

      const loadUrl = async () => {
        let finalUrl = url.value.trim();
        
        if (!finalUrl) {
          return;
        }

        const protocols = ['http://', 'https://'];
        const hasProtocol = protocols.some(
          p => finalUrl.startsWith(p)
        );
        
        if (hasProtocol) {
          currentUrl.value = finalUrl;
          hasNavigated.value = true;
          return;
        }

        let prefix = '';
        try {
          new URL('http://' + finalUrl);
          prefix = 'http://';
        } catch {
          new URL('https://' + finalUrl);
          prefix = 'https://';
        }

        if (prefix) {
          finalUrl = prefix + finalUrl;
        }

        currentUrl.value = finalUrl;
        hasNavigated.value = true;
      };

      const state = {
        url,
        currentUrl,
        hasNavigated,
        minWidth,
        currentWidth,
        theme,
        presets,
      };

      const elements = {
        webview,
      };

      const actions = {
        loadUrl,
        toggleTheme,
        setPresetWidth,
      };

      return {
        ...state,
        ...elements,
        ...actions,
      };
    },
  };
</script>

<template>
  <div
    class="workspace"
    :class="theme"
  >
    <aside class="sidebar">
      <div
        class="titlebar"
        data-tauri-drag-region
      />
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="brand-group">
            <div class="brand-logo">
              C
            </div>
            <span class="title">Cospectra</span>
          </div>
          <button
            class="theme-toggle-btn"
            :title="theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            @click="toggleTheme"
          >
            <Sun 
              v-if="theme === 'dark'"
              :size="18" 
            />
            <Moon 
              v-else 
              :size="18" 
            />
          </button>
        </div>

        <div class="tab-content">
          <div class="section">
            <div class="section-title">
              Target Address
            </div>
            <div class="url-row">
              <input 
                v-model="url" 
                type="text" 
                placeholder="https://example.com" 
                class="url-input"
                @keyup.enter="loadUrl"
              >
              <button 
                class="btn-icon" 
                title="Run Simulation" 
                @click="loadUrl"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line 
                    x1="5"
                    y1="12" 
                    x2="19" 
                    y2="12" 
                  />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              Viewport Bounds
            </div>
            <input 
              v-model.number="currentWidth"
              type="range"
              :min="minWidth"
              max="1920"
              class="width-slider"
            >
            <div class="size-row">
              <span class="size-label">Width</span>
              <span class="size-value">{{ Math.round(currentWidth) }} px</span>
            </div>
            <div class="preset-buttons">
              <button
                v-for="p in presets"
                :key="p.label"
                class="btn-preset"
                :class="{ active: Math.round(currentWidth) === p.width }"
                @click="setPresetWidth(p.width)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
    
    <div class="canvas">
      <div 
        v-if="!hasNavigated" 
        class="welcome-screen"
      >
        <div class="welcome-badge">
          <span>●</span> Multi-viewport Studio
        </div>
        <h1>Cospectra Engine</h1>
        <p>Input a web application URL to test responsive layouts.</p>
      </div>

      <div 
        v-show="hasNavigated"
        class="device-group"
      >
        <div class="size-info">
          <span>Viewport</span>
          <span>•</span>
          <span>{{ Math.round(currentWidth) }} x 100%</span>
        </div>

        <div class="iframe-wrapper">
          <iframe 
            v-if="hasNavigated"
            ref="webview"
            :key="currentUrl"
            :src="currentUrl"
            class="webview-frame"
            :style="{ width: currentWidth + 'px' }"
            frameborder="0"
          />
        </div>
      </div>
    </div>
  </div>
</template>
