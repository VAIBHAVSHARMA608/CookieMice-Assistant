import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

let scene, camera, renderer, clock;
let hamsterGroup;
let armRight, mouth, eyes;

init();
animate();

function init() {
  const container = document.getElementById('hamster-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0e68c); // Light yellow background like image

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create procedural hamster
  hamsterGroup = new THREE.Group();
  scene.add(hamsterGroup);

  // Body (orange sphere)
  const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0;
  hamsterGroup.add(body);

  // Head (smaller orange sphere)
  const headGeometry = new THREE.SphereGeometry(0.8, 32, 32);
  const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.2;
  hamsterGroup.add(head);

  // Ears (two small orange spheres)
  const earGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const leftEar = new THREE.Mesh(earGeometry, headMaterial);
  leftEar.position.set(-0.5, 1.8, 0);
  hamsterGroup.add(leftEar);
  const rightEar = new THREE.Mesh(earGeometry, headMaterial);
  rightEar.position.set(0.5, 1.8, 0);
  hamsterGroup.add(rightEar);

  // Eyes (two white spheres with black pupils)
  const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.3, 1.3, 0.7);
  hamsterGroup.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.3, 1.3, 0.7);
  hamsterGroup.add(rightEye);

  const pupilGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  leftPupil.position.set(-0.3, 1.3, 0.75);
  hamsterGroup.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  rightPupil.position.set(0.3, 1.3, 0.75);
  hamsterGroup.add(rightPupil);

  eyes = { left: leftEye, right: rightEye, leftPupil, rightPupil };

  // Mouth (simple curve for smile)
  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 0.9, 0.7),
    new THREE.Vector3(0, 0.8, 0.7),
    new THREE.Vector3(0.2, 0.9, 0.7)
  ]);
  const mouthGeometry = new THREE.TubeGeometry(mouthCurve, 20, 0.05, 8, true);
  const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0xff69b4 });
  mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  hamsterGroup.add(mouth);

  // Arms (cylinders)
  const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
  const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-1.2, 0.5, 0);
  leftArm.rotation.z = Math.PI / 4;
  hamsterGroup.add(leftArm);

  armRight = new THREE.Mesh(armGeometry, armMaterial);
  armRight.position.set(1.2, 0.5, 0);
  armRight.rotation.z = -Math.PI / 4;
  hamsterGroup.add(armRight);

  // Legs (cylinders)
  const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
  const legMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.5, -1.2, 0);
  hamsterGroup.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.5, -1.2, 0);
  hamsterGroup.add(rightLeg);

  // Chef Hat (cone on head)
  const hatGeometry = new THREE.ConeGeometry(0.6, 1.2, 8);
  const hatMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const hat = new THREE.Mesh(hatGeometry, hatMaterial);
  hat.position.y = 2.4;
  hamsterGroup.add(hat);

  // Initial idle rotation
  hamsterGroup.rotation.y = 0;

  clock = new THREE.Clock();

  // Handle resize
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  const container = document.getElementById('hamster-container');
  const aspect = container.clientWidth / container.clientHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Hand gesture: Wave with right arm
window.waveGesture = function() {
  if (armRight) {
    // Simple wave animation: rotate arm up and down
    const waveTween = { rotation: 0 };
    const targetRotation = Math.PI / 2;
    let direction = 1;
    const waveInterval = setInterval(() => {
      armRight.rotation.z = waveTween.rotation;
      waveTween.rotation += direction * 0.1;
      if (waveTween.rotation >= targetRotation || waveTween.rotation <= -Math.PI / 4) {
        direction *= -1;
      }
      if (direction < 0 && waveTween.rotation <= -Math.PI / 4) {
        clearInterval(waveInterval);
        armRight.rotation.z = -Math.PI / 4; // Reset to idle
      }
    }, 100);
  }
};

// Face expression: Smile and speak (scale mouth, blink eyes)
window.speak = function(text) {
  if (mouth && eyes) {
    // Smile: enlarge mouth
    const originalMouthScale = mouth.scale.y;
    mouth.scale.y = 1.5;
    // Blink: scale eyes down briefly
    const originalEyeScale = eyes.left.scale.y;
    eyes.left.scale.set(1, 0.2, 1);
    eyes.right.scale.set(1, 0.2, 1);
    setTimeout(() => {
      eyes.left.scale.set(1, originalEyeScale, 1);
      eyes.right.scale.set(1, originalEyeScale, 1);
      mouth.scale.y = originalMouthScale;
    }, 1000); // Reset after 1 second
  }
  // Optional: Use Web Speech API for actual speaking
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
};

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  // Gentle idle rotation
  if (hamsterGroup) {
    hamsterGroup.rotation.y += 0.005;
  }
  renderer.render(scene, camera);
}
