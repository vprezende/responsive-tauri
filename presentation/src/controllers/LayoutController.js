import { ref, watch } from 'vue';

const STORAGE_KEY = 'workspace-state';

const DEFAULT_STATE = {
  url: '',
  currentUrl: '',
  hasNavigated: false,
  currentWidth: 1000,
  theme: 'dark',
};

const loadState = () => {
  try {

    const rawState = localStorage
      .getItem(STORAGE_KEY) ?? '{}'

    return {
      ...DEFAULT_STATE,
      ...JSON.parse(rawState)
    }
  } catch {
    return { 
      ...DEFAULT_STATE 
    }
  }
}

export function useLayoutController() {
  const saved = loadState();

  const url = ref('');
  const currentUrl = ref('');
  const hasNavigated = ref(false);
  const minWidth = ref(320);
  const currentWidth = ref(saved.currentWidth);
  const theme = ref(saved.theme);

  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: url.value,
        currentUrl: currentUrl.value,
        hasNavigated: hasNavigated.value,
        currentWidth: currentWidth.value,
        theme: theme.value,
      })
    );
  };
  
  const toggleTheme = () => {
    if (theme.value === 'dark') {
      theme.value = 'light';
      return;
    }
    theme.value = 'dark'
  };

  const setTheme = (value) => {
    if (value === 'dark' || value === 'light') {
      theme.value = value;
    }
  };

  const navigationRefs = [
    url,
    currentUrl,
    hasNavigated,
  ]

  const layoutRefs = [
    minWidth,
    currentWidth,
  ]

  const userRefs = [
    theme,
    hasNavigated,
  ]

  const watchedStates = [
    ...navigationRefs,
    ...layoutRefs,
    ...userRefs,
  ]

  watch(watchedStates, saveState)

  const navigationState = {
    url,
    currentUrl,
    hasNavigated,
  }

  const layoutState = {
    minWidth,
    currentWidth,
  }

  const preferenceState = {
    theme,
    toggleTheme,
    setTheme,
  }

  
  return {
    ...navigationState,
    ...layoutState,
    ...preferenceState
  }
}
