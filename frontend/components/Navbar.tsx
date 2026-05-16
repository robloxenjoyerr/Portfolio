'use client'

import { useEffect, useState, useRef } from "react"
import gsap from "gsap"

export default function Navbar({ className = "", onStateChange }: { className: string, onStateChange: (state: string) => void}) {
    const [active, setActive] = useState(0)
    const [siteState, setSiteState] = useState("home")
    const ref = useRef(siteState)

    const Options = [
        { name: "Home", ref: "home", icon: "" },
        { name: "Projects", ref: "projects", icon: "" },
        { name: "Skills", ref: "skills", icon: "" },
        { name: "sun", ref: "sun", icon: ""}
    ]

    useEffect(() => {
        gsap.to(".ship", {
            y: active * 40,
            duration: 3,
            ease: "power1.out"
        })
    }, [active])

    const navItemStyle = "font-plexMono flex gap-2 items-center w-fit p-1 hover:cursor-pointer hover:text-white text-center"

    return (
        <nav
            className={`  absolute select-none flex gap-5 mr-5 right-0 top-1/2 -translate-y-1/2 z-20  ${className}`}
        >
            <div
                className="flex flex-col gap-2"
            >
                {Options.map((o, index) => (
                    <a 
                        //href={o.ref}
                        key={index}
                    >
                        <button
                            type="button"
                            onClick={() => {setActive(index); setSiteState(o.ref); onStateChange(o.ref)}}
                            key={index}
                            className="relative flex items-center gap-3"
                        >
                            <p className={`${navItemStyle} ${index === active ? "text-white" : "text-white/30"}`}>
                                {o.name}
                            </p>
                        </button>
                    </a>
                ))}
            </div>



            {/*Spaceship*/}
            <div className="ship absolute right-23 top-0">🚀</div>
        </nav>
    )
}