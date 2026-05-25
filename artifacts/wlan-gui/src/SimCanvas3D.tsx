import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { SimResults, SimConfig } from "./simulation";

const FLOOR_GAP = 8;

const DENSITY_COLOR: Record<string, string> = {
  LOW: "#4ade80",
  MEDIUM: "#fb923c",
  HIGH: "#f87171",
};

interface Props {
  results: SimResults;
  config: SimConfig;
  highlightedAp: string | null;
  onApHover: (key: string | null) => void;
}

function FloorPlane({
  floor,
  config,
  results,
}: {
  floor: number;
  config: SimConfig;
  results: SimResults;
}) {
  const { gridWidth, gridHeight } = config;
  const y = floor * FLOOR_GAP;

  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, size, size);

    const floorUsers = results.users3D.filter((u) => u[2] === floor);
    for (const u of floorUsers) {
      const px = (u[0] / gridWidth) * size;
      const py = (1 - u[1] / gridHeight) * size;
      const r = size * 0.06;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, "rgba(220,38,38,0.55)");
      g.addColorStop(1, "rgba(220,38,38,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [results, floor, gridWidth, gridHeight]);

  return (
    <group position={[gridWidth / 2, y, gridHeight / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[gridWidth, gridHeight]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(gridWidth, 0.02, gridHeight)]}
        />
        <lineBasicMaterial color="#1e3a5f" />
      </lineSegments>
      <Text
        position={[-gridWidth / 2 - 1.2, 0.4, 0]}
        fontSize={0.9}
        color="#475569"
        anchorX="right"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {`Floor ${floor + 1}`}
      </Text>
    </group>
  );
}

function APMarker({
  ap,
  results,
  config,
  highlighted,
  onHover,
}: {
  ap: [number, number, number];
  results: SimResults;
  config: SimConfig;
  highlighted: boolean;
  onHover: (key: string | null) => void;
}) {
  const key = `${ap[0]},${ap[1]},${ap[2]}`;
  const isCongested = results.congestion3D.get(key) ?? false;
  const cls = results.densityClass3D.get(key) ?? "LOW";
  const count = results.userCounts3D.get(key) ?? 0;
  const y = ap[2] * FLOOR_GAP + 0.6;
  const boxRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (boxRef.current) {
      boxRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    }
  });

  const color = isCongested ? "#ef4444" : highlighted ? "#60a5fa" : "#f8fafc";
  const glowColor = isCongested ? "#ef4444" : DENSITY_COLOR[cls];

  return (
    <group position={[ap[0], y, ap[1]]}>
      <mesh>
        <sphereGeometry args={[config.signalRadius, 20, 20]} />
        <meshStandardMaterial
          color={isCongested ? "#ef4444" : "#3b82f6"}
          transparent
          opacity={highlighted ? 0.1 : 0.04}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[config.signalRadius, 14, 14]} />
        <meshBasicMaterial
          color={isCongested ? "#ef4444" : "#3b82f6"}
          transparent
          opacity={highlighted ? 0.22 : 0.08}
          wireframe
        />
      </mesh>
      <mesh
        ref={boxRef}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover(key);
        }}
        onPointerLeave={() => onHover(null)}
      >
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial
          color={color}
          emissive={glowColor}
          emissiveIntensity={highlighted ? 1.2 : 0.5}
        />
      </mesh>
      <Text
        position={[0.5, 0.55, 0]}
        fontSize={0.55}
        color={isCongested ? "#fca5a5" : "#bfdbfe"}
        anchorX="left"
      >
        {count > 0 ? String(count) : ""}
      </Text>
    </group>
  );
}

function UserDots({ floor, results }: { floor: number; results: SimResults }) {
  const floorUsers = useMemo(
    () => results.users3D.filter((u) => u[2] === floor),
    [results, floor]
  );
  const y = floor * FLOOR_GAP + 0.18;

  return (
    <>
      {floorUsers.map((u, i) => (
        <mesh key={i} position={[u[0], y, u[1]]}>
          <sphereGeometry args={[0.13, 6, 6]} />
          <meshStandardMaterial color="#93c5fd" />
        </mesh>
      ))}
    </>
  );
}

function FloorConnectors({
  numFloors,
  gridWidth,
  gridHeight,
}: {
  numFloors: number;
  gridWidth: number;
  gridHeight: number;
}) {
  if (numFloors <= 1) return null;
  const corners: [number, number][] = [
    [0.3, 0.3],
    [gridWidth - 0.3, 0.3],
    [0.3, gridHeight - 0.3],
    [gridWidth - 0.3, gridHeight - 0.3],
  ];
  const totalH = (numFloors - 1) * FLOOR_GAP;
  return (
    <>
      {corners.map(([cx, cz], i) => (
        <mesh key={i} position={[cx, totalH / 2, cz]}>
          <cylinderGeometry args={[0.06, 0.06, totalH, 6]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
      ))}
    </>
  );
}

function CameraSetup({ config }: { config: SimConfig }) {
  const { camera } = useThree();
  useMemo(() => {
    const cx = config.gridWidth / 2;
    const cz = config.gridHeight / 2;
    const cy = (config.numFloors - 1) * FLOOR_GAP * 0.5;
    const dist = Math.max(config.gridWidth, config.gridHeight) * 1.6;
    camera.position.set(cx + dist, cy + dist * 0.8, cz + dist);
    camera.lookAt(cx, cy, cz);
  }, [config.numFloors, config.gridWidth, config.gridHeight]);
  return null;
}

function Scene({ results, config, highlightedAp, onApHover }: Props) {
  const floors = Array.from({ length: config.numFloors }, (_, i) => i);
  const cx = config.gridWidth / 2;
  const cy = ((config.numFloors - 1) * FLOOR_GAP) / 2;
  const cz = config.gridHeight / 2;

  return (
    <>
      <CameraSetup config={config} />
      <ambientLight intensity={0.55} />
      <pointLight
        position={[config.gridWidth, config.numFloors * FLOOR_GAP + 6, config.gridHeight]}
        intensity={1.2}
      />
      <OrbitControls
        target={[cx, cy, cz]}
        enableDamping
        dampingFactor={0.08}
      />
      <FloorConnectors
        numFloors={config.numFloors}
        gridWidth={config.gridWidth}
        gridHeight={config.gridHeight}
      />
      {floors.map((floor) => (
        <group key={floor}>
          <FloorPlane floor={floor} config={config} results={results} />
          <UserDots floor={floor} results={results} />
          {results.apNodes3D
            .filter((ap) => ap[2] === floor)
            .map((ap) => (
              <APMarker
                key={`${ap[0]},${ap[1]},${ap[2]}`}
                ap={ap}
                results={results}
                config={config}
                highlighted={highlightedAp === `${ap[0]},${ap[1]},${ap[2]}`}
                onHover={onApHover}
              />
            ))}
        </group>
      ))}
    </>
  );
}

export default function SimCanvas3D(props: Props) {
  return (
    <div className="w-full h-full">
      <Canvas
        gl={{ antialias: true }}
        style={{ background: "#0a0f1c" }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 text-[11px] flex flex-col gap-1.5 pointer-events-none">
        <div className="text-slate-400 font-semibold mb-1">3D View</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-slate-200 inline-block" />
          <span className="text-slate-300">Access Point</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="text-slate-300">Congested AP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-300/80 inline-block" />
          <span className="text-slate-300">User</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border border-dashed border-blue-400 inline-block" />
          <span className="text-slate-300">Coverage sphere</span>
        </div>
        <div className="text-slate-600 text-[10px] mt-1">Drag to rotate · Scroll to zoom</div>
      </div>
    </div>
  );
}
