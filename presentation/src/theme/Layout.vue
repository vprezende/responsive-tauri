<script>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import { useLayoutController } from '../controllers/LayoutController.js';

  export default {
    setup() {
      const {
        url,
        currentUrl,
        hasNavigated,
        minWidth,
        currentWidth,
        activeTab,
        theme,
        toggleTheme,
      } = useLayoutController();

      const webview = ref(null);
      const isInspecting = ref(false);
      const selectedElement = ref(null);
      const selectedBox = ref(null);
      const hoverBox = ref(null);
      const stylesViewMode = ref('block'); // 'block' (Figma) or 'code' (CSS)

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

      const toggleInspectMode = () => {
        isInspecting.value = !isInspecting.value;
        if (!isInspecting.value) {
          hoverBox.value = null;
        }
        // Notify the iframe's injected inspector script about mode change
        sendInspectToggle(isInspecting.value);
      };

      // Send inspect mode state to the iframe via postMessage
      const sendInspectToggle = (enabled) => {
        if (webview.value && webview.value.contentWindow) {
          webview.value.contentWindow.postMessage({
            type: 'COSPECTRA_SET_INSPECT',
            enabled: enabled
          }, '*');
        }
      };

      // Receives real-time postMessage events from the injected Tauri iframe script
      const handleWindowMessage = (event) => {
        if (!event.data) return;
        const data = event.data;

        // Real-time URL change monitoring from iframe navigation
        if (data.type === 'COSPECTRA_URL_CHANGED') {
          if (data.url && data.url !== currentUrl.value) {
            url.value = data.url;
            currentUrl.value = data.url;
          }
          return;
        }

        if (data.type !== 'COSPECTRA_INSPECT_DATA') return;
        
        if (data.action === 'hover') {
          if (isInspecting.value) {
            hoverBox.value = {
              top: `${data.rect.top}px`,
              left: `${data.rect.left}px`,
              width: `${data.rect.width}px`,
              height: `${data.rect.height}px`,
              label: data.label,
            };
          }
        } else if (data.action === 'click') {
          selectedBox.value = {
            top: `${data.rect.top}px`,
            left: `${data.rect.left}px`,
            width: `${data.rect.width}px`,
            height: `${data.rect.height}px`,
            label: data.label,
          };

          selectedElement.value = {
            tag: data.tag,
            id: data.idName,
            class: data.className,
            codeSnippet: data.codeSnippet,
            styleGroups: data.styleGroups || {},
          };

          activeTab.value = 'inspect';
          // Lock selection: disable inspect mode after click
          isInspecting.value = false;
          hoverBox.value = null;
          sendInspectToggle(false);
        }
      };

      const handleIframeLoad = () => {
        // After iframe loads, send the current inspect state
        sendInspectToggle(isInspecting.value);
      };

      // Format raw HTML into indented, readable code
      const formattedCode = computed(() => {
        if (!selectedElement.value || !selectedElement.value.codeSnippet) return '';
        const raw = selectedElement.value.codeSnippet;
        // Simple indent: add newlines before opening/closing tags
        let formatted = raw
          .replace(/></g, '>\n<')
          .replace(/(\/>)/g, '$1\n');
        // Basic indentation
        let indent = 0;
        const lines = formatted.split('\n');
        const result = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
          result.push('  '.repeat(indent) + trimmed);
          if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
            indent++;
          }
        }
        return result.join('\n');
      });

      onMounted(() => {
        window.addEventListener('message', handleWindowMessage);
      });

      onUnmounted(() => {
        window.removeEventListener('message', handleWindowMessage);
      });

      const state = {
        url,
        currentUrl,
        hasNavigated,
        minWidth,
        currentWidth,
        activeTab,
        theme,
        presets,
        isInspecting,
        selectedElement,
        selectedBox,
        hoverBox,
        stylesViewMode,
      };

      const elements = {
        webview,
      };

      const derived = {
        formattedCode,
      };

      const actions = {
        loadUrl,
        toggleTheme,
        setPresetWidth,
        toggleInspectMode,
        handleIframeLoad,
      };

      return {
        ...state,
        ...elements,
        ...derived,
        ...actions,
      };
    },
  };
</script>

