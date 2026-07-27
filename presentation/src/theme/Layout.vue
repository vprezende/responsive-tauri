<script>

  import { ref, onMounted, onUnmounted } from 'vue';

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

      const isResizing = ref(false);
      let startX = 0;
      let startWidth = 0;

      const loadUrl = async () => {
        let finalUrl = url.value.trim();
        if (!finalUrl) return;
        
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
        currentUrl.value = finalUrl;
        hasNavigated.value = true;
      };

      const onPointerDown = (e) => {
        e.preventDefault();
        isResizing.value = true;
        startX = e.clientX;
        startWidth = currentWidth.value;
        
        if (e.target && e.target.setPointerCapture) {
          e.target.setPointerCapture(e.pointerId);
        }
        
        const iframe = document.querySelector('.webview-frame');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage('hide-cursor', '*');
        }
      };

      const onPointerMove = (e) => {
        if (!isResizing.value) return;
        
        const dx = e.clientX - startX;
        let newWidth = startWidth + (dx * 2);
        
        if (newWidth < minWidth.value) {
          newWidth = minWidth.value;
        }
        
        currentWidth.value = newWidth;
        
        if (deviceContainer.value) {
          deviceContainer.value.style.width = newWidth + 'px';
        }
      };

      const onPointerUp = (e) => {
        if (isResizing.value) {
          isResizing.value = false;
          if (e.target && e.target.releasePointerCapture) {
            try { 
              e.target.releasePointerCapture(e.pointerId); 
            } catch(err) {
              throw new Error(`Error: ${err}`);
            }
          }
        }
      };

      const onPointerCancel = (e) => {
        const isCurrentlyResizing = isResizing.value;
        const target = e.currentTarget;
        const pointerId = e.pointerId;
        
        const hasPointerCapture = target.hasPointerCapture(pointerId);

        if (!isCurrentlyResizing) return;

        isResizing.value = false;

        if (hasPointerCapture) {
          target.releasePointerCapture(pointerId);
        }
      };

      onMounted(() => {
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerCancel);
        document.addEventListener('mouseleave', onPointerCancel);
      });

      onUnmounted(() => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        document.removeEventListener('mouseleave', onPointerCancel);
      });

      const state = {
        url,
        currentUrl,
        hasNavigated,
        minWidth,
        currentWidth,
        isResizing,
      }

      const elements = {
        deviceContainer,
        wrapper,
        webview,
      }

      const actions = {
        loadUrl,
        onPointerDown,
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
  <div
    class="simulator-layout"
    :class="{ 'is-resizing': isResizing }"
  >
    <header class="simulator-header">
      <div class="controls">
        <input 
          v-model="url" 
          type="text" 
          placeholder="Digite uma URL para testar (ex: http://localhost:5173)" 
          class="url-input"
          @keyup.enter="loadUrl"
        >
        <button
          class="btn btn-primary"
          @click="loadUrl"
        >
          Testar Site
        </button>
        
        <div class="divider" />

        <label class="min-width-label">Trava Mínima (px):</label>
        <input 
          v-model.number="minWidth" 
          type="number"
          class="input-small"
        >
      </div>
    </header>
    
    <main class="simulator-canvas">
      <div
        v-if="!hasNavigated"
        class="welcome-screen"
      >
        <h1>Responsive Inspector</h1>
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
            :src="currentUrl"
            class="webview-frame"
            frameborder="0"
            :style="{ pointerEvents: isResizing ? 'none' : 'auto' }"
          />
        </div>
        <div 
          class="resize-handle" 
          :class="{ active: isResizing }"
          @pointerdown="onPointerDown"
        />
      </div>
    </main>
  </div>
</template>