"use client"
import { useEffect, useState } from "react";
import gsap from "gsap";
import { useRef } from "react";
import ThreeScene, { SceneAPI } from "@/components/ThreeScene";
import LoadingBar from "@/components/LoadingBar";
import Navbar from "@/components/Navbar";

const nameLetters = "Enter".split("");

export default function Home() {
  const [sceneLoaded, setSceneLoaded] = useState<boolean>(false)
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null)
  const loadingScreenRef = useRef<HTMLDivElement>(null)

  const [transition, setTransition] = useState<boolean>(false)
  const [siteState, setSiteState] = useState<string>("home")
  const sceneRef = useRef<SceneAPI>(null)
  const [hasEntered, setHasEntered] = useState<boolean>(false)


  function handleEnter() {

    gsap.to(".letter", {
      z: 500,
      opacity: 0,
      rotationX: 90,        // perspektivisch weggeneigt wie der Crawl
      transformOrigin: "50% 100%",
      stagger: 0.06,
      duration: 1,
      ease: "power2.out",
    })

    setTimeout(() => setHasEntered(true), 200)
    
  }

  useEffect(() => {
    console.log(siteState)
  }, [siteState])

  useEffect(() => {
    if (!sceneLoaded) return
    
    gsap.from(".content", {
      opacity: 0,
      filter: "blur(5px)",
      duration: 2
    })


    gsap.from(".letter", {
      y: 200,
      opacity: 0,
      rotationX: 90,        // perspektivisch weggeneigt wie der Crawl
      transformOrigin: "50% 100%",
      stagger: 0.06,
      duration: 1.2,
      ease: "power2.out",
    })

  }, [sceneLoaded]);

  function handleNavbarClick(e: string) {
    setSiteState(e)
    sceneRef.current?.focusPlanet(e)
  }

  function onMounted() {
    setSceneLoaded(true)

    if (loadingScreenRef.current) {
      gsap.to(loadingScreenRef.current, {
        opacity: 0,
        duration: 1,
        delay: 2,
        ease: "power2.out",
        onStart: () => {
          loadingScreenRef.current!.style.pointerEvents = "none"
        },
        onComplete: () => {
          loadingScreenRef.current!.style.display = "none"
        }        
      })
    }
  }

  return <>

    <div ref={loadingScreenRef} className="loadingScreen fixed inset-0 z-40  flex items-center justify-center bg-black text-white text-2xl">
      <LoadingBar progress={loadingProgress}></LoadingBar>
    </div>
    <div className="content flex flex-col flex-1 items-center justify-center font-sans ">
      {hasEntered ? <Navbar onStateChange={(e) => handleNavbarClick(e)} className="content"></Navbar> : ""}
      <section className="relative flex h-screen w-full flex-col justify-center items-center overflow-hidden">

        <ThreeScene ref={sceneRef} hasEntered={hasEntered} onStateChange={(id) => setSiteState(id)} onMounted={() => onMounted()} onProgress={(p: number) => setLoadingProgress(p)} className="h-full w-full fixed z-0" />


        <div className="greeting relative z-10 text-center">
          <div className="font-bold flex flex-wrap gap-2 justify-center text-8xl font-plexMono drop-shadow-[0_0_20px_rgba(255,200,0,0.3)] transition-all duration-100 ease-in-out hover:animate-pulse hover:scale-105  text-amber-300 hover:text-amber-200">
            {nameLetters.map((letter, index) => (
              <button onClick={handleEnter} key={index} className="font-starwars letter  inline-block">
                {letter}
              </button>
            ))}

          </div>

        </div>
      </section>
    </div>
  </>
}
