import { useEffect, useRef, useState } from 'react';
import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite';

const PET_LABELS = new Set(['dog', 'cat', 'bird', 'rabbit', 'hamster', 'horse', 'sheep', 'cow', 'bear']);

let sharedDetector  = null;
let detectorLoading = null;

async function getDetector() {
  if (sharedDetector) return sharedDetector;
  if (detectorLoading) return detectorLoading;

  detectorLoading = (async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL);
    sharedDetector = await ObjectDetector.createFromOptions(filesetResolver, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      scoreThreshold: 0.4,
      runningMode: 'VIDEO',
    });
    return sharedDetector;
  })();

  return detectorLoading;
}

export default function PetTracker({ videoRef, color = '#F59E0B', active = true }) {
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);
  const detectorRef  = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    getDetector().then(d => {
      detectorRef.current = d;
      setReady(true);
    }).catch(console.error);
  }, [active]);

  useEffect(() => {
    if (!ready || !active) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let lastVideoTime = -1;

    function detect() {
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const { videoWidth, videoHeight } = video;
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width  = videoWidth  || 640;
        canvas.height = videoHeight || 480;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const results = detectorRef.current.detectForVideo(video, performance.now());
          const pets = (results?.detections ?? []).filter(d =>
            d.categories?.some(c => PET_LABELS.has(c.categoryName?.toLowerCase()))
          );
          pets.forEach(d => drawDetection(ctx, d, canvas.width, canvas.height, color));
        } catch {}
      }

      rafRef.current = requestAnimationFrame(detect);
    }

    rafRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, active, videoRef, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
}

function drawDetection(ctx, detection, w, h, color) {
  const box   = detection.boundingBox;
  const label = detection.categories?.[0];
  if (!box || !label) return;

  const x      = box.originX;
  const y      = box.originY;
  const bw     = box.width;
  const bh     = box.height;
  const conf   = Math.round(label.score * 100);
  const name   = label.categoryName;

  ctx.save();

  // Bounding box
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.globalAlpha = 0.85;
  ctx.strokeRect(x, y, bw, bh);

  // Corner accents
  const cs = 12;
  ctx.lineWidth = 3;
  [[x, y], [x + bw, y], [x, y + bh], [x + bw, y + bh]].forEach(([cx, cy], i) => {
    const dx = i % 2 === 0 ? cs : -cs;
    const dy = i < 2 ? cs : -cs;
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy);
    ctx.stroke();
  });

  // Label pill
  const text    = `${name} ${conf}%`;
  ctx.font      = 'bold 11px system-ui';
  const tw      = ctx.measureText(text).width;
  const ph      = 18;
  const px      = 6;
  const labelY  = y > ph + 4 ? y - ph - 4 : y + 4;

  ctx.globalAlpha  = 0.8;
  ctx.fillStyle    = color;
  ctx.beginPath();
  ctx.roundRect(x, labelY, tw + px * 2, ph, 4);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle   = '#000';
  ctx.fillText(text, x + px, labelY + 13);

  ctx.restore();
}
