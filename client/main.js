import * as THREE from 'https://cdn.skypack.dev/three@0.126.0';
import { ARButton } from 'https://cdn.skypack.dev/three@0.126.0/examples/jsm/webxr/ARButton.js';

// Definir variables
let camera, scene, renderer, hitTestSource, localSpace;
let target;
let ws;

// Función para iniciar el AR
function initAR() {
  // Conectar WebSocket
  connectWebSocket();

  // Crear el contenedor del AR
  const container = document.createElement('div');
  document.body.appendChild(container);

  // Configuración de la escena 3D
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // Crear botón AR
  document.body.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"] // Habilitar hit-test
  }));

  // Función de inicialización de la escena
  initScene();

  // Animación
  renderer.setAnimationLoop(render);

  // Añadir evento para detectar redimensionamiento
  window.addEventListener("resize", onWindowResize, false);
}

// Conectar al servidor WebSocket
function connectWebSocket() {
  ws = new WebSocket('ws://localhost:8080');
  ws.onopen = () => {
    console.log("Conectado al servidor WebSocket");
  };
  ws.onmessage = (event) => {
    console.log("Mensaje recibido:", event.data);
  };
  ws.onclose = () => {
    console.log("Desconectado del servidor WebSocket");
  };
}

// Inicializar la escena con iluminación y objetivos
function initScene() {
  // Crear luz ambiental
  const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Crear un objeto objetivo (lo que se verá como el plano de prueba)
  const geometry = new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial();
  target = new THREE.Mesh(geometry, material);
  target.matrixAutoUpdate = false;
  target.visible = false;
  scene.add(target);
}

// Función para iniciar el hit-test
async function initializeHitTestSource() {
  const session = renderer.xr.getSession();
  const viewerSpace = await session.requestReferenceSpace("viewer");
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  localSpace = await session.requestReferenceSpace("local");

  session.addEventListener("end", () => {
    hitTestSource = null;
  });
}

// Función de renderizado
function render(timestamp, frame) {
  if (frame) {
    // Inicializar hit-test
    if (!hitTestSource) {
      initializeHitTestSource();
    }

    // Obtener resultados del hit-test
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(localSpace);
      target.visible = true;
      target.matrix.fromArray(pose.transform.matrix);
    } else {
      target.visible = false;
    }

    renderer.render(scene, camera);
  }
}

// Evento de redimensionamiento de la ventana
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Iniciar AR cuando se presione el botón
document.getElementById('startAR').addEventListener('click', initAR);

