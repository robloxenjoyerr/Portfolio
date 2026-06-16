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
    const manager = new THREE.LoadingManager()
    const tmpCamPos = useRef<THREE.Vector3 | null>(null)
    const falconRef = useRef<THREE.Group>(new THREE.Group())
    const tunnelRef = useRef<THREE.Mesh | null>(null)
    const clockRef = useRef(new THREE.Clock())

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
                    const speedVal = hyperspeedRef.current

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

                    const visible = hyperspeedRef.current > 10
                    tunnel.visible = visible
                    mat.uniforms.opacity.value = visible ? 1.0 : 0.0
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
                            pointsMat.opacity = 0
                            pointsMat.needsUpdate = true
                        }
                    }

                    if (tunnelRef.current) {
                        const mat = tunnelRef.current.material
                        if (!Array.isArray(mat)) {
                            mat.opacity = 1
                            mat.needsUpdate = true
                        }
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
            }, 1.7)

            // Phase 3 — Abbremsen
            .to(hyperspeedRef, {
                current: 0,
                duration: 0.6,
                ease: "power3.out"
            }, 3)

            .to(fov, {
                state: 72,
                duration: 0.6,
                ease: "power2.out",
                onUpdate: () => {
                    camera.fov = fov.state
                    camera.updateProjectionMatrix()
                }
            }, 3)

            .call(() => {
                if (starFieldRef.current) {
                    const mat = starFieldRef.current.material
                    if (!Array.isArray(mat)) {
                        const pointsMat = mat as THREE.PointsMaterial
                        pointsMat.opacity = 0.9
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
            const tunnelGeometry = new THREE.CylinderGeometry(80, 80, 700, 128, 64, false)
            tunnelGeometry.rotateX(Math.PI / 2)

            const tunnelMaterial = new THREE.ShaderMaterial({
                transparent: true,
                side: THREE.BackSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,

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

            float band(float x, float count, float offset) {
                return smoothstep(0.48, 0.52, abs(fract(x * count + offset) - 0.5));
            }

            void main() {
                vec2 uv = vUv;
                float depth = 1.0 - uv.y;
                float angle = uv.x * 6.28318;

                float radial = 1.0 - length(vec2(uv.x - 0.5, uv.y - 0.5)) * 1.6;
                radial = clamp(radial, 0.0, 1.0);

                float glow = smoothstep(0.18, 0.55, radial);
                float rings = band(depth, 10.0, time * 0.35);
                float spokes = band(angle / 6.28318, 20.0, time * 0.14);
                float centerLine = smoothstep(0.0, 0.06, 1.0 - abs(uv.x - 0.5) * 2.0);
                float streak = smoothstep(0.98, 1.0, abs(fract(depth * 32.0 + time * 0.9) - 0.5));

                vec3 base = mix(vec3(0.01, 0.05, 0.14), vec3(0.05, 0.24, 0.54), radial);
                vec3 accent = vec3(0.4, 0.85, 1.0) * (0.18 * rings + 0.2 * spokes + 0.15 * centerLine + 0.1 * streak);
                vec3 color = base + accent;

                float alpha = opacity * clamp((0.35 + glow * 0.65) * (0.12 + rings * 0.35 + centerLine * 0.28 + streak * 0.2), 0.0, 1.0);

                gl_FragColor = vec4(color, alpha);
            }
        `
            })

            const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial)
            tunnel.position.set(0, 0, 250)
            tunnel.visible = false

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
