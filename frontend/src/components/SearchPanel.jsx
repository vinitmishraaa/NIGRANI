import { useEffect, useRef, useState } from "react";
import { detectLivingSubject, getFaceDescriptor, descriptorHash } from "../faceEngine.js";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image compression failed."))), "image/jpeg", quality);
  });
}

async function compressImage(file, maxBytes = 460 * 1024) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The selected image could not be read."));
      img.src = objectUrl;
    });
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.88;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > maxBytes && quality > 0.42) {
      quality -= 0.06;
      blob = await canvasToBlob(canvas, quality);
    }
    if (blob.size > maxBytes) {
      const factor = Math.sqrt(maxBytes / blob.size);
      canvas.width = Math.max(640, Math.floor(canvas.width * factor));
      canvas.height = Math.max(640, Math.floor(canvas.height * factor));
      const ctx2 = canvas.getContext("2d", { alpha: false });
      ctx2.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await canvasToBlob(canvas, 0.7);
    }
    return new File([blob], "capture.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare the selected image."));
    img.src = src;
  });
}

export default function SearchPanel({ apiBase, modelsReady, onComplete }) {
  const imgRef = useRef(null);
  const uploadInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const imageBoxRef = useRef(null);
  const gestureRef = useRef(null);
  const pointersRef = useRef(new Map());
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageTransform, setImageTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [status, setStatus] = useState("Choose an image or take a photo to begin.");
  const [kind, setKind] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    setCameraError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access needs HTTPS or localhost in the browser. On a laptop, open the app at http://localhost:5173. On a phone over a LAN IP, use an HTTPS dev URL.");
      setCameraOpen(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      const message = error?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in the browser site settings and try again."
        : error?.name === "NotFoundError"
          ? "No camera/webcam was found on this device."
          : `Could not open the camera: ${error?.message || "unknown error"}`;
      setCameraError(message);
      setCameraOpen(true);
    }
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
    setCameraError("");
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setCameraError("Camera is still starting. Please wait a moment and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 0.88);
    await handleFileObject(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
    closeCamera();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await handleFileObject(file);
  }

  async function handleFileObject(file) {
    setKind("");
    setResult(null);
    try {
      setStatus("Preparing photo…");
      const compressed = await compressImage(file);
      const dataUrl = await fileToDataUrl(compressed);
      setPreview(dataUrl);
      setImageData(dataUrl);
      setImageTransform({ scale: 1, x: 0, y: 0 });
      setStatus("Photo ready. Drag to move and pinch with two fingers to zoom.");
    } catch (error) {
      setStatus(error.message || "Could not prepare the image.");
      setKind("error");
    }
  }

  function clampTransform(scale, x, y) {
    const box = imageBoxRef.current;
    const img = imgRef.current;
    if (!box || !img) return { scale, x, y };
    const rect = box.getBoundingClientRect();
    const baseWidth = img.offsetWidth || rect.width;
    const baseHeight = img.offsetHeight || rect.height;
    if (scale <= 1) return { scale, x: 0, y: 0 };
    const maxX = Math.max(0, (baseWidth * scale - rect.width) / 2);
    const maxY = Math.max(0, (baseHeight * scale - rect.height) / 2);
    return { scale, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }

  const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const midpoint = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

  function beginImageGesture(event) {
    if (!preview) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      gestureRef.current = { mode: "pan", startX: event.clientX, startY: event.clientY, originX: imageTransform.x, originY: imageTransform.y, pointerId: event.pointerId };
    } else if (points.length === 2) {
      gestureRef.current = { mode: "pinch", startDistance: distance(points[0], points[1]), startScale: imageTransform.scale, startMidpoint: midpoint(points[0], points[1]), originX: imageTransform.x, originY: imageTransform.y };
    }
  }

  function moveImageGesture(event) {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (points.length >= 2 && gesture.mode === "pinch") {
      const ratio = gesture.startDistance ? distance(points[0], points[1]) / gesture.startDistance : 1;
      const nextScale = Math.max(0.55, Math.min(3, gesture.startScale * ratio));
      const center = midpoint(points[0], points[1]);
      setImageTransform(clampTransform(nextScale, gesture.originX + center.x - gesture.startMidpoint.x, gesture.originY + center.y - gesture.startMidpoint.y));
    } else if (points.length === 1 && gesture.mode === "pan") {
      setImageTransform(clampTransform(imageTransform.scale, gesture.originX + event.clientX - gesture.startX, gesture.originY + event.clientY - gesture.startY));
    }
  }

  function endImageGesture(event) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) gestureRef.current = null;
    else if (pointersRef.current.size === 1) {
      const [pointerId, point] = [...pointersRef.current.entries()][0];
      gestureRef.current = { mode: "pan", startX: point.clientX, startY: point.clientY, originX: imageTransform.x, originY: imageTransform.y, pointerId };
    }
  }

  function resetImageView() {
    setImageTransform({ scale: 1, x: 0, y: 0 });
  }

  async function renderAdjustedImage() {
    const box = imageBoxRef.current;
    const source = await loadImage(preview);
    if (!box) return { dataUrl: preview, image: source };
    const rect = box.getBoundingClientRect();
    const outWidth = 1200;
    const outHeight = Math.max(1, Math.round(outWidth * rect.height / rect.width));
    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outWidth, outHeight);

    const baseScale = Math.max(rect.width / source.naturalWidth, rect.height / source.naturalHeight);
    const totalScale = baseScale * imageTransform.scale;
    const drawWidth = source.naturalWidth * totalScale;
    const drawHeight = source.naturalHeight * totalScale;
    const left = (rect.width - drawWidth) / 2 + imageTransform.x;
    const top = (rect.height - drawHeight) / 2 + imageTransform.y;
    const sx = outWidth / rect.width;
    ctx.drawImage(source, left * sx, top * sx, drawWidth * sx, drawHeight * sx);

    let blob = await canvasToBlob(canvas, 0.9);
    if (blob.size > 460 * 1024) blob = await canvasToBlob(canvas, 0.72);
    const dataUrl = await fileToDataUrl(new File([blob], "adjusted-search.jpg", { type: "image/jpeg" }));
    const adjustedImage = await loadImage(dataUrl);
    return { dataUrl, image: adjustedImage };
  }

  async function runPipeline() {
    if (!preview || !imgRef.current) return setStatus("Choose or capture an image first."), setKind("error");
    if (!modelsReady) return setStatus("Vision models are still loading."), setKind("error");
    setBusy(true);
    setResult(null);
    setKind("");
    try {
      setStatus("Reading the selected living subject…");
      const adjusted = await renderAdjustedImage();
      const subject = await detectLivingSubject(adjusted.image);
      if (!subject) throw new Error("No face detected. Upload a human, animal, or other supported living-being image.");

      let dHash = null;
      let faceFound = false;
      if (subject.label === "person") {
        setStatus("Living subject detected. Checking for a visible face…");
        const descriptor = await getFaceDescriptor(adjusted.image);
        if (descriptor) {
          faceFound = true;
          dHash = await descriptorHash(descriptor);
        }
      }

      setStatus(`${subject.label} detected. Searching the public web for an exact or relevant image…`);
      const res = await fetch(`${apiBase}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: adjusted.dataUrl, livingDetected: true, subjectType: subject.label, faceDetected: faceFound, descriptorHash: dHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResult(data);
      onComplete?.(data);
      setStatus(data.evidence?.length
        ? `${data.evidence.length} matching source${data.evidence.length > 1 ? "s" : ""} found and fingerprinted.`
        : "Search completed, but no usable matches were returned.");
      setKind(data.evidence?.length ? "ok" : "");
    } catch (error) {
      setStatus(error.message || "The verification pipeline failed.");
      setKind("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel search-panel">
      <div className="upload-grid">
        <div>
          <div ref={imageBoxRef} className={`upload-box ${preview ? "image-adjustable" : ""}`} onPointerDown={beginImageGesture} onPointerMove={moveImageGesture} onPointerUp={endImageGesture} onPointerCancel={endImageGesture} onWheel={(event) => { if (!preview) return; event.preventDefault(); const next = Math.max(0.55, Math.min(3, imageTransform.scale - event.deltaY * 0.0015)); setImageTransform(clampTransform(next, imageTransform.x, imageTransform.y)); }} onDoubleClick={resetImageView}>
            {preview ? <img ref={imgRef} className="adjustable-image" src={preview} alt="Selected input" draggable="false" style={{ transform: `translate3d(${imageTransform.x}px, ${imageTransform.y}px, 0) scale(${imageTransform.scale})` }} /> : (
              <div className="upload-placeholder"><span className="upload-icon">＋</span><span>Choose or capture a face photo</span><small>After uploading, drag or pinch directly on the image.</small></div>
            )}
            <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} hidden />
          </div>
          <div className="capture-actions">
            <button type="button" className="capture-button" onClick={() => uploadInputRef.current?.click()}><span className="button-icon">↑</span> Upload Image</button>
            <button type="button" className="capture-button camera-button" onClick={openCamera}><span className="button-icon">◉</span> Click Photo</button>
          </div>
          <p className="capture-hint">Adjust directly inside the image box: drag to move, use two fingers to zoom on mobile, or the mouse wheel on desktop. Double-click resets the view.</p>
        </div>

        <div className="discovery-panel">
          <div className="discovery-head"><div><span className="panel-kicker">02 / WEB DISCOVERY</span><h3>Matching sources</h3></div>{result?.evidence?.length ? <span className="result-count">{result.evidence.length} FOUND</span> : null}</div>
          {!result ? <div className="discovery-empty"><span>SEARCH RESULTS</span><p>Matching public images will appear here after the search runs.</p></div> : result.evidence?.length ? <div className="compact-matches">{result.evidence.slice(0, 3).map((item, i) => <article className="compact-match" key={`${item.link}-${i}`}><div className="compact-match-image">{item.thumbnail ? <img src={item.thumbnail} alt={`Match ${i + 1}`} loading="lazy" /> : <span>NO IMAGE</span>}</div><div className="compact-match-body"><span>MATCH {String(i + 1).padStart(2, "0")}</span><h4>{item.title || "Untitled result"}</h4><p>{item.source || "Web source"}{item.exactMatch ? " · exact image" : " · visual match"}</p><a href={item.link} target="_blank" rel="noreferrer">Open source ↗</a></div></article>)}</div> : <div className="discovery-empty no-results"><span>NO MATCHES</span><p>No usable public-web matches were returned for this image.</p></div>}
        </div>
      </div>
      <div className="row"><button className="primary big-button" onClick={runPipeline} disabled={busy || !preview}>{busy ? "PROCESSING…" : "RUN FACE → WEB → CHAIN"}</button></div>
      {status && <p className={`status-line ${kind}`}>{status}</p>}

      {cameraOpen && <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camera capture"><div className="camera-dialog"><div className="camera-dialog-head"><div><span className="panel-kicker">LIVE CAMERA</span><h3>Take a photo</h3></div><button type="button" className="camera-close" onClick={closeCamera} aria-label="Close camera">×</button></div>{cameraError ? <div className="camera-error"><strong>Camera unavailable</strong><p>{cameraError}</p></div> : <><div className="camera-preview-wrap"><video ref={videoRef} className="camera-preview" autoPlay muted playsInline /></div><div className="camera-actions"><button type="button" onClick={closeCamera}>Cancel</button><button type="button" className="primary" onClick={capturePhoto}>Take Photo</button></div></>}</div></div>}
    </div>
  );
}
