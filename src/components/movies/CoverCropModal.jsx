import { useState, useRef, useEffect } from 'react'

// Quadro de recorte (proporção 2:3) e tamanho final exportado
const FRAME_W = 240
const FRAME_H = 360
const EXPORT_W = 400
const EXPORT_H = 600
const MAX_ZOOM_MULT = 4

export default function CoverCropModal({ file, onCancel, onConfirm }) {
  const [imgUrl] = useState(() => URL.createObjectURL(file))
  const [imgNatural, setImgNatural] = useState(null)
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [minScale, setMinScale] = useState(1)
  const [exporting, setExporting] = useState(false)

  const imgRef     = useRef(null)
  const frameRef   = useRef(null)
  const gestureRef = useRef(null)

  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl])

  // Mantém a imagem sempre cobrindo o quadro (sem áreas vazias)
  function clampTransform(scale, tx, ty, natural) {
    const w = natural.w * scale
    const h = natural.h * scale
    const minTx = Math.min(0, FRAME_W - w)
    const minTy = Math.min(0, FRAME_H - h)
    return {
      scale,
      tx: Math.min(0, Math.max(minTx, tx)),
      ty: Math.min(0, Math.max(minTy, ty)),
    }
  }

  // Zoom inicial: imagem cobre o quadro inteiro (fit), centralizada
  function handleImgLoad() {
    const img = imgRef.current
    const natural = { w: img.naturalWidth, h: img.naturalHeight }
    const scale = Math.max(FRAME_W / natural.w, FRAME_H / natural.h)
    setImgNatural(natural)
    setMinScale(scale)
    setTransform({
      scale,
      tx: (FRAME_W - natural.w * scale) / 2,
      ty: (FRAME_H - natural.h * scale) / 2,
    })
  }

  function getFramePoint(clientX, clientY) {
    const rect = frameRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function dist(t0, t1) {
    return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
  }

  // ── Touch nativo: arrastar (1 dedo) e pinça (2 dedos) ──────────
  function onTouchStart(e) {
    const touches = e.touches
    if (touches.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startX: touches[0].clientX, startY: touches[0].clientY,
        startTx: transform.tx, startTy: transform.ty,
      }
    } else if (touches.length >= 2) {
      const origin = getFramePoint(
        (touches[0].clientX + touches[1].clientX) / 2,
        (touches[0].clientY + touches[1].clientY) / 2,
      )
      gestureRef.current = {
        mode: 'pinch',
        startDist: dist(touches[0], touches[1]),
        startScale: transform.scale,
        startTx: transform.tx, startTy: transform.ty,
        origin,
      }
    }
  }

  function onTouchMove(e) {
    if (!imgNatural || !gestureRef.current) return
    e.preventDefault()
    const g = gestureRef.current
    const touches = e.touches
    if (g.mode === 'pan' && touches.length === 1) {
      const dx = touches[0].clientX - g.startX
      const dy = touches[0].clientY - g.startY
      setTransform(t => clampTransform(t.scale, g.startTx + dx, g.startTy + dy, imgNatural))
    } else if (g.mode === 'pinch' && touches.length >= 2) {
      const newDist  = dist(touches[0], touches[1])
      const ratio    = newDist / g.startDist
      const newScale = Math.min(Math.max(g.startScale * ratio, minScale), minScale * MAX_ZOOM_MULT)
      const factor   = newScale / g.startScale
      const newTx = g.origin.x - (g.origin.x - g.startTx) * factor
      const newTy = g.origin.y - (g.origin.y - g.startTy) * factor
      setTransform(clampTransform(newScale, newTx, newTy, imgNatural))
    }
  }

  function onTouchEnd(e) {
    const touches = e.touches
    if (touches.length === 0) {
      gestureRef.current = null
    } else if (touches.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startX: touches[0].clientX, startY: touches[0].clientY,
        startTx: transform.tx, startTy: transform.ty,
      }
    }
  }

  // ── Mouse (desktop): arrastar + roda do mouse para zoom ────────
  function onMouseDown(e) {
    gestureRef.current = {
      mode: 'pan',
      startX: e.clientX, startY: e.clientY,
      startTx: transform.tx, startTy: transform.ty,
    }
  }
  function onMouseMove(e) {
    const g = gestureRef.current
    if (!g || g.mode !== 'pan' || !imgNatural) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    setTransform(t => clampTransform(t.scale, g.startTx + dx, g.startTy + dy, imgNatural))
  }
  function onMouseUp() {
    gestureRef.current = null
  }
  function onWheel(e) {
    if (!imgNatural) return
    e.preventDefault()
    const origin = getFramePoint(e.clientX, e.clientY)
    const factor  = e.deltaY > 0 ? 0.92 : 1.08
    setTransform(t => {
      const newScale = Math.min(Math.max(t.scale * factor, minScale), minScale * MAX_ZOOM_MULT)
      const f = newScale / t.scale
      return clampTransform(
        newScale,
        origin.x - (origin.x - t.tx) * f,
        origin.y - (origin.y - t.ty) * f,
        imgNatural,
      )
    })
  }

  // Exporta a área visível do quadro em 400x600 e converte para WebP
  function handleConfirm() {
    if (!imgNatural || exporting) return
    setExporting(true)
    const canvas = document.createElement('canvas')
    canvas.width  = EXPORT_W
    canvas.height = EXPORT_H
    const ctx = canvas.getContext('2d')
    const factor = EXPORT_W / FRAME_W
    ctx.drawImage(
      imgRef.current,
      0, 0, imgNatural.w, imgNatural.h,
      transform.tx * factor, transform.ty * factor,
      imgNatural.w * transform.scale * factor, imgNatural.h * transform.scale * factor,
    )
    canvas.toBlob(blob => {
      setExporting(false)
      if (!blob) return
      const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })
      onConfirm(webpFile)
    }, 'image/webp', 0.82)
  }

  return (
    <div className="crop-overlay">
      <div className="crop-sheet">
        <div className="crop-title">Ajustar capa</div>
        <div
          className="crop-frame"
          ref={frameRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <img
            ref={imgRef}
            src={imgUrl}
            alt=""
            draggable={false}
            onLoad={handleImgLoad}
            style={{
              width:      imgNatural ? imgNatural.w : 'auto',
              height:     imgNatural ? imgNatural.h : 'auto',
              transform:  `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
              visibility: imgNatural ? 'visible' : 'hidden',
            }}
          />
        </div>
        <div className="crop-hint">Arraste para posicionar · pince para dar zoom</div>
        <div className="post-form-btns" style={{ width: '100%' }}>
          <button className="post-cancel-btn" onClick={onCancel}>Cancelar</button>
          <button className="post-publish-btn" onClick={handleConfirm} disabled={!imgNatural || exporting}>
            {exporting ? 'Processando…' : 'Confirmar recorte'}
          </button>
        </div>
      </div>
    </div>
  )
}
