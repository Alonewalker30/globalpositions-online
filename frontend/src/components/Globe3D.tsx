import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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

// Loads Earth texture directly via TextureLoader — no Suspense, graceful fallback
function EarthMesh({ onReset }: { onReset: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    const URLS = [
      'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg',
      'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
      'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-dark.jpg',
    ];
    let idx = 0;
    const tryNext = () => {
      if (idx >= URLS.length) return;
      loader.load(
        URLS[idx++],
        (tex) => {
          const mat = meshRef.current?.material as THREE.MeshStandardMaterial | undefined;
          if (mat) { mat.map = tex; mat.color.set('#ffffff'); mat.needsUpdate = true; }
        },
        undefined,
        () => tryNext(),
      );
    };
    tryNext();
  }, []);

  return (
    <mesh ref={meshRef} onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial color="#0d2c1a" roughness={0.8} metalness={0.05} />
    </mesh>
  );
}

function CityPin({
  hub, position, size, isSelected, isHovered,
  onSelect, onHover, onUnhover,
}: {
  hub: CityHub;
  position: THREE.Vector3;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onUnhover: () => void;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    t.current += delta * (isSelected ? 2.5 : 1.6);
    if (ringRef.current) {
      const scale = 1 + Math.sin(t.current) * (isSelected ? 0.6 : 0.35);
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (isSelected ? 0.85 : isHovered ? 0.65 : 0.42) - Math.sin(t.current) * 0.28;
    }
  });

  return (
    <group position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(); }}
        onPointerOut={(e) => { e.stopPropagation(); onUnhover(); }}
      >
        <sphereGeometry args={[size * (isSelected ? 1.9 : isHovered ? 1.5 : 1), 12, 12]} />
        <meshBasicMaterial color={isSelected ? '#F59E0B' : isHovered ? '#86efac' : '#4ade80'} />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[size * 2.8, 12, 12]} />
        <meshBasicMaterial color={isSelected ? '#FCD34D' : '#16a34a'} transparent opacity={0.4} />
      </mesh>
      {/* Label only on hover or selection — no overlap spam */}
      {(isSelected || isHovered) && (
        <Html center position={[0, size * 7, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            background: isSelected ? 'rgba(245,158,11,0.96)' : 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '4px 11px',
            borderRadius: '14px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif',
            border: `1px solid ${isSelected ? '#FCD34D88' : 'rgba(74,222,128,0.5)'}`,
            boxShadow: isSelected ? '0 0 16px rgba(245,158,11,0.5)' : '0 2px 8px rgba(0,0,0,0.5)',
            letterSpacing: '0.02em',
          }}>
            {isSelected ? '📍 ' : ''}{hub.name} · {hub.jobs}+ jobs
          </div>
        </Html>
      )}
    </group>
  );
}

function Arc({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const lineObj = useMemo(() => {
    const mid = from.clone().add(to).normalize().multiplyScalar(1.4);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const material = new THREE.LineBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.2 });
    return new THREE.Line(geometry, material);
  }, [from, to]);
  return <primitive object={lineObj} />;
}

function GlobeScene({
  selectedCity, hoveredCity,
  onCitySelect, onCityHover, onCityUnhover, onReset,
}: {
  selectedCity: string | null;
  hoveredCity: string | null;
  onCitySelect: (hub: CityHub) => void;
  onCityHover: (name: string) => void;
  onCityUnhover: () => void;
  onReset: () => void;
}) {
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
    <>
      <EarthMesh onReset={onReset} />
      <mesh>
        <sphereGeometry args={[1.003, 36, 18]} />
        <meshBasicMaterial color="#4ade80" wireframe transparent opacity={0.04} />
      </mesh>
      {arcs.map((a, i) => <Arc key={i} from={a.from} to={a.to} />)}
      {dotData.map((d, i) => (
        <CityPin
          key={i}
          hub={d}
          position={d.pos}
          size={d.size}
          isSelected={selectedCity === d.name}
          isHovered={hoveredCity === d.name}
          onSelect={() => onCitySelect(d)}
          onHover={() => onCityHover(d.name)}
          onUnhover={onCityUnhover}
        />
      ))}
    </>
  );
}

interface Globe3DProps {
  onCitySelect?: (hub: CityHub | null) => void;
}

export default function Globe3D({ onCitySelect }: Globe3DProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  // Pointer cursor when hovering a city pin
  useEffect(() => {
    document.body.style.cursor = hoveredCity ? 'pointer' : 'default';
    return () => { document.body.style.cursor = 'default'; };
  }, [hoveredCity]);

  const handleSelect = (hub: CityHub) => {
    setSelectedCity(hub.name);
    onCitySelect?.(hub);
  };

  const handleReset = () => {
    setSelectedCity(null);
    setHoveredCity(null);
    onCitySelect?.(null);
  };

  return (
    <Canvas camera={{ position: [0, 0, 2.8], fov: 42 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 1, 2]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-2, -1, -2]} intensity={0.2} color="#86efac" />
      <Stars radius={120} depth={60} count={3000} factor={3} saturation={0} fade speed={0.4} />
      <GlobeScene
        selectedCity={selectedCity}
        hoveredCity={hoveredCity}
        onCitySelect={handleSelect}
        onCityHover={(name) => setHoveredCity(name)}
        onCityUnhover={() => setHoveredCity(null)}
        onReset={handleReset}
      />
      {/* Full 360° drag + auto-rotate. Double-click globe to reset. */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!selectedCity}
        autoRotateSpeed={1.2}
        rotateSpeed={0.6}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </Canvas>
  );
}
