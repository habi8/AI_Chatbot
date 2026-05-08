"use client"

import { useState } from "react"
import AuthenticationCard from "@/components/authentication-card"

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: "50%", y: "50%" })
  const [glowPower, setGlowPower] = useState(0.18)

  const glowSize = Math.round(260 + glowPower * 900)

  return (
    <div
      className="relative h-screen overflow-hidden bg-black p-4 text-white"
      onMouseMove={(event) => {
        setMousePosition({
          x: `${event.clientX}px`,
          y: `${event.clientY}px`,
        })
      }}
      onWheel={(event) => {
        event.preventDefault()
        setGlowPower((currentPower) => {
          const nextPower =
            event.deltaY < 0 ? currentPower + 0.04 : currentPower - 0.04
          return Math.min(0.42, Math.max(0.06, nextPower))
        })
      }}
      style={
        {
          "--mouse-x": mousePosition.x,
          "--mouse-y": mousePosition.y,
          "--glow-size": `${glowSize}px`,
          "--glow-alpha": glowPower,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(75,85,99,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(75,85,99,0.16)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--glow-size)_circle_at_var(--mouse-x)_var(--mouse-y),rgba(156,163,175,var(--glow-alpha)),transparent_70%)] transition-[background] duration-150" />
      <main className="relative flex h-full items-center justify-center">
        <AuthenticationCard />
      </main>
    </div>
  )
}
