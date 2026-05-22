import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let sharedLandmarker = null;
let landmarkerLoading = null;

async function getLandmarker() {
  if (sharedLandmarker) return sharedLandmarker;
  if (landmarkerLoading) return landmarkerLoading;

  landmarkerLoading = (async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL);
    sharedLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      outputFaceBlendshapes: false,
      runningMode: 'VIDEO',
      numFaces: 1,
    });
    return sharedLandmarker;
  })();

  return landmarkerLoading;
}

export default function FaceTracker({ videoRef, color = '#F59E0B', active = true }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    getLandmarker().then(lm => {
      landmarkerRef.current = lm;
      setReady(true);
    }).catch(console.error);
  }, [active]);

  useEffect(() => {
    if (!ready || !active) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let lastVideoTime = -1;

    function detect() {
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // Sync canvas size to video display size
      const { videoWidth, videoHeight } = video;
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth || 640;
        canvas.height = videoHeight || 480;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const results = landmarkerRef.current.detectForVideo(video, performance.now());
          if (results?.faceLandmarks?.length > 0) {
            drawLandmarks(ctx, results.faceLandmarks[0], canvas.width, canvas.height, color);
          }
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

const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const LEFT_EYE  = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
const RIGHT_EYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398];
const LIPS_OUTER = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const NOSE_TIP = 1;

function drawLandmarks(ctx, landmarks, w, h, color) {
  const pt = (i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h });

  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;

  // Face oval
  drawPath(ctx, FACE_OVAL.map(pt), true);

  // Eyes
  ctx.strokeStyle = '#60A5FA';
  drawPath(ctx, LEFT_EYE.map(pt), true);
  drawPath(ctx, RIGHT_EYE.map(pt), true);

  // Lips
  ctx.strokeStyle = '#F87171';
  drawPath(ctx, LIPS_OUTER.map(pt), true);

  // Nose tip dot
  ctx.fillStyle = color;
  const nose = pt(NOSE_TIP);
  ctx.beginPath();
  ctx.arc(nose.x, nose.y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPath(ctx, points, close = false) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (close) ctx.closePath();
  ctx.stroke();
}
