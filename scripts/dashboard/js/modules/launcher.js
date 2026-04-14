function renderLauncher() {
  const mount = document.getElementById('launcher-mount');

  const container = document.createElement('div');
  container.className = 'launcher-container';

  const button = document.createElement('button');
  button.id = 'launcher-btn';
  button.className = 'launcher-btn';
  button.textContent = 'Copiar comando';

  const updateButtonState = () => {
    const { audience, objective, format, trend, tone, customTone } = state.briefForm;

    const isComplete = audience && objective && format && trend &&
                       (tone === 'brand-default' || (tone === 'custom' && customTone));

    button.disabled = !isComplete;

    if (!isComplete) {
      button.title = 'Completa todos los campos';
    } else {
      button.title = '';
    }
  };

  button.addEventListener('click', async () => {
    console.log('[LAUNCHER] Copy command button clicked');
    console.log('[LAUNCHER]', 'Current state:', {
      audience: state.briefForm.audience,
      objective: state.briefForm.objective,
      format: state.briefForm.format,
      trend: state.briefForm.trend,
      tone: state.briefForm.tone,
      customTone: state.briefForm.customTone,
      selectedStyle: state.selectedStyle,
      activeBrand: state.activeBrand
    });

    try {
      console.log('[LAUNCHER] Sending POST to /api/generate-command');
      const response = await fetch('/api/generate-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefForm: state.briefForm,
          selectedStyle: state.selectedStyle,
          activeBrand: state.activeBrand
        })
      });

      console.log('[LAUNCHER]', 'Response status:', response.status);

      if (!response.ok) {
        console.error('[LAUNCHER]', 'API error:', response.status, response.statusText);
        throw new Error('Failed to generate command');
      }

      const data = await response.json();
      console.log('[LAUNCHER]', 'Command generated:', data.command?.substring(0, 100) + '...');
      const command = data.command;

      const copied = await copyToClipboard(command);

      if (!copied) {
        // Fallback: show textarea with copy instructions
        console.log('[LAUNCHER]', 'Clipboard unavailable, showing fallback');
        showCommandFallback(command);
      } else {
        console.log('[LAUNCHER]', 'Command copied to clipboard successfully');
      }
    } catch (err) {
      console.error('[LAUNCHER]', 'Error:', err);
      showToast('Error generando comando');
    }
  });

  container.appendChild(button);
  mount.innerHTML = '';
  mount.appendChild(container);
  console.log('[LAUNCHER] Launcher button rendered');

  // Update button state on form changes
  const observer = new MutationObserver(updateButtonState);
  observer.observe(document.getElementById('brief-form'), {
    attributes: true,
    subtree: true
  });

  updateButtonState();
  console.log('[LAUNCHER] Button state checker initialized');
}

function showCommandFallback(command) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  const content = document.createElement('div');
  content.className = 'modal-content';

  const title = document.createElement('h3');
  title.textContent = 'Copiar comando manualmente';

  const textarea = document.createElement('textarea');
  textarea.value = command;
  textarea.readOnly = true;
  textarea.rows = 10;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cerrar';
  closeBtn.addEventListener('click', () => modal.remove());

  content.appendChild(title);
  content.appendChild(textarea);
  content.appendChild(closeBtn);
  modal.appendChild(content);

  document.body.appendChild(modal);
}
