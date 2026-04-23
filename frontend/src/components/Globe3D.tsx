import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const TECH_HUBS = [
  { name: 'San Francisco', lat: 37.77,  lng: -122.42, jobs: 35 },
  { name: 'New York',      lat: 40.71,  lng: -74.01,  jobs: 14 },
  { name: 'Seattle',       lat: 47.61,  lng: -122.33, jobs: 6  },
  { name: 'Austin',        lat: 30.27,  lng: -97.74,  jobs: 5  },
  { name: 'Boston',        lat: 42.36,  lng: -71.06,  jobs: 4  },
  { name: 'Chicago',       lat: 41.88,  lng: -87.63,  jobs: 4  },
  { name: 'Los Angeles',   lat: 34.05,  lng: -118.24, jobs: 3  },
  { name: 'London',        lat: 51.51,  lng: -0.13,   jobs: 6  },
  { name: 'Berlin',        lat: 52.52,  lng: 13.41,   jobs: 3  },
  { name: 'Toronto',       lat: 43.65,  lng: -79.38,  jobs: 3  },
  { name: 'Singapore',     lat: 1.35,   lng: 103.82,  jobs: 2  },
  { name: 'Sydney',        lat: -33.87, lng: 151.21,  jobs: 2  },
  { name: 'Tokyo',         lat: 35.68,  lng: 139.69,  jobs: 2  },
  { name: 'Amsterdam',     lat: 52.37,  lng: 4.90,    jobs: 2  },
  { name: 'Dublin',        lat: 53.33,  lng: -6.25,   jobs: 3  },
];

function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function PulsingDot({ position, size }: { position: THREE.Vector3; size: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    t.current += delta * 1.8;
    const scale = 1 + Math.sin(t.current) * 0.4;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 - Math.sin(t.current) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Core dot */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 10, 10]} />
        <meshBasicMaterial color="#6366F1" />
      </mesh>
      {/* Pulsing ring */}
      <mesh ref={ringRef}>
        <sphereGeometry args={[size * 2.2, 10, 10]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Arc({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const lineObj = useMemo(() => {
    const mid = from.clone().add(to).normalize().multiplyScalar(1.35);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(40);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: '#6366F1', transparent: true, opacity: 0.25 });
    return new THREE.Line(geometry, material);
  }, [from, to]);

  return <primitive object={lineObj} />;
}

function GlobeMesh() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.12;
  });

  const dotData = useMemo(() =>
    TECH_HUBS.map(h => ({
      ...h,
      pos: latLngToVec3(h.lat, h.lng, 1.015),
      size: 0.012 + (h.jobs / 35) * 0.018,
    })), []);

  const arcs = useMemo(() => {
    const sfPos = dotData[0].pos;
    return dotData.slice(1, 7).map(d => ({ from: sfPos, to: d.pos }));
  }, [dotData]);

  return (
    <group ref={groupRef}>
      {/* Globe body */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          color="#080818"
          emissive="#0D0D28"
          specular="#6366F1"
          shininess={40}
        />
      </mesh>

      {/* Lat/lng grid */}
      <mesh>
        <sphereGeometry args={[1.002, 36, 18]} />
        <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.06} />
      </mesh>

      {/* Glow rim */}
      <mesh>
        <sphereGeometry args={[1.04, 32, 32]} />
        <meshBasicMaterial color="#4338CA" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* City dots */}
      {dotData.map((d, i) => <PulsingDot key={i} position={d.pos} size={d.size} />)}

      {/* Connection arcs */}
      {arcs.map((a, i) => <Arc key={i} from={a.from} to={a.to} />)}
    </group>
  );
}

export default function Globe3D() {
  return (
    <Canvas camera={{ position: [0, 0, 2.8], fov: 42 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[4, 2, 4]}  intensity={1.2} color="#6366F1" />
      <directionalLight position={[-4, -2, -2]} intensity={0.4} color="#8B5CF6" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#06B6D4" distance={6} />
      <Stars radius={120} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
      <GlobeMesh />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
        rotateSpeed={0.4}
      />
    </Canvas>
  );
}
