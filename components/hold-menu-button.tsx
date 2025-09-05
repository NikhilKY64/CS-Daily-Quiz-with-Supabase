"use client"

import { useEffect, useRef, useState } from "react"

type HoldMenuButtonProps = {
  onLongPress: () => void
  holdTime?: number // milliseconds
  title?: string
}

export default function HoldMenuButton({
  onLongPress,
  holdTime = 600,
  title = "Menu",
}: HoldMenuButtonProps) {
  const timer = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const startHold = (e: any) => {
    // prevent focus/drag side-effects
    try {
      e?.preventDefault?.()
    } catch {}
    setHolding(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onLongPress()
      setHolding(false)
      timer.current = null
    }, holdTime)
  }

  const cancelHold = () => {
    setHolding(false)
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  return (
    <div className="background" title={title}>
      <button
        className={`menu__icon ${holding ? "holding" : ""}`}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") startHold(e)
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") cancelHold()
        }}
        aria-pressed={holding}
        aria-label={title}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  )
}
