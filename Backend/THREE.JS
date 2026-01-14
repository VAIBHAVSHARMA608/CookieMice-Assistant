import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, mixer, clock;
let hamster; // the loaded model

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load('hamster_chef.gltf', (gltf) => {
    hamster = gltf.scene;
    scene.add(hamster);

    mixer = new THREE.AnimationMixer(hamster);
    // Suppose the glTF has animations named "Idle", "GestureWave", "Talk"
    const idle = mixer.clipAction(gltf.animations.find(a => a.name === 'Idle'));
    idle.play();
  });

  clock = new THREE.Clock();
}

// function to make him wave
function waveGesture() {
  const waveAnim = mixer.clipAction(/* find GestureWave clip */);
  waveAnim.reset().play();
}

// function to speak (simulate lip sync)
function speak(text) {
  // You’d use Web Speech API or fetch audio
  // Then schedule mouth animation / visemes
  const talkAnim = mixer.clipAction(/* Talk clip */);
  talkAnim.reset().play();
  // On finish, return to idle
  talkAnim.clampWhenFinished = true;
  talkAnim.loop = THREE.LoopOnce;
  talkAnim.onFinished = () => {
    mixer.clipAction(/* Idle */).play();
  };
}

// animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
}
