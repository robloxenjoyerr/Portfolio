import { useEffect, useState } from "react"
import { useRef } from "react"
import * as THREE from "three"
import gsap from "gsap"

export default function LoadingBar({ progress }: { progress: number | null }) {
    const barRef = useRef(null)

    useEffect(() => {
        if (progress === null || progress === undefined) return

        console.log("Progress LoadingBar: ", progress)

        gsap.to(barRef.current, {
            width: `${progress * 100}%`,
            duration: 0.3,
            ease: "power2.out"
        })

        
    }, [progress])

    useEffect(()=> {
        gsap.to(".dots", {
            y: -5,
            duration: 0.2,
            stagger: 0.05,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",

        })
    }, [])

    return (
        <div>
            <span className="flex">
                <p>Loading</p>
                <span className="flex">
                    <p className="dots">.</p>
                    <p className="dots">.</p>
                    <p className="dots">.</p>
                </span>
            </span>
            <div className="flex w-60 max-h-0.5  transition-all ease-in-out border-b-2 border-white/20">
                <div
                    style={{ width: "0%" }}
                    className={` p-1 self-center border-b-2 border-red-600`}
                    ref={barRef}
                >
                </div>
            </div>
        </div>
    )
}