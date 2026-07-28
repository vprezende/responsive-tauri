<script>

  import { ref } from 'vue';

  export default {
    setup() {
      const url = ref('');
      const currentUrl = ref('');
      const hasNavigated = ref(false);

      const minWidth = ref(320);
      const currentWidth = ref(1000);
      const deviceContainer = ref(null);
      const wrapper = ref(null);
      const webview = ref(null);

      const activeTab = ref('viewport');

      const loadUrl = async () => {
        
        let finalUrl = url.value.trim()
        
        if (!finalUrl) {
          return
        }

        const protocols = ['http://', 'https://']

        const hasProtocol = protocols.some(
          p => finalUrl.startsWith(p)
        )
        
        if (hasProtocol) {
          currentUrl.value = finalUrl
          hasNavigated.value = true
          return
        }

        let prefix = ''

        try {
          new URL('http://' + finalUrl)
          prefix = 'http://'
        } catch {
          new URL('https://' + finalUrl)
          prefix = 'https://'
        }

        if (prefix) {
          finalUrl = prefix + finalUrl
        }

        currentUrl.value = finalUrl
        hasNavigated.value = true
      };

      const state = {
        url,
        currentUrl,
        hasNavigated,
        minWidth,
        currentWidth,
        activeTab,
      }

      const elements = {
        deviceContainer,
        wrapper,
        webview,
      }

      const actions = {
        loadUrl,
      }

      return {
        ...state,
        ...elements,
        ...actions
      };
    },
  };
</script>

<template>
  <div class="simulator-layout">
    <aside class="sidebar">
      <div
        class="drag-region"
        data-tauri-drag-region
      />
      <div class="sidebar-inner">
        <div class="tab-bar">
          <button 
            class="tab" 
            :class="{ active: activeTab === 'viewport' }"
            @click="activeTab = 'viewport'"
          >
            Viewport
          </button>
          <button 
            class="tab" 
            :class="{ active: activeTab === 'inspect' }"
            @click="activeTab = 'inspect'"
          >
            Inspect
          </button>
        </div>

        <div class="tab-content">
          <div v-if="activeTab === 'viewport'">
            <div class="section">
              <div class="section-title">
                URL
              </div>
              <div class="url-row">
                <input 
                  v-model="url" 
                  type="text" 
                  placeholder="https://..." 
                  class="url-input"
                >
                <button 
                  class="btn-icon" 
                  title="Carregar" 
                  @click="loadUrl"
                >
                  &#x27A4;
                </button>
              </div>
            </div>
            <div class="section">
              <div class="section-title">
                Layout
              </div>
              <input 
                v-model.number="currentWidth"
                type="range"
                :min="minWidth"
                max="1920"
                class="width-slider"
              >
              <div class="size-row">
                <span class="size-value">{{ Math.round(currentWidth) }}px</span>
              </div>
            </div>
          </div>

          <div 
            v-if="activeTab === 'inspect'" 
            class="section"
          />
        </div>
      </div>
    </aside>
    
    <main class="simulator-canvas">
      <div 
        v-if="!hasNavigated" 
        class="welcome-screen"
      >
        <h1>Responsive Simulator</h1>
        <p>Digite a URL de qualquer site acima para iniciar a simulação.</p>
      </div>

      <div 
        v-show="hasNavigated"
        ref="deviceContainer"
        class="device-container"
        :style="{ width: currentWidth + 'px' }"
      >
        <div class="size-info">
          {{ Math.round(currentWidth) }} px
        </div>
        <div 
          ref="wrapper" 
          class="webview-wrapper"
        >
          <iframe 
            v-if="hasNavigated"
            ref="webview"
            :key="currentUrl"
            :src="currentUrl"
            class="webview-frame"
            frameborder="0"
          />
        </div>
      </div>
    </main>
  </div>
</template>
