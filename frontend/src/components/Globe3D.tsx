import { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';

export interface CityHub {
  name: string;
  lat: number;
  lng: number;
  jobs: number;
}

export const GLOBE_CITIES: CityHub[] = [
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

function CameraController({ targetPos }: { targetPos: THREE.Vector3 | null }) {
  const { camera } = useThree();
  const defaultPos = useRef(new THREE.Vector3(0, 0, 2.8));

  useFrame(() => {
    const dest = targetPos
      ? targetPos.clone().normalize().multiplyScalar(2.0)
      : defaultPos.current;
    camera.position.lerp(dest, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function PulsingDot({
  position, size, isSelected, hub, onSelect, onReset,
}: {
  position: THREE.Vector3;
  size: number;
  isSelected: boolean;
  hub: CityHub;
  onSelect: () => void;
  onReset: () => void;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    t.current += delta * (isSelected ? 3 : 1.8);
    if (ringRef.current) {
      const scale = 1 + Math.sin(t.current) * (isSelected ? 0.7 : 0.4);
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (isSelected ? 0.85 : 0.5) - Math.sin(t.current) * 0.35;
    }
  });

  return (
    <group position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}
      >
        <sphereGeometry args={[size * (isSelected ? 1.9 : 1), 10, 10]} />
        <meshBasicMaterial color={isSelected ? '#F59E0B' : '#4ade80'} />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[size * 2.6, 10, 10]} />
        <meshBasicMaterial color={isSelected ? '#FCD34D' : '#16a34a'} transparent opacity={0.4} />
      </mesh>
      <Html center position={[0, size * 6, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: isSelected ? 'rgba(245,158,11,0.96)' : 'rgba(0,0,0,0.72)',
          color: '#fff',
          padding: '3px 9px',
          borderRadius: '14px',
          fontSize: '10px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, sans-serif',
          border: `1px solid ${isSelected ? '#FCD34D55' : 'rgba(74,222,128,0.4)'}`,
          opacity: isSelected ? 1 : 0.82,
          boxShadow: isSelected ? '0 0 16px rgba(245,158,11,0.6)' : 'none',
          transition: 'all 0.3s',
          letterSpacing: '0.02em',
        }}>
          {isSelected ? '📍 ' : ''}{hub.name} · {hub.jobs}+ jobs
        </div>
      </Html>
    </group>
  );
}

function Arc({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const lineObj = useMemo(() => {
    const mid = from.clone().add(to).normalize().multiplyScalar(1.4);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(40);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.3 });
    return new THREE.Line(geometry, material);
  }, [from, to]);
  return <primitive object={lineObj} />;
}

// Real Earth texture sphere — suspends while texture loads
function EarthSphere({ onReset }: { onReset: () => void }) {
  // Free NASA-based Earth texture via unpkg CDN (no cost, no API key)
  const texture = useTexture('https://unpkg.com/three-globe/example/img/earth-dark.jpg');
  return (
    <mesh onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

// Fallback shown while texture downloads
function EarthFallback({ onReset }: { onReset: () => void }) {
  return (
    <mesh onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial color="#0b2416" emissive="#0a1f12" specular="#16a34a" shininess={30} />
    </mesh>
  );
}

function GlobeMesh({
  selectedCity,
  onCitySelect,
  onReset,
}: {
  selectedCity: string | null;
  onCitySelect: (hub: CityHub) => void;
  onReset: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !selectedCity) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  const dotData = useMemo(() =>
    GLOBE_CITIES.map(h => ({
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
      {/* Real world map texture — falls back to dark sphere while loading */}
      <Suspense fallback={<EarthFallback onReset={onReset} />}>
        <EarthSphere onReset={onReset} />
      </Suspense>

      {/* Subtle green wireframe grid overlay */}
      <mesh>
        <sphereGeometry args={[1.003, 36, 18]} />
        <meshBasicMaterial color="#4ade80" wireframe transparent opacity={0.04} />
      </mesh>

      {/* City pins */}
      {dotData.map((d, i) => (
        <PulsingDot
          key={i}
          position={d.pos}
          size={d.size}
          isSelected={selectedCity === d.name}
          hub={d}
          onSelect={() => onCitySelect(d)}
          onReset={onReset}
        />
      ))}

      {/* Connection arcs from SF to major hubs */}
      {arcs.map((a, i) => <Arc key={i} from={a.from} to={a.to} />)}
    </group>
  );
}

interface Globe3DProps {
  onCitySelect?: (hub: CityHub | null) => void;
}

export default function Globe3D({ onCitySelect }: Globe3DProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const selectedCityPos = useMemo(() => {
    if (!selectedCity) return null;
    const hub = GLOBE_CITIES.find(h => h.name === selectedCity);
    return hub ? latLngToVec3(hub.lat, hub.lng, 1.015) : null;
  }, [selectedCity]);

  const handleSelect = (hub: CityHub) => {
    setSelectedCity(hub.name);
    onCitySelect?.(hub);
  };

  const handleReset = () => {
    setSelectedCity(null);
    onCitySelect?.(null);
  };

  return (
    <Canvas camera={{ position: [0, 0, 2.8], fov: 42 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]}   intensity={1.0} color="#ffffff" />
      <directionalLight position={[-3, -2, -2]} intensity={0.3} color="#86efac" />
      <Stars radius={120} depth={60} count={3000} factor={3} saturation={0} fade speed={0.4} />
      <CameraController targetPos={selectedCityPos} />
      <GlobeMesh
        selectedCity={selectedCity}
        onCitySelect={handleSelect}
        onReset={handleReset}
      />
      <OrbitControls
        enabled={!selectedCity}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={(4 * Math.PI) / 5}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}
