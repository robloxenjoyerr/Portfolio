import * as THREE from "three"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import gsap from "gsap"
import { EffectComposer, GLTFLoader, HDRLoader, KTX2Loader, UnrealBloomPass } from 'three/examples/jsm/Addons.js'
import { RenderPass } from 'three/examples/jsm/Addons.js'
import { createPlanet } from './ThreeHelperFunctions'

export type SceneAPI = {
    focusPlanet: (id: string) => void
}

type Props = {
    className?: string
    onMounted?: () => void
    onProgress?: (p: number) => void
    onStateChange?: (id: string) => void
    hasEntered: boolean
}

const PLANETS = [
    { id: "home" },
    { id: "projects" },
    { id: "skills" },
    { id: "sun" }
]

const ThreeScene = forwardRef<SceneAPI, Props>(function ThreeScene(
    { className = "", onMounted, onProgress, onStateChange, hasEntered },
    ref
) {
    let progress = 0

    const containerRef = useRef<HTMLDivElement>(null)
    const mouse = useRef({ x: 0, y: 0 })
    const [isLoaded, setIsLoaded] = useState<boolean>(false)
    const [isMobile, setIsMobile] = useState(false)
    const sceneRef = useRef<THREE.Scene | null>(null)

    const homeTarget = new THREE.Vector3(0, 0, 75)
    const cameraTarget = useRef(homeTarget)
    const cameraRef = useRef<THREE.PerspectiveCamera>(null)
    const isAnimating = useRef(false)

    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const planetsRef = useRef<THREE.Mesh[]>([])
    const sunRef = useRef<THREE.Group | null>(null)
    const sunShaderRef = useRef<any>(null)
    const starFieldRef = useRef<THREE.Points | null>(null)
    const hyperspeedRef = useRef(0)  // nur für den Enter-Effekt
    const displayedHyperspeedRef = useRef(0)
    const manager = new THREE.LoadingManager()
    const tmpCamPos = useRef<THREE.Vector3 | null>(null)
    const falconRef = useRef<THREE.Group>(new THREE.Group())
    const tunnelRef = useRef<THREE.Mesh | null>(null)
    const clockRef = useRef(new THREE.Clock())
    const enterSoundRef = useRef<HTMLAudioElement | null>(null)
    const exitSoundRef = useRef<HTMLAudioElement | null>(null)
    const hyperSpaceRef = useRef<HTMLAudioElement | null>(null)

    manager.onProgress = (url, loaded, total) => {
        onProgress?.(loaded / total)
    }

    function stepProgress() {
        progress += 1 / 4
        onProgress?.(progress)
    }

    function getPlanetPosition(p: any) {
        const index = PLANETS.findIndex(planet => planet.id === p.id)
        const spacing = 250

        return new THREE.Vector3(index * spacing, 0, 0)
    }

    function handleMouseMove(e: React.MouseEvent) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    }

    useEffect(() => {
        setIsMobile(window.innerWidth < 768)
    }, [])


    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        cameraRef.current = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        )
        cameraRef.current.position.x = 0
        cameraRef.current.position.y = 0
        cameraRef.current.position.z = 500

        tmpCamPos.current = new THREE.Vector3(0, 0, 0)  // schaut direkt auf Home

        sceneRef.current = new THREE.Scene()
        sceneRef.current.fog = new THREE.FogExp2("#000000", 0.002)
        sceneRef.current.background = null

        rendererRef.current = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        })

        const composer = new EffectComposer(rendererRef.current)
        const renderPass = new RenderPass(sceneRef.current, cameraRef.current)
        composer.addPass(renderPass)

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(container.clientWidth, container.clientHeight),
            0.6,
            0.8,
            0.4
        )
        composer.addPass(bloomPass)

        rendererRef.current.setSize(
            container.clientWidth,
            container.clientHeight
        )

        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        rendererRef.current.outputColorSpace = THREE.SRGBColorSpace
        rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping
        rendererRef.current.toneMappingExposure = 1.3

        container.appendChild(rendererRef.current.domElement)


        async function init() {
            sceneRef.current?.add(falconRef.current)
            await initPage(container)

            function animate() {

                requestAnimationFrame(animate)
                if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !tmpCamPos.current) return

                if (!isAnimating.current) {
                    tmpCamPos.current.lerp(cameraTarget.current, 0.05)
                    cameraRef.current.lookAt(tmpCamPos.current)
                }

                planetsRef.current.forEach((p) => {
                    p.rotateX(0.0005)
                    p.rotateY(0.0004)
                })

                if (sunShaderRef.current) {
                    sunShaderRef.current.uniforms.time.value += 0.01
                }

                if (sunRef.current) {
                    sunRef.current.rotation.y += 0.001
                }

                if (starFieldRef.current) {
                    const attr = starFieldRef.current.geometry.attributes.position
                    const arr = attr.array as Float32Array
                    // smooth displayed hyperspeed to avoid abrupt jumps
                    displayedHyperspeedRef.current = THREE.MathUtils.lerp(displayedHyperspeedRef.current, hyperspeedRef.current, 0.08)
                    const speedVal = displayedHyperspeedRef.current

                    for (let i = 0; i < arr.length; i += 3) {
                        arr[i + 2] += speedVal * 4

                        if (arr[i + 2] > 1000) {
                            arr[i] = (Math.random() - 0.5) * 2000
                            arr[i + 1] = (Math.random() - 0.5) * 2000
                            arr[i + 2] = -1000
                        }
                    }
                    attr.needsUpdate = true
                }

                if (tunnelRef.current && cameraRef.current) {
                    const tunnel = tunnelRef.current
                    const mat = tunnel.material as THREE.ShaderMaterial

                    const elapsed = clockRef.current.getElapsedTime()

                    mat.uniforms.time.value = elapsed * 0.35

                    tunnel.position.copy(cameraRef.current.position)
                    tunnel.position.z -= 100

                    tunnel.rotation.z += 0.002

                    // use the smoothed hyperspeed for visibility and opacity
                    const visible = displayedHyperspeedRef.current > 10
                    tunnel.visible = visible || mat.uniforms.opacity.value > 0.001
                    const targetOpacity = displayedHyperspeedRef.current > 10 ? 0.6 : 0.0
                    mat.uniforms.opacity.value = THREE.MathUtils.lerp(mat.uniforms.opacity.value, targetOpacity, 0.08);
                }
                composer.render()
                //rendererRef.current.render(sceneRef.current, cameraRef.current)
            }
            animate()
            setIsLoaded(true)
            onMounted?.()
        }

        init()


        const resize = () => {
            if (!cameraRef.current || !rendererRef.current) return

            const width = container.clientWidth
            const height = container.clientHeight

            cameraRef.current.aspect = width / height
            cameraRef.current.updateProjectionMatrix()

            rendererRef.current.setSize(width, height)
            composer.setSize(width, height)
        }
        resize()
        window.addEventListener("resize", resize)


        return () => {
            window.removeEventListener("resize", resize)
            rendererRef.current?.setAnimationLoop(null)
            rendererRef.current?.dispose()
            container.innerHTML = ""
        }
    }, [])

    useEffect(() => {
        if (hasEntered && falconRef) return

        function drift() {
            gsap.to(falconRef.current.position, {
                x: (Math.random() - 0.8) * 25,
                y: (Math.random() - 0.8) * 15,
                z: (Math.random() - 0.8) * 15,
                duration: 2.5 + Math.random() * 2,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut",
                onComplete: drift
            })
        }

        const timeout = setTimeout(drift, 1500)
        return () => clearTimeout(timeout)
    }, [])

    useEffect(() => {
        if (!hasEntered) return
        const camera = cameraRef.current
        const planetData = PLANETS.find((p) => p.id === "home")
        if (!planetData || !camera || !sceneRef.current) return

        const pos = getPlanetPosition(planetData)
        const fov = { state: camera.fov }

        const targetPos = new THREE.Vector3(
            pos.x,
            pos.y,
            pos.z + 6
        )

        isAnimating.current = true

        gsap.timeline()
            .to(hyperspeedRef, {
                current: 5,
                duration: 1,
                ease: "none"
            }, 0)

            .to(fov, {
                state: 90,
                duration: 1,
                ease: "power1.in",
                onUpdate: () => {
                    camera.fov = fov.state
                    camera.updateProjectionMatrix()
                },
                onStart: () => {

                    if (enterSoundRef.current) {
                        enterSoundRef.current.currentTime = 0
                        enterSoundRef.current.play()
                    }

                }
            }, 0)

            //2

            .to(hyperspeedRef, {
                current: 40,
                duration: 0.25,
                ease: "power4.in",
                onStart: () => {
                    camera.updateProjectionMatrix()
                    if (starFieldRef.current) {
                        const mat = starFieldRef.current.material
                        if (!Array.isArray(mat)) {
                            const pointsMat = mat as THREE.PointsMaterial
                            gsap.to(pointsMat, { opacity: 0, duration: 0.6 })
                            pointsMat.needsUpdate = true
                        }
                    }

                    if (tunnelRef.current) {
                        const mat = tunnelRef.current.material
                        if (!Array.isArray(mat)) {
                            // set shader uniform opacity to a softer mist value
                            if ((mat as any).uniforms && (mat as any).uniforms.opacity) {
                                (mat as any).uniforms.opacity.value = 0.6
                            }
                            mat.needsUpdate = true
                        }
                    }

                },
                onComplete: () => {
                    if (hyperSpaceRef.current) {
                        hyperSpaceRef.current.currentTime = 0
                        hyperSpaceRef.current.play()
                    }
                }
            }, 1)

            .to(fov, {
                state: 120,
                duration: 0.25,
                ease: "power4.in",
                onUpdate: () => {
                    camera.fov = fov.state
                    camera.updateProjectionMatrix()
                }
            }, 1)

            //3

            .to(camera.position, {
                x: targetPos.x,
                y: targetPos.y,
                z: targetPos.z,
                duration: 1.8,
                ease: "power2.inOut",
            }, 2.4)

            // Phase 3 — Abbremsen
            .to(hyperspeedRef, {
                current: 0,
                duration: 0.6,
                ease: "power3.out",
                onStart: () => {
                    try {
                        if (exitSoundRef.current) {
                            exitSoundRef.current.currentTime = 0
                            exitSoundRef.current.play()
                        }

                        if (hyperSpaceRef.current) {
                            hyperSpaceRef.current.pause()
                        }
                    } catch (e) {
                        console.warn('Failed to play exit hyperspace sound', e)
                    }
                    // quickly snap camera and FOV toward target for an almost-instant arrival
                    try {
                        if (cameraRef.current) {
                            gsap.to(cameraRef.current.position, {
                                x: targetPos.x,
                                y: targetPos.y,
                                z: targetPos.z,
                                duration: 0.12,
                                ease: 'power4.out'
                            })
                        }

                        gsap.to(fov, {
                            state: 72,
                            duration: 0.12,
                            ease: 'power4.out',
                            onUpdate: () => {
                                camera.fov = fov.state
                                camera.updateProjectionMatrix()
                            }
                        })
                    } catch (e) {
                        // ignore
                    }
                }
            }, 3.5)

            .to(fov, {
                state: 72,
                duration: 0.6,
                ease: "power2.out",
                onUpdate: () => {
                    camera.fov = fov.state
                    camera.updateProjectionMatrix()
                }
            }, 3.5)

            .call(() => {
                if (starFieldRef.current) {
                    const mat = starFieldRef.current.material
                    if (!Array.isArray(mat)) {
                        const pointsMat = mat as THREE.PointsMaterial
                        gsap.to(pointsMat, { opacity: 0.9, duration: 0.8 })
                        pointsMat.needsUpdate = true
                    }
                }
                isAnimating.current = false
                tmpCamPos.current?.copy(pos)
                cameraTarget.current.copy(pos)  // ← damit lookAt danach auch stimmt
            })

    }, [hasEntered])

    function focusPlanet(id: string) {
        const planetData = PLANETS.find((p) => p.id === id)
        if (!planetData || !cameraRef.current || !sceneRef.current) return

        const pos = getPlanetPosition(planetData)
        const targetPos = new THREE.Vector3(
            pos.x,
            pos.y,
            pos.z + 6
        )

        const camera = cameraRef.current
        isAnimating.current = true

        const fov = { state: camera.fov }
        const TRAVEL_DURATION = 3
        gsap.timeline()

            .to(fov, {
                state: 90,
                duration: TRAVEL_DURATION * 0.25,
                ease: "power1.in",
                onUpdate: () => {
                    camera.updateProjectionMatrix()
                }
            }, 0)



            .to(camera.position, {
                x: targetPos.x,
                y: targetPos.y,
                z: targetPos.z,
                duration: TRAVEL_DURATION,
                ease: "power1.inOut",
                onUpdate: () => {
                    camera.fov += (fov.state - camera.fov) * 0.08
                    camera.updateProjectionMatrix()
                }
            }, 0)

            .to(cameraTarget.current, {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                duration: TRAVEL_DURATION,
                ease: "power3.inOut"
            }, 0)



            .to(fov, {
                state: 72,
                duration: TRAVEL_DURATION * 0.4,
                ease: "power2.out",
                onUpdate: () => {
                    camera.updateProjectionMatrix()
                }
            }, TRAVEL_DURATION * 0.55)

            .call(() => {
                onStateChange?.(id)
                isAnimating.current = false
                tmpCamPos.current?.copy(pos)
            }, [], TRAVEL_DURATION)
    }


    async function initPage(container: HTMLDivElement | null) {
        if (!container || !sceneRef.current) return

        // preload hyperspace sound effects
        try {
            const enterAudio = new Audio('/soundeffects/bh-enter-hyperspace.mp3')
            enterAudio.preload = 'auto'
            enterAudio.volume = 0.6
            enterSoundRef.current = enterAudio

            const exitAudio = new Audio('/soundeffects/bh-exit-hyperspace.mp3')
            exitAudio.preload = 'auto'
            exitAudio.volume = 0.6
            exitSoundRef.current = exitAudio

            const hyperSpaceAudio = new Audio('/soundeffects/freesound_community-space-ship-102433.mp3')
            hyperSpaceAudio.preload = 'auto'
            hyperSpaceAudio.volume = 0.3
            hyperSpaceAudio.loop = true
            hyperSpaceRef.current = hyperSpaceAudio
        } catch (e) {
            console.warn('Failed to load hyperspace audio', e)
        }

        //import millinizum falcon
        try {
            const loader = new GLTFLoader()

            const model = await loader.loadAsync("/GLB/milleniumFalcon.glb")
            model.scene.scale.set(0.2, 0.2, 0.2)
            model.scene.rotation.set(0, Math.PI, 0)
            model.scene.position.set(0, -85, 200)
            falconRef.current.add(model.scene)

        } catch (err) {
            console.error(err)
        }

        // generate real content planets
        try {

            PLANETS.forEach((p) => {
                let planet

                planet = createPlanet(p)
                planet.position.copy(getPlanetPosition(p))
                sceneRef.current?.add(planet)

            })

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
            sceneRef.current?.add(ambientLight)



            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
            directionalLight.position.set(5, 5, 5)
            sceneRef.current?.add(directionalLight)

            stepProgress()
            console.log("Textures loaded successfully")
        } catch (error) {
            console.error("Error loading textures:", error)
            // Still proceed without textures or with fallback
        }


        // generate stars as soft round points
        try {
            const geo = new THREE.BufferGeometry()
            const count = 20000
            const positions = new Float32Array(count * 3)

            for (let i = 0; i < count * 3; i += 3) {
                positions[i] = (Math.random() - 0.5) * 2000
                positions[i + 1] = (Math.random() - 0.5) * 2000
                positions[i + 2] = (Math.random() - 0.5) * 2000
            }

            geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))

            // round glowing star texture
            const canvas = document.createElement("canvas")
            canvas.width = 64
            canvas.height = 64

            const ctx = canvas.getContext("2d")

            if (ctx) {
                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
                gradient.addColorStop(0, "rgba(255,255,255,1)")
                gradient.addColorStop(0.25, "rgba(255,255,255,0.8)")
                gradient.addColorStop(0.6, "rgba(255,255,255,0.25)")
                gradient.addColorStop(1, "rgba(255,255,255,0)")

                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, 64, 64)
            }

            const starTexture = new THREE.CanvasTexture(canvas)

            const mat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.6,
                map: starTexture,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true
            })

            const starField = new THREE.Points(geo, mat)
            starFieldRef.current = starField
            sceneRef.current.add(starField)

            stepProgress()
            console.log("Starfield generated successfully")
        } catch (err) {
            console.error(err)
        }

        try {
            const tunnelGeometry = new THREE.CylinderGeometry(80, 80, 900, 128, 64, false)
            tunnelGeometry.rotateX(Math.PI / 2)

            const tunnelMaterial = new THREE.ShaderMaterial({
                transparent: true,
                side: THREE.BackSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false,

                uniforms: {
                    time: { value: 0 },
                    opacity: { value: 0 }
                },

                vertexShader: `
            varying vec2 vUv;
            varying vec3 vPos;

            void main() {
                vUv = uv;
                vPos = position;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,

                fragmentShader: `
            uniform float time;
            uniform float opacity;

            varying vec2 vUv;
            varying vec3 vPos;

            float pulse(float x, float speed) {
                return 0.5 + 0.5 * sin(x * 12.0 - time * speed);
            }

            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);

                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));

                vec2 u = f * f * (3.0 - 2.0 * f);

                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float amp = 0.5;

                for (int i = 0; i < 5; i++) {
                    v += amp * noise(p);
                    p *= 2.02;
                    amp *= 0.55;
                }

                return v;
            }

            void main() {
                vec2 uv = vUv;

                float depth = 1.0 - uv.y;
                float angle = uv.x * 6.28318;

                float radial = 1.0 - length(vec2(uv.x - 0.5, uv.y - 0.5)) * 1.6;
                radial = clamp(radial, 0.0, 1.0);

                float glow = smoothstep(0.15, 0.9, radial);

                float r = log(depth + 0.045) * 1.9 - time * 1.75;
                vec2 streakCoord = vec2(angle * 15.5, r * 1.15);

                float n = fbm(streakCoord);
                n = pow(clamp(n, 0.0, 1.0), 2.6);

                float n2 = fbm(streakCoord * 2.5 + 17.0);
                float streaks = clamp(n * 1.65 + n2 * 0.35, 0.0, 1.0);

                float grain = fbm(streakCoord * 6.5 - time * 2.8) * 0.22;

                float centerLine = smoothstep(0.0, 0.075, 1.0 - abs(uv.x - 0.5) * 2.0);
                float pulseCore = pulse(depth, 1.5) * glow;

                // Je weiter hinten, desto stärker der helle Tunnel-End-Eindruck
                float farEnd = smoothstep(0.62, 1.0, depth);
                float farEndPulse = 0.75 + 0.25 * sin(time * 3.5);

                // Dunkles kräftiges Blau
                vec3 deepBlue = vec3(0.005, 0.025, 0.11);

                // Mittleres sattes Hyperspace-Blau
                vec3 richBlue = vec3(0.02, 0.17, 0.55);

                // Helles elektrisches Cyan-Blau wie im Bild
                vec3 brightBlue = vec3(0.22, 0.62, 1.35);

                // Weiß-blauer Kern am Ende
                vec3 whiteBlue = vec3(0.85, 1.15, 1.6);

                vec3 base = mix(deepBlue, richBlue, radial);
                base += richBlue * glow * 0.35;

                vec3 accent = brightBlue * (streaks * 0.65 + grain * 0.65);
                vec3 core = whiteBlue * pulseCore * 0.28;

                // Far-End-Glow: lässt es aussehen, als wäre hinten ein sehr weit entferntes weißes Licht
                vec3 farGlow = whiteBlue * farEnd * farEndPulse * 0.95;
                farGlow += brightBlue * farEnd * streaks * 0.45;

                vec3 color = base + accent + core + farGlow;

                float mist = 0.22 + glow * 0.85;
                float streakAlpha = 0.18 + streaks * 0.65 + grain * 0.35;
                float farAlpha = farEnd * 0.55;

                float alpha = opacity * clamp(mist * streakAlpha + farAlpha, 0.0, 1.0) * 0.85;

                gl_FragColor = vec4(color, alpha);
            }
        `
            })

            const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial)
            tunnel.position.set(0, 0, 250)
            tunnel.visible = false

            // Weißes Licht ganz hinten im Hyperspace-Tunnel
            const lightCanvas = document.createElement("canvas")
            lightCanvas.width = 256
            lightCanvas.height = 256

            const ctx = lightCanvas.getContext("2d")

            if (ctx) {
                const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)

                gradient.addColorStop(0.0, "rgba(255, 255, 255, 1.0)")
                gradient.addColorStop(0.18, "rgba(180, 230, 255, 0.95)")
                gradient.addColorStop(0.42, "rgba(70, 160, 255, 0.45)")
                gradient.addColorStop(1.0, "rgba(0, 20, 90, 0.0)")

                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, 256, 256)
            }

            const endLightTexture = new THREE.CanvasTexture(lightCanvas)

            const endLightMaterial = new THREE.SpriteMaterial({
                map: endLightTexture,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            })

            const endLight = new THREE.Sprite(endLightMaterial)

            // Bei 900 Tunnel-Länge liegt das Ende ungefähr bei +450.
            // Leicht davor setzen, damit es sichtbar im Tunnel sitzt.
            endLight.position.set(0, 0, 430)
            endLight.scale.set(180, 180, 1)

            tunnel.add(endLight)

            tunnelRef.current = tunnel
            sceneRef.current.add(tunnel)
        } catch (err) {
            console.error("Error creating hyperspace tunnel:", err)
        }
    }





    useImperativeHandle(ref, () => ({
        focusPlanet
    }))

    return <div ref={containerRef} onMouseMove={(e) => handleMouseMove(e)} className={`fixed inset-0 z-0 overflow-hidden ${className}`} />
}
)

export default ThreeScene
