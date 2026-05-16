import { createNoise2D } from 'simplex-noise'
import * as THREE from "three"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import gsap from "gsap"
import { EffectComposer, GLTFLoader, HDRLoader, KTX2Loader, UnrealBloomPass } from 'three/examples/jsm/Addons.js'
import { RenderPass } from 'three/examples/jsm/Addons.js'
import { ScreenNode } from 'three/webgpu'
import { vec3 } from 'three/tsl'
import { CLIENT_STATIC_FILES_RUNTIME_MAIN } from 'next/dist/shared/lib/constants'
import { time } from 'console'

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
    const starFieldRef = useRef<THREE.LineSegments | null>(null)
    const hyperspeedRef = useRef(0)  // nur für den Enter-Effekt
    const manager = new THREE.LoadingManager()
    const tmpCamPos = useRef<THREE.Vector3 | null>(null)
    const falconRef = useRef<THREE.Group>(new THREE.Group())


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
            2.2,
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

                if (starFieldRef.current && hyperspeedRef.current > 0) {
                    const attr = starFieldRef.current.geometry.attributes.position
                    const arr = attr.array as Float32Array
                    const speedVal = hyperspeedRef.current

                    for (let i = 0; i < arr.length; i += 6) {
                        const x = arr[i], y = arr[i + 1], z = arr[i + 2]
                        const stretch = 2 + speedVal * 8

                        arr[i + 3] = x; arr[i + 4] = y; arr[i + 5] = z - stretch

                        if (z > 1000) {
                            const rx = (Math.random() - 0.5) * 2000
                            const ry = (Math.random() - 0.5) * 2000
                            arr[i] = rx; arr[i + 1] = ry; arr[i + 2] = -1000
                            arr[i + 3] = rx; arr[i + 4] = ry; arr[i + 5] = -1000 - stretch
                        }
                        arr[i + 2] += speedVal * 4
                    }
                    attr.needsUpdate = true
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
                ease: "power4.in"
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



        //generate stars
        try {
            const geo = new THREE.BufferGeometry()
            const count = 20000
            const positions = new Float32Array(count * 6)  // wieder * 6

            for (let i = 0; i < count * 6; i += 6) {
                const x = (Math.random() - 0.5) * 2000
                const y = (Math.random() - 0.5) * 2000
                const z = (Math.random() - 0.5) * 2000
                positions[i] = x; positions[i + 1] = y; positions[i + 2] = z
                positions[i + 3] = x; positions[i + 4] = y; positions[i + 5] = z - 2
            }

            geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
            const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
            const starField = new THREE.LineSegments(geo, mat)
            starFieldRef.current = starField
            sceneRef.current.add(starField)
            stepProgress()
            console.log("Starfiel generated successfully")
        } catch (err) {
            console.error(err)
        }


        //generate fake planets
        try {
            const range = 1800  //1800
            const randomizerClamp = 0.8

            const loader = new THREE.TextureLoader(manager)

            const variants = [
                "/maps/fakePlanets/2k_earth_nightmap.jpg",
                "/maps/fakePlanets/2k_eris_fictional.jpg",
                "/maps/fakePlanets/2k_makemake_fictional.jpg",
                "/maps/fakePlanets/2k_neptune.jpg",
                "/maps/fakePlanets/2k_sun.jpg",
                "/maps/fakePlanets/2k_venus_surface.jpg",

            ]

            const planetVariants: THREE.Mesh[] = []

            const sunLight = new THREE.PointLight("#ffb300", 50, 800)
            sunLight.position.set(0, 0, 0)
            sceneRef.current.add(sunLight)

            for (const v of variants) {
                const texture = await loader.loadAsync(v)
                texture.colorSpace = THREE.SRGBColorSpace
                let material
                if (v === "2k_sun.jpg") {
                    material = new THREE.MeshStandardMaterial({
                        map: texture,
                        emissive: new THREE.Color("ffb300"),
                        emissiveMap: texture,
                        envMapIntensity: 3
                    })


                }
                else {

                    material = new THREE.MeshPhysicalMaterial({
                        map: texture,
                        roughness: 0.7,
                        metalness: 0,
                        envMapIntensity: 1.5
                    })
                }

                const geometry = new THREE.SphereGeometry(2, 16, 16)
                const planetMesh = new THREE.Mesh(geometry, material)

                //atmospherelayer
                function createAtmosphere(radius: number, color = "#66ccff") {
                    const mat = new THREE.ShaderMaterial({
                        transparent: true,
                        side: THREE.BackSide,
                        blending: THREE.AdditiveBlending,
                        uniforms: {
                            glowColor: { value: new THREE.Color(color) }
                        },
                        vertexShader: `
                            varying vec3 vNormal;
                            void main() {
                                vNormal = normalize(normalMatrix * normal);
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                            `,
                        fragmentShader: `
                            uniform vec3 glowColor;
                            varying vec3 vNormal;

                                void main() {
                                    float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1.0)), 2.0);
                                    gl_FragColor = vec4(glowColor, intensity * 0.8);
                                }
                            `
                    })

                    return new THREE.Mesh(
                        new THREE.SphereGeometry(radius * 1.15, 32, 32),
                        mat
                    )
                }

                const atmosphere = createAtmosphere(2, "#66ccff")
                planetMesh.add(atmosphere)



                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: "#44aaff",
                    transparent: true,
                    opacity: 0.18,
                    side: THREE.BackSide
                })

                const glowMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(2.3, 32, 32),
                    glowMaterial
                )

                planetMesh.add(glowMesh)



                planetVariants.push(planetMesh)

            }

            for (let i = 0; i < 500; i++) {

                const randomVariant = planetVariants[
                    Math.floor(Math.random() * planetVariants.length)
                ]

                const distantPlanet = randomVariant.clone()

                const position = new THREE.Vector3((Math.random() - randomizerClamp) * range, (Math.random() - randomizerClamp) * range, (Math.random() - randomizerClamp) * range)

                distantPlanet.position.set(position.x, position.y, position.z)

                sceneRef.current.add(distantPlanet)
            }
            console.log("Generated fake planets successfully")
        } catch (err) {
            console.error(err)
        }

        //load and add SkyBox to scene
        try {
            /* const loader = new KTX2Loader(manager)
            loader.setTranscoderPath('/basis/')  // Transcoder-WASM wird gebraucht
            loader.detectSupport(rendererRef.current!)

            const texture = await loader.loadAsync("/hdrFiles/Skybox.ktx2")
            texture.mapping = THREE.EquirectangularReflectionMapping

            //sceneRef.current.background = texture
            //sceneRef.current.environment = texture

            stepProgress()
            console.log("Imported and added Skybox successfully") */
        } catch (err) {
            console.error(err)
        }
    }

    function createPlanet(p: any) {
        const geometry = new THREE.SphereGeometry(1.5, 64, 64)
        const isSun = p.id === "sun"

        const material = new THREE.MeshStandardMaterial({
            color: isSun ? "#ffb300" : 0xffffff,
            emissive: isSun ? "#ff7a00" : undefined,
            emissiveIntensity: isSun ? 2 : 0
        })

        const mesh = new THREE.Mesh(geometry, material)

        if (isSun) {

            const light = new THREE.PointLight("#ffb300", 80, 1200)
            mesh.add(light)

            const coreGlow = new THREE.Mesh(
                new THREE.SphereGeometry(1.9, 32, 32),
                new THREE.MeshBasicMaterial({
                    color: "#ff6600",
                    transparent: true,
                    opacity: 0.12,
                    side: THREE.BackSide
                })
            )
            mesh.add(coreGlow)

            const corona1 = new THREE.Mesh(
                new THREE.SphereGeometry(2.5, 64, 64),
                new THREE.MeshStandardMaterial({
                    color: "#ff6600",
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.BackSide,
                    blending: THREE.AdditiveBlending
                })
            )
            mesh.add(corona1)

            const corona2 = corona1.clone()
            corona2.scale.set(1.2, 1.2, 1.2)
            corona2.material = corona1.material.clone()
            corona2.material.opacity = 0.15
            mesh.add(corona2)
        }


        return mesh
    }


    useImperativeHandle(ref, () => ({
        focusPlanet
    }))

    return <div ref={containerRef} onMouseMove={(e) => handleMouseMove(e)} className={`fixed inset-0 z-0 overflow-hidden ${className}`} />
}
)

export default ThreeScene
