/**
 * camera.js – Camera handling & photo capture
 */

const Camera = {
  stream: null,
  videoEl: null,
  canvasEl: null,

  async init(videoElement, canvasElement) {
    this.videoEl = videoElement;
    this.canvasEl = canvasElement;
  },

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera API not supported on this device.');
    }

    try {
      // Prefer rear camera
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      return true;
    } catch (err) {
      console.error('Camera start error:', err);
      throw err;
    }
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  },

  /**
   * Capture current frame and return data URL (JPEG)
   */
  capture() {
    if (!this.videoEl || !this.canvasEl) return null;

    const video = this.videoEl;
    const canvas = this.canvasEl;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return compressed JPEG
    return canvas.toDataURL('image/jpeg', 0.85);
  },

  /**
   * Check if flash is supported (limited support on mobile)
   */
  async toggleFlash(on) {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return false;

    try {
      const capabilities = track.getCapabilities();
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: on }] });
        return true;
      }
    } catch (e) {
      console.warn('Flash not supported:', e);
    }
    return false;
  }
};

window.Camera = Camera;
