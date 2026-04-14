// Global state
const state = {
  activeBrand: null,
  brandsList: [],
  trends: [],
  briefForm: {
    audience: '',
    objective: null,
    format: null,
    trend: null,
    tone: 'brand-default',
    customTone: ''
  },
  selectedStyle: 'editorial-photo',
  preview: {
    textBrief: '',
    mockupHTML: ''
  }
};

// Initialize app on load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Starting initialization...');

  // Fetch initial state
  try {
    const response = await fetch('/api/state');
    const data = await response.json();
    state.activeBrand = data.activeBrand;
    state.brandsList = data.brandsList;
    console.log('[App] Loaded state:', { activeBrand: state.activeBrand, brands: state.brandsList.length });
  } catch (err) {
    console.error('[App] Failed to load state:', err);
  }

  // Fetch trends
  try {
    const response = await fetch('/api/trends');
    const data = await response.json();
    state.trends = data.trends || [];
    console.log('[App] Loaded trends:', state.trends.length);
  } catch (err) {
    console.error('[App] Failed to load trends:', err);
  }

  // Render all modules
  renderBrandSelector();
  renderCampaignsTab();
  renderTrendSelector();
  renderBriefForm();
  renderStylePicker();
  renderPreviewPane();
  renderLauncher();
  renderBuilderTab();

  // Setup tab switching
  setupTabSwitching();

  console.log('[App] Initialization complete');
});

// Tab switching
function setupTabSwitching() {
  console.log('[TAB SWITCH] Setting up tab switching...');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  console.log('[TAB SWITCH]', `Found ${tabBtns.length} tab buttons and ${tabPanes.length} tab panes`);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      console.log('[TAB SWITCH]', `User clicked ${tabName} tab`);

      // Update active button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      console.log('[TAB SWITCH]', `${tabName} button is now active`);

      // Update active pane
      tabPanes.forEach(p => p.classList.remove('active'));
      const targetPane = document.getElementById(tabName + '-tab');
      if (targetPane) {
        targetPane.classList.add('active');
        console.log('[TAB SWITCH]', `${tabName} pane is now visible`);
      } else {
        console.error('[TAB SWITCH]', `ERROR: ${tabName}-tab pane not found!`);
      }
    });
  });
}

// Helper: Update state and re-render preview
function updateFormField(field, value) {
  console.log('[STATE UPDATE]', `${field} = ${value}`);
  state.briefForm[field] = value;
  console.log('[STATE]', 'Current briefForm:', state.briefForm);
  regeneratePreview();
}

// Helper: Regenerate preview (debounced for text inputs)
function regeneratePreview() {
  console.log('[PREVIEW] Regenerating preview...');
  generatePreviewText();
  generatePreviewMockup();
  console.log('[PREVIEW]', 'Preview text:', state.preview.textBrief);
}

// Generate brief text for preview
function generatePreviewText() {
  const { audience, objective, format, trend, tone, customTone } = state.briefForm;

  let text = '';
  if (audience) text += `Audiencia: ${audience}\n`;
  if (objective) text += `Objetivo: ${objective}\n`;
  if (format) text += `Formato: ${format}\n`;
  if (trend) text += `Trend: ${trend}\n`;
  if (tone) {
    const toneText = tone === 'custom' ? customTone : 'Brand default';
    text += `Tono: ${toneText}\n`;
  }
  if (state.selectedStyle) text += `Estilo: ${state.selectedStyle}\n`;

  state.preview.textBrief = text || 'Completa el formulario para ver vista previa';
}

// Generate preview mockup (delegates to preview-pane module)
function generatePreviewMockup() {
  if (typeof renderPreviewPaneContent === 'function') {
    renderPreviewPaneContent();
  }
}

// Helper: Show toast notification
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Helper: Copy to clipboard
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast('¡Copiado! Pégalo en Claude Code');
      return true;
    } else {
      // Fallback: show textarea
      return false;
    }
  } catch (err) {
    console.error('Clipboard error:', err);
    return false;
  }
}
