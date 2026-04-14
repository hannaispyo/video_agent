function renderBriefForm() {
  console.log('[FORM] Starting renderBriefForm()');
  const mount = document.getElementById('brief-form-mount');
  console.log('[FORM]', mount ? 'Mount point found' : 'ERROR: Mount point not found');

  if (!mount) return;

  const form = document.createElement('form');
  form.className = 'brief-form';
  form.id = 'brief-form';

  // Audience input
  const audienceGroup = document.createElement('div');
  audienceGroup.className = 'form-group';

  const audienceLabel = document.createElement('label');
  audienceLabel.className = 'form-label';
  audienceLabel.textContent = 'Audiencia';

  const audienceInput = document.createElement('input');
  audienceInput.type = 'text';
  audienceInput.className = 'form-input';
  audienceInput.placeholder = 'CEOs, directores de transformación, líderes de RR.HH.';
  audienceInput.value = state.briefForm.audience;

  let debounceTimer;
  audienceInput.addEventListener('input', (e) => {
    console.log('[FORM INPUT]', 'Audience changed:', e.target.value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('[FORM UPDATE]', 'Audience debounce fired:', e.target.value);
      updateFormField('audience', e.target.value);
    }, 300);
  });

  audienceGroup.appendChild(audienceLabel);
  audienceGroup.appendChild(audienceInput);
  form.appendChild(audienceGroup);

  // Objective radio buttons
  const objectiveGroup = document.createElement('div');
  objectiveGroup.className = 'form-group';

  const objectiveLabel = document.createElement('label');
  objectiveLabel.className = 'form-label';
  objectiveLabel.textContent = 'Objetivo';
  objectiveGroup.appendChild(objectiveLabel);

  const objectives = ['Awareness', 'Consideration', 'Conversion'];
  objectives.forEach(obj => {
    const container = document.createElement('div');
    container.className = 'radio-group';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'objective';
    radio.value = obj.toLowerCase();
    radio.id = 'obj-' + obj.toLowerCase();
    radio.checked = state.briefForm.objective === obj.toLowerCase();

    radio.addEventListener('change', (e) => {
      console.log('[FORM INPUT]', 'Objective changed:', e.target.value);
      updateFormField('objective', e.target.value);
    });

    const label = document.createElement('label');
    label.className = 'radio-label';
    label.htmlFor = radio.id;
    label.textContent = obj;

    container.appendChild(radio);
    container.appendChild(label);
    objectiveGroup.appendChild(container);
  });

  form.appendChild(objectiveGroup);

  // Format radio buttons
  const formatGroup = document.createElement('div');
  formatGroup.className = 'form-group';

  const formatLabel = document.createElement('label');
  formatLabel.className = 'form-label';
  formatLabel.textContent = 'Formato';
  formatGroup.appendChild(formatLabel);

  const formats = ['Carousel', 'Email', 'Comic'];
  formats.forEach(fmt => {
    const container = document.createElement('div');
    container.className = 'radio-group';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'format';
    radio.value = fmt.toLowerCase();
    radio.id = 'fmt-' + fmt.toLowerCase();
    radio.checked = state.briefForm.format === fmt.toLowerCase();

    radio.addEventListener('change', (e) => {
      console.log('[FORM INPUT]', 'Format changed:', e.target.value);
      updateFormField('format', e.target.value);
    });

    const label = document.createElement('label');
    label.className = 'radio-label';
    label.htmlFor = radio.id;
    label.textContent = fmt;

    container.appendChild(radio);
    container.appendChild(label);
    formatGroup.appendChild(container);
  });

  form.appendChild(formatGroup);

  // Trend selector (injected by trend-selector module)
  const trendContainer = document.createElement('div');
  trendContainer.id = 'trend-selector-mount';
  form.appendChild(trendContainer);

  // Tone radio buttons
  const toneGroup = document.createElement('div');
  toneGroup.className = 'form-group';

  const toneLabel = document.createElement('label');
  toneLabel.className = 'form-label';
  toneLabel.textContent = 'Tono';
  toneGroup.appendChild(toneLabel);

  // Brand default
  const defaultContainer = document.createElement('div');
  defaultContainer.className = 'radio-group';

  const defaultRadio = document.createElement('input');
  defaultRadio.type = 'radio';
  defaultRadio.name = 'tone';
  defaultRadio.value = 'brand-default';
  defaultRadio.id = 'tone-default';
  defaultRadio.checked = state.briefForm.tone === 'brand-default';

  defaultRadio.addEventListener('change', (e) => {
    console.log('[FORM INPUT]', 'Tone changed to: brand-default');
    updateFormField('tone', 'brand-default');
    document.getElementById('custom-tone-textarea').style.display = 'none';
  });

  const defaultLabel = document.createElement('label');
  defaultLabel.className = 'radio-label';
  defaultLabel.htmlFor = 'tone-default';
  defaultLabel.textContent = 'Brand default';

  defaultContainer.appendChild(defaultRadio);
  defaultContainer.appendChild(defaultLabel);
  toneGroup.appendChild(defaultContainer);

  // Custom tone
  const customContainer = document.createElement('div');
  customContainer.className = 'radio-group';

  const customRadio = document.createElement('input');
  customRadio.type = 'radio';
  customRadio.name = 'tone';
  customRadio.value = 'custom';
  customRadio.id = 'tone-custom';
  customRadio.checked = state.briefForm.tone === 'custom';

  customRadio.addEventListener('change', (e) => {
    console.log('[FORM INPUT]', 'Tone changed to: custom');
    updateFormField('tone', 'custom');
    document.getElementById('custom-tone-textarea').style.display = 'block';
  });

  const customLabel = document.createElement('label');
  customLabel.className = 'radio-label';
  customLabel.htmlFor = 'tone-custom';
  customLabel.textContent = 'Custom';

  customContainer.appendChild(customRadio);
  customContainer.appendChild(customLabel);
  toneGroup.appendChild(customContainer);

  // Custom tone textarea
  const customTextarea = document.createElement('textarea');
  customTextarea.id = 'custom-tone-textarea';
  customTextarea.className = 'form-textarea';
  customTextarea.placeholder = 'Describe el tono deseado...';
  customTextarea.value = state.briefForm.customTone;
  customTextarea.style.display = state.briefForm.tone === 'custom' ? 'block' : 'none';

  let textDebounce;
  customTextarea.addEventListener('input', (e) => {
    console.log('[FORM INPUT]', 'Custom tone changed:', e.target.value);
    clearTimeout(textDebounce);
    textDebounce = setTimeout(() => {
      console.log('[FORM UPDATE]', 'Custom tone debounce fired:', e.target.value);
      updateFormField('customTone', e.target.value);
    }, 300);
  });

  toneGroup.appendChild(customTextarea);
  form.appendChild(toneGroup);

  mount.innerHTML = '';
  mount.appendChild(form);
  console.log('[FORM] Brief form rendered successfully');

  // Now render trend selector into the mounted container
  renderTrendSelector();
}
