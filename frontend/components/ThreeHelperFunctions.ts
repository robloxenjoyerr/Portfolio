import * as THREE from "three"


export function createPlanet(p: any) {
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