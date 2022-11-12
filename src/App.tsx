import { Physics, useCylinder } from "@react-three/cannon";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AsciiEffect } from "three-stdlib";
import Heightfield, { generateHeightmap } from "./Terrain";

const scale = 120;
const thrust = 0.3;
const turn = 0.02;
const impactVelocityThreshold = 5;

function useKeyPress(targetKey) {
  // State for keeping track of whether key is pressed
  const [keyPressed, setKeyPressed] = useState<boolean>(false);
  // If pressed key is our target key then set to true
  function downHandler({ key }) {
    if (key === targetKey) {
      setKeyPressed(true);
    }
  }
  // If released key is our target key then set to false
  const upHandler = ({ key }) => {
    if (key === targetKey) {
      setKeyPressed(false);
    }
  };
  // Add event listeners
  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []); // Empty array ensures that effect is only run on mount and unmount
  return keyPressed;
}

function Ship(props) {
  const {isAlive, ...physicsProps} = props;
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    position: [0, 5, 0],
    ...physicsProps,
  }));
  const camera = useThree((state) => state.camera);
  const isThrust = useKeyPress(" ");
  const forward = useKeyPress("w");
  const backward = useKeyPress("s");
  const left = useKeyPress("a");
  const right = useKeyPress("d");
  /** Player state */
  const state = useRef({
    pos: [0, 0, 0],
    vel: [0, 0, 0],
    rot: [0, 0, 0],
  });
  useEffect(() => {
    api.position.subscribe((p) => (state.current.pos = p));
    api.velocity.subscribe((v) => (state.current.vel = v));
    api.rotation.subscribe((r) => (state.current.rot = r));
  }, [api]);
  useFrame(() => {
    api.rotation.set(
      state.current.rot[0] + (backward ? turn : 0) - (forward ? turn : 0),
      state.current.rot[1],
      state.current.rot[2] + (left ? turn : 0) - (right ? turn : 0)
    );
    isThrust && api.applyLocalImpulse([0, thrust, 0], [0, -1, 0]);

    camera.lookAt(
      state.current.pos[0],
      state.current.pos[1],
      state.current.pos[2]
    );
  });

  api.collisionResponse;

  return (
    <mesh ref={ref} receiveShadow castShadow>
      <cylinderGeometry />
      <pointLight
        ref={ref}
        intensity={isThrust ? 1 : 0}
        position={[0, -0.5, 0]}
        color="orange"
        distance={20}
        castShadow
      />
      <meshStandardMaterial color="orange" />
      {!isAlive && <meshStandardMaterial color="red" />}
    </mesh>
  );
}
const heights = generateHeightmap({
  height: 128,
  number: 50,
  scale: 10,
  width: 128,
});
export default () => {
  const [isAlive, setIsAlive] = useState<boolean>(true);
  return (
    <Canvas shadows gl={{ alpha: false }}>
      <OrbitControls makeDefault />

      <hemisphereLight intensity={0.35} />
      <spotLight position={[0, 100, 0]} angle={0.3} penumbra={1} castShadow />
      <Physics>
        <Heightfield
          elementSize={(scale * 1) / 128}
          heights={heights}
          onCollide={(e) => {
            const isHighVelocity =
              e.contact.impactVelocity > impactVelocityThreshold && isAlive;
            console.log(
              "Collision event",
              e.contact.impactVelocity,
              isHighVelocity
            );
            isHighVelocity && setIsAlive(false);
          }}
          position={[-scale / 2, -20, scale / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <Ship position={[0, 0, 0]} isAlive={isAlive} />
        {/* <AsciiRenderer invert /> */}
      </Physics>
    </Canvas>
  );
};

function AsciiRenderer({
  renderIndex = 1,
  characters = " .:-+*=%@##",
  ...options
}) {
  // Reactive state
  const { size, gl, scene, camera } = useThree();

  // Create effect
  const effect = useMemo(() => {
    const effect = new AsciiEffect(gl, characters, options);
    effect.domElement.style.position = "absolute";
    effect.domElement.style.top = "0px";
    effect.domElement.style.left = "0px";
    effect.domElement.style.color = "white";
    effect.domElement.style.backgroundColor = "black";
    effect.domElement.style.pointerEvents = "none";
    return effect;
  }, [characters, options.invert]);

  // Append on mount, remove on unmount
  useEffect(() => {
    gl.domElement.parentNode.appendChild(effect.domElement);
    return () => gl.domElement.parentNode.removeChild(effect.domElement);
  }, [effect]);

  // Set size
  useEffect(() => {
    effect.setSize(size.width, size.height);
  }, [effect, size]);

  // Take over render-loop (that is what the index is for)
  useFrame((state) => {
    effect.render(scene, camera);
  }, renderIndex);

  // This component returns nothing, it has no view, it is a purely logical
}
