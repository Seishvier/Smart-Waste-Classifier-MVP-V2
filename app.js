/**
 * app.js – Main application logic, navigation & state
 */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    currentScreen: 'scan',
    currentResult: null,
    currentImage: null,
    selectedCorrection: null,
    flashOn: false
  };

  // ---------- DOM References ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const onboarding = $('#onboarding');
  const app = $('#app');
  const screens = {
    scan: $('#screen-scan'),
    camera: $('#screen-camera'),
    review: $('#screen-review'),
    loading: $('#screen-loading'),
    result: $('#screen-result'),
    history: $('#screen-history'),
    explore: $('#screen-explore'),
    profile: $('#screen-profile')
  };

  // ---------- Init ----------
  function init() {
    // Theme
    const settings = Storage.getSettings();
    applyTheme(settings.theme || 'light');

    // Onboarding
    if (Storage.isOnboardingDone()) {
      showApp();
    } else {
      setupOnboarding();
    }

    setupNavigation();
    setupScan();
    setupCamera();
    setupResult();
    setupHistory();
    setupProfile();
    setupCorrectionModal();
    setupThemeToggle();
    updateStats();

    // Tip of the day
    const tips = [
      "Rinse plastic containers before recycling to avoid contaminating the batch.",
      "Flatten cardboard boxes to save space in the recycling bin.",
      "Never put batteries in regular trash – they belong in special collection points.",
      "Keep paper dry; wet paper often cannot be recycled.",
      "Remove food residue from packaging – a quick rinse is usually enough."
    ];
    $('#tip-text').textContent = tips[new Date().getDate() % tips.length];
  }

  // ---------- Onboarding ----------
  function setupOnboarding() {
    let currentSlide = 0;
    const slides = $$('.slide');
    const dots = $$('.dot');
    const nextBtn = $('#onboarding-next');
    const skipBtn = $('#onboarding-skip');

    function goToSlide(index) {
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
      currentSlide = index;
      nextBtn.textContent = index === slides.length - 1 ? 'Get Started' : 'Next';
    }

    nextBtn.addEventListener('click', () => {
      if (currentSlide < slides.length - 1) {
        goToSlide(currentSlide + 1);
      } else {
        finishOnboarding();
      }
    });

    skipBtn.addEventListener('click', finishOnboarding);

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(Number(dot.dataset.slide));
      });
    });
  }

  function finishOnboarding() {
    Storage.setOnboardingDone();
    showApp();
  }

  function showApp() {
    onboarding.hidden = true;
    onboarding.setAttribute('aria-hidden', 'true');
    app.hidden = false;
  }

  // ---------- Navigation ----------
  function setupNavigation() {
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        navigateTo(screen);
      });
    });

    // Data-goto buttons
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-goto]');
      if (target) {
        navigateTo(target.dataset.goto);
      }
    });
  }

  function navigateTo(screenName) {
    // Hide all screens
    Object.values(screens).forEach(s => {
      s.classList.remove('active');
      s.hidden = true;
    });

    // Show target
    const target = screens[screenName];
    if (target) {
      target.hidden = false;
      target.classList.add('active');
    }

    // Update nav
    $$('.nav-item').forEach(btn => {
      const isActive = btn.dataset.screen === screenName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Update header title
    const titles = {
      scan: 'Hi, ready to sort?',
      history: 'History',
      explore: 'Explore',
      profile: 'Profile',
      result: 'Result',
      review: 'Review Photo',
      loading: 'Analyzing…'
    };
    $('#header-title').textContent = titles[screenName] || 'Smart Waste';

    state.currentScreen = screenName;

    // Special actions
    if (screenName === 'history') renderHistory();
    if (screenName === 'profile') updateStats();
    if (screenName !== 'camera') Camera.stop();
  }

  // ---------- Scan / Gallery ----------
  function setupScan() {
    $('#btn-scan').addEventListener('click', openCamera);
    $('#btn-gallery').addEventListener('click', openGallery);
    $('#btn-gallery-cam').addEventListener('click', openGallery);

    const galleryInput = $('#gallery-input');
    galleryInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          state.currentImage = ev.target.result;
          showReview(state.currentImage);
        };
        reader.readAsDataURL(file);
      }
      galleryInput.value = '';
    });
  }

  function openGallery() {
    $('#gallery-input').click();
  }

  // ---------- Camera ----------
  function setupCamera() {
    Camera.init($('#camera-preview'), $('#camera-canvas'));

    $('#btn-close-camera').addEventListener('click', () => {
      Camera.stop();
      navigateTo('scan');
    });

    $('#btn-shutter').addEventListener('click', async () => {
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);

      const dataUrl = Camera.capture();
      if (dataUrl) {
        state.currentImage = dataUrl;
        Camera.stop();
        showReview(dataUrl);
      }
    });

    $('#btn-flash').addEventListener('click', async () => {
      state.flashOn = !state.flashOn;
      const success = await Camera.toggleFlash(state.flashOn);
      if (!success) {
        showToast('Flash not available on this device');
        state.flashOn = false;
      }
    });
  }

  async function openCamera() {
    try {
      navigateTo('camera');
      await Camera.start();
    } catch (err) {
      showToast('Camera access denied. Please enable it in Settings or use Gallery.');
      navigateTo('scan');
    }
  }

  // ---------- Review ----------
  function showReview(imageDataUrl) {
    $('#review-image').src = imageDataUrl;
    navigateTo('review');

    $('#btn-retake').onclick = () => {
      state.currentImage = null;
      openCamera();
    };

    $('#btn-analyze').onclick = () => {
      startAnalysis();
    };
  }

  // ---------- Analysis ----------
  async function startAnalysis() {
    navigateTo('loading');

    // Update loading text based on mode
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = hasApiKey()
        ? 'Analyzing with AI Vision…'
        : 'Analyzing material…';
    }

    try {
      const result = await classifyWaste(state.currentImage);
      state.currentResult = result;
      showResult(result);
    } catch (err) {
      console.error(err);
      showToast('Something went wrong. Please try again.');
      navigateTo('scan');
    }
  }

  // ---------- Result ----------
  function setupResult() {
    $('#btn-save').addEventListener('click', saveCurrentResult);
    $('#btn-scan-again').addEventListener('click', () => {
      state.currentResult = null;
      state.currentImage = null;
      navigateTo('scan');
    });
    $('#btn-correct').addEventListener('click', openCorrectionModal);
    $('#btn-share').addEventListener('click', () => {
      showToast('Share feature coming in a future update');
    });
  }

  function showResult(result) {
    // Object name & confidence
    $('#result-object-name').textContent = result.object_name;

    const badge = $('#result-confidence');
    badge.classList.remove('fair', 'low');
    if (result.confidence >= 80) {
      badge.textContent = 'High confidence';
    } else if (result.confidence >= 50) {
      badge.textContent = 'Fairly confident — double-check';
      badge.classList.add('fair');
    } else {
      badge.textContent = 'Low confidence — choose manually';
      badge.classList.add('low');
    }

    // Bin card
    const binCard = $('#result-bin-card');
    const colorClass = result.bin_color.toLowerCase();
    binCard.className = 'bin-color-card ' + colorClass;
    $('#result-category').textContent = result.category;
    $('#result-material').textContent = result.material;

    // Tips
    const tipsList = $('#result-tips');
    tipsList.innerHTML = '';
    result.preparation_tips.forEach(tip => {
      const li = document.createElement('li');
      li.textContent = tip;
      tipsList.appendChild(li);
    });

    // Fun fact
    $('#result-fun-fact').textContent = result.fun_fact;

    // Ideas
    const ideasList = $('#result-ideas');
    ideasList.innerHTML = '';
    result.recycling_ideas.forEach(idea => {
      const card = document.createElement('div');
      card.className = 'idea-card';
      card.innerHTML = `<p>${idea}</p>`;
      ideasList.appendChild(card);
    });

    // Safety note
    const safetyEl = $('#result-safety');
    if (result.safety_note) {
      safetyEl.textContent = result.safety_note;
      safetyEl.hidden = false;
    } else {
      safetyEl.hidden = true;
    }

    navigateTo('result');

    // Haptic
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
  }

  function saveCurrentResult() {
    if (!state.currentResult) return;

    Storage.addToHistory({
      ...state.currentResult,
      image: state.currentImage // may be large; in production consider compressing further
    });
    Storage.incrementStat('saved');
    updateStats();
    showToast('Saved to History');
  }

  // ---------- History ----------
  function setupHistory() {
    $('#filter-category').addEventListener('change', renderHistory);
  }

  function renderHistory() {
    const filter = $('#filter-category').value;
    let items = Storage.getHistory();

    if (filter !== 'all') {
      items = items.filter(i => i.category === filter);
    }

    const list = $('#history-list');
    const empty = $('#history-empty');

    if (items.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.innerHTML = items.map(item => {
      const date = new Date(item.timestamp).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const color = (item.bin_color || 'grey').toLowerCase();
      return `
        <article class="history-card" data-id="${item.id}">
          ${item.image
            ? `<img class="history-thumb" src="${item.image}" alt="${item.object_name}">`
            : `<div class="history-thumb"></div>`}
          <div class="history-info">
            <h3>${item.object_name}</h3>
            <div class="history-meta">
              <span class="history-bin ${color}" style="background:var(--bin-${color})"></span>
              <span>${item.category}</span>
              <span>·</span>
              <span>${date}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Click to view detail
    list.querySelectorAll('.history-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const item = Storage.getHistory().find(i => i.id === id);
        if (item) {
          state.currentResult = item;
          state.currentImage = item.image || null;
          showResult(item);
        }
      });
    });
  }

  // ---------- Profile ----------
  function setupProfile() {
    $('#btn-clear-history').addEventListener('click', () => {
      if (confirm('Clear all history? This cannot be undone.')) {
        Storage.clearHistory();
        updateStats();
        showToast('History cleared');
      }
    });

    $('#btn-privacy').addEventListener('click', () => {
      showToast('Photos are processed for analysis only and not stored permanently by default.');
    });

    // API Key handling
    const apiInput = $('#api-key-input');
    const btnSaveKey = $('#btn-save-api-key');
    const btnRemoveKey = $('#btn-remove-api-key');

    // Pre-fill if key exists (masked)
    if (hasApiKey()) {
      apiInput.value = '••••••••••••••••';
      apiInput.dataset.hasKey = 'true';
    }

    btnSaveKey.addEventListener('click', () => {
      const value = apiInput.value.trim();
      if (!value || value === '••••••••••••••••') {
        showToast('Please enter a valid API key');
        return;
      }
      setApiKey(value);
      apiInput.value = '••••••••••••••••';
      apiInput.dataset.hasKey = 'true';
      updateApiStatus();
      showToast('API key saved. Real AI is now active.');
    });

    btnRemoveKey.addEventListener('click', () => {
      setApiKey('');
      apiInput.value = '';
      apiInput.dataset.hasKey = 'false';
      updateApiStatus();
      showToast('API key removed. Switched to mock mode.');
    });

    updateApiStatus();
  }

  function updateApiStatus() {
    const statusEl = $('#api-key-status');
    const statusText = $('#api-status-text');
    if (hasApiKey()) {
      statusEl.classList.add('active');
      statusText.textContent = 'Real AI active (Gemini Vision)';
    } else {
      statusEl.classList.remove('active');
      statusText.textContent = 'Using mock mode';
    }
  }

  function updateStats() {
    const stats = Storage.getStats();
    $('#stat-scans').textContent = stats.scans || 0;
    $('#stat-saved').textContent = stats.saved || 0;
    $('#stat-corrections').textContent = stats.corrections || 0;
    updateApiStatus();
  }

  // ---------- Correction Modal ----------
  function setupCorrectionModal() {
    const modal = $('#correction-modal');

    $('#btn-cancel-correction').addEventListener('click', closeCorrectionModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeCorrectionModal);

    $$('.correction-option').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.correction-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.selectedCorrection = {
          category: btn.dataset.category,
          bin: btn.dataset.bin
        };
      });
    });

    $('#btn-submit-correction').addEventListener('click', () => {
      if (!state.selectedCorrection) {
        showToast('Please select a category');
        return;
      }
      const note = $('#correction-note').value.trim();
      const result = createManualResult(
        state.selectedCorrection.category,
        state.selectedCorrection.bin,
        note
      );
      state.currentResult = result;
      Storage.incrementStat('corrections');
      updateStats();
      closeCorrectionModal();
      showResult(result);
      showToast('Thank you for the correction');
    });
  }

  function openCorrectionModal() {
    state.selectedCorrection = null;
    $$('.correction-option').forEach(b => b.classList.remove('selected'));
    $('#correction-note').value = '';
    const modal = $('#correction-modal');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeCorrectionModal() {
    const modal = $('#correction-modal');
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }

  // ---------- Theme ----------
  function setupThemeToggle() {
    $('#theme-toggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      Storage.saveSettings({ ...Storage.getSettings(), theme: next });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const sun = $('.icon-sun');
    const moon = $('.icon-moon');
    if (theme === 'dark') {
      sun.hidden = true;
      moon.hidden = false;
    } else {
      sun.hidden = false;
      moon.hidden = true;
    }
  }

  // ---------- Toast ----------
  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  // ---------- Start ----------
  document.addEventListener('DOMContentLoaded', init);
})();