<template>
  <div
    class="workspace"
    :data-theme="theme"
  >
    <aside class="sidebar">
      <div
        class="titlebar"
        data-tauri-drag-region
      />
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="brand-group">
            <div class="brand-logo">C</div>
            <span class="app-title">Cospectra</span>
          </div>
          <button
            class="theme-toggle-btn"
            :title="theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            @click="toggleTheme"
          >
            <!-- Sun Icon -->
            <svg
              v-if="theme === 'dark'"
              class="icon-sun"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <!-- Moon Icon -->
            <svg
              v-else
              class="icon-moon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>

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
          <!-- VIEWPORT TAB -->
          <div v-if="activeTab === 'viewport'">
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
                    <line x1="5" y1="12" x2="19" y2="12" />
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

          <!-- CHROME DEVTOOLS & FIGMA HYBRID INSPECT TAB -->
          <div 
            v-if="activeTab === 'inspect'" 
            class="devtools-panel"
          >
            <!-- DevTools Toolbar (Chrome Style) -->
            <div class="devtools-toolbar">
              <button 
                class="btn-devtools-inspect"
                :class="{ active: isInspecting }"
                @click="toggleInspectMode"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                  <path d="M13 13l6 6"/>
                </svg>
                <span>{{ isInspecting ? 'Inspecting Mode' : 'Select Element' }}</span>
              </button>
            </div>

            <!-- EMPTY STATE BEFORE ANY ELEMENT CLICKED -->
            <div v-if="!selectedElement" class="empty-inspect">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z"/>
              </svg>
              <p>Turn ON the Inspect button above to select elements on the site webview and inspect code & CSS styles.</p>
            </div>

            <div v-else class="devtools-body">
              <!-- ELEMENT SOURCE CODE BOX (expanded, scrollable) -->
              <div class="devtools-code-box">
                <div class="code-box-header">
                  <span class="code-box-title">Element</span>
                  <span class="code-lang-tag">HTML</span>
                </div>
                <div class="code-box-scroll">
                  <pre class="code-box-pre"><code>{{ formattedCode }}</code></pre>
                </div>
              </div>

              <!-- COMPUTED STYLES: FIGMA BLOCK VIEW + CODE TOGGLE -->
              <div class="devtools-styles-pane" v-if="selectedElement.styleGroups">
                <div class="styles-pane-toolbar">
                  <span class="styles-pane-title">Computed Styles</span>
                  <div class="styles-view-toggle">
                    <button 
                      class="view-toggle-btn" 
                      :class="{ active: stylesViewMode === 'block' }"
                      @click="stylesViewMode = 'block'"
                      title="Block View"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                      </svg>
                    </button>
                    <button 
                      class="view-toggle-btn" 
                      :class="{ active: stylesViewMode === 'code' }"
                      @click="stylesViewMode = 'code'"
                      title="Code View"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"/>
                        <polyline points="8 6 2 12 8 18"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="styles-scroll-container">
                  <!-- FIGMA BLOCK VIEW -->
                  <template v-if="stylesViewMode === 'block'">
                    <div 
                      v-for="(props, groupName) in selectedElement.styleGroups" 
                      :key="groupName"
                      class="figma-group"
                    >
                      <div class="figma-group-title">{{ groupName }}</div>
                      <div class="figma-props">
                        <div class="figma-prop" v-for="(v, k) in props" :key="k">
                          <span class="figma-prop-name">{{ k }}</span>
                          <span class="figma-prop-val">{{ v }}</span>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- CSS CODE VIEW -->
                  <template v-else>
                    <div 
                      v-for="(props, groupName) in selectedElement.styleGroups" 
                      :key="groupName"
                      class="code-group"
                    >
                      <div class="code-group-title">/* {{ groupName }} */</div>
                      <div class="code-group-props">
                        <div class="code-prop-line" v-for="(v, k) in props" :key="k">
                          <span class="cp-name">{{ k }}</span><span class="cp-colon">:</span> <span class="cp-val">{{ v }}</span><span class="cp-semi">;</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
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
        <h1>Cospectra</h1>
        <p>Input a web application URL to test responsive layouts and inspect real-time DOM states.</p>
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
            @load="handleIframeLoad"
          />
        </div>
      </div>
    </div>
  </div>
</template>
