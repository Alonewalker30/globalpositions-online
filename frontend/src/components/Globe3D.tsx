import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
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
      ? targetPos.clone().normalize().multiplyScalar(1.85)
      : defaultPos.current;
    camera.position.lerp(dest, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function PulsingDot({
  position,
  size,
  isSelected,
  hub,
  onSelect,
  onReset,
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
        <meshBasicMaterial color={isSelected ? '#F59E0B' : '#6366F1'} />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[size * 2.6, 10, 10]} />
        <meshBasicMaterial color={isSelected ? '#FCD34D' : '#8B5CF6'} transparent opacity={0.4} />
      </mesh>
      <Html center position={[0, size * 6, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: isSelected ? 'rgba(245,158,11,0.96)' : 'rgba(20,20,45,0.82)',
          color: '#fff',
          padding: '3px 9px',
          borderRadius: '14px',
          fontSize: '10px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, sans-serif',
          border: `1px solid ${isSelected ? '#FCD34D55' : 'rgba(99,102,241,0.35)'}`,
          opacity: isSelected ? 1 : 0.75,
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
    const mid = from.clone().add(to).normalize().multiplyScalar(1.35);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(40);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: '#6366F1', transparent: true, opacity: 0.22 });
    return new THREE.Line(geometry, material);
  }, [from, to]);
  return <primitive object={lineObj} />;
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
      groupRef.current.rotation.y += delta * 0.12;
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
      {/* Globe body — double-click anywhere on sphere to reset */}
      <mesh onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial color="#080818" emissive="#0D0D28" specular="#6366F1" shininess={40} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.002, 36, 18]} />
        <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.06} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.04, 32, 32]} />
        <meshBasicMaterial color="#4338CA" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
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
      <ambientLight intensity={0.2} />
      <directionalLight position={[4, 2, 4]}   intensity={1.2} color="#6366F1" />
      <directionalLight position={[-4, -2, -2]} intensity={0.4} color="#8B5CF6" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#06B6D4" distance={6} />
      <Stars radius={120} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
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
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
        rotateSpeed={0.4}
      />
    </Canvas>
  );
}
