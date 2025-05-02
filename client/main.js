import * as THREE from 'https://cdn.skypack.dev/three@0.126.0';
import { ARButton } from "https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js";

let scene, camera, renderer, controller;
let totalTargets = 15;
let touchedTargets = 0;
let minigameActive = false;

document.getElementById('play-button').onclick = () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('config-screen').style.display = 'flex';
  showCustomARButton(); 
};

document.getElementById('instructions-button').onclick = () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('instructions-screen').style.display = 'flex';
};

document.getElementById('back-button').onclick = () => {
  document.getElementById('instructions-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
};

document.getElementById('config-back-button').onclick = () => {
  document.getElementById('config-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
};

const sphereRange = document.getElementById('sphere-count');
const display = document.getElementById('sphere-count-display');
sphereRange.oninput = () => {
  display.textContent = `${sphereRange.value} esferas`;
};

function showCustomARButton() {
  const container = document.getElementById('start-game-button');
  container.innerHTML = ''; 

  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['local-floor', 'dom-overlay'],
    domOverlay: { root: document.body }
  });


  arButton.style.position = 'static';
  arButton.style.display = 'block'; 

  Object.assign(arButton.style, {
    fontSize: '1rem',
    borderRadius: '10px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    border: 'none'
  });

  container.appendChild(arButton);

  
  renderer.xr.addEventListener('sessionstart', () => {
    totalTargets = parseInt(document.getElementById('sphere-count').value);
    document.getElementById('config-screen').style.display = 'none';
    document.body.appendChild(renderer.domElement);
    init(); 
  });
}


function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();


  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  renderer.setAnimationLoop(render);
}

function showWinScreen() {
  document.getElementById('win-screen').style.display = 'flex';
}

function createTargets(userPosition, userQuaternion) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(userQuaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(userQuaternion).normalize();

  const center = new THREE.Vector3().copy(userPosition).add(forward.clone().multiplyScalar(2)); 

  for (let i = 0; i < totalTargets; i++) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    // Posición aleatoria de las esferas
    const x = (Math.random() - 0.5) * 3.0; 
    const y = (Math.random() - 0.5) * 2.0; 
    const z = Math.random() * 2.0; 

    const position = new THREE.Vector3().copy(center)
      .add(right.clone().multiplyScalar(x))
      .add(new THREE.Vector3(0, y, 0))
      .add(forward.clone().multiplyScalar(z));

    sphere.position.copy(position);
    sphere.userData.clickable = true;
    sphere.userData.touched = false;
    scene.add(sphere);
  }
  updateProgressCounter();
}

function onSelect() {
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(scene.children);
  for (const intersect of intersects) {
    const obj = intersect.object;
    if (obj.userData.clickable && !obj.userData.touched) {
      showMinigame(() => {
        obj.material.color.set(0x0000ff);
        obj.userData.touched = true;
        touchedTargets++;
        
        updateProgressCounter();

        if (touchedTargets >= Math.ceil(totalTargets / 2)) {
          showWinScreen();
        }
      });
      break;
    }
  }
}

function render(timestamp, frame) {
  const refSpace = renderer.xr.getReferenceSpace();
  if (refSpace) {
    const viewerPose = frame.getViewerPose(refSpace);
    if (viewerPose && viewerPose.transform) {
      const pos = viewerPose.transform.position;
      const orient = viewerPose.transform.orientation;
      const userPos = new THREE.Vector3(pos.x, pos.y, pos.z);
      const userQuat = new THREE.Quaternion(orient.x, orient.y, orient.z, orient.w);
      if (scene.children.length <= 2) {
        createTargets(userPos, userQuat);
      }
    }
  }

  renderer.render(scene, camera);
}

function updateProgressCounter() {
  const counter = document.getElementById('progress-counter');
  const fill = document.getElementById('progress-fill');
  const wrapper = document.getElementById('progress-wrapper');

  counter.textContent = `${touchedTargets} / ${totalTargets} esferas`;
  const percent = (touchedTargets / totalTargets) * 100;
  fill.style.width = `${percent}%`;

  wrapper.style.display = 'flex'; 
}

function showMinigame(callback) {
  
  if (minigameActive) return; 

  minigameActive = true;
  
  const container = document.getElementById('minigame-container');
  container.innerHTML = '';
  container.style.display = 'flex';
  

  const minigames = [minigameTap, minigameCode, minigameMath, minigameHold, minigameFindButton, minigameTrivia,minigameSymbolMatch, minigameDontTouch   ];
  const game = minigames[Math.floor(Math.random() * minigames.length)];
  game(container, callback);
}

function closeMinigame() {
  const container = document.getElementById('minigame-container');
  container.style.display = 'none';
  minigameActive = false;
}

function addMinigameHeader(container) {
  const header = document.createElement('div');
  header.textContent = '¡Completa el minijuego!';
  header.style.fontSize = '24px';
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '20px';
  container.appendChild(header);
}

// 1. Toca 20 veces
function minigameTap(container, onComplete) {
  addMinigameHeader(container);
  let taps = 0;
  const counter = document.createElement('div');
  counter.textContent = `Toca la pantalla 20 veces`;
  container.appendChild(counter);
  container.addEventListener('click', tapHandler);
  function tapHandler() {
    taps++;
    counter.textContent = `Toca la pantalla ${20 - taps} veces`;
    if (taps >= 20) {
      container.removeEventListener('click', tapHandler);
      closeMinigame();
      onComplete();
    }
  }
}

// 2. Código de 8 caracteres
function minigameCode(container, onComplete) {
  addMinigameHeader(container);

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();

  const instruction = document.createElement('div');
  instruction.textContent = `Introduce este código: ${code}`;

  const input = document.createElement('input');
  input.style.fontSize = '20px';
  input.style.marginTop = '10px';
  input.maxLength = 8;

  const feedback = document.createElement('div');
  feedback.style.color = 'red';
  feedback.style.marginTop = '10px';

  const button = document.createElement('button');
  button.textContent = 'Verificar';
  button.onclick = () => {
    if (input.value.toUpperCase() === code) {
      closeMinigame();
      onComplete();
    } else {
      feedback.textContent = 'Código incorrecto, inténtalo de nuevo';
    }
  };

  container.append(instruction, input, button, feedback);
}

// 3. Suma simple
function minigameMath(container, onComplete) {
  addMinigameHeader(container);

  const a = Math.floor(Math.random() * 10);
  const b = Math.floor(Math.random() * 10);
  const result = a + b;

  const instruction = document.createElement('div');
  instruction.textContent = `¿Cuánto es ${a} + ${b}?`;

  const input = document.createElement('input');
  input.type = 'number';
  input.style.fontSize = '20px';
  input.style.marginTop = '10px';

  const feedback = document.createElement('div');
  feedback.style.color = 'red';
  feedback.style.marginTop = '10px';

  const button = document.createElement('button');
  button.textContent = 'Responder';
  button.onclick = () => {
    if (parseInt(input.value) === result) {
      closeMinigame();
      onComplete();
    } else {
      feedback.textContent = 'Incorrecto, intenta otra vez';
    }
  };

  container.append(instruction, input, button, feedback);
}

// 4. Mantener presionado
function minigameHold(container, onComplete) {
  addMinigameHeader(container);
  const prompt = document.createElement('div');
  prompt.textContent = 'Mantén presionado durante 3 segundos';
  const button = document.createElement('button');
  button.textContent = 'Presionar';
  let timer;
  button.onmousedown = button.ontouchstart = () => {
    timer = setTimeout(() => {
      closeMinigame();
      onComplete();
    }, 3000);
  };
  button.onmouseup = button.ontouchend = () => clearTimeout(timer);
  container.append(prompt, button);
}

// 5. Botón escurridizo
function minigameFindButton(container, onComplete) {
  addMinigameHeader(container);
  const prompt = document.createElement('div');
  prompt.textContent = 'Toca el botón';
  const button = document.createElement('button');
  button.textContent = '¡Atrápame!';
  button.style.position = 'absolute';
  button.style.top = '50%';
  button.style.left = '50%';
  button.onclick = () => {
    closeMinigame();
    onComplete();
  };
  function moveButton() {
    button.style.top = `${Math.random() * 80 + 10}%`;
    button.style.left = `${Math.random() * 80 + 10}%`;
  }
  setInterval(moveButton, 1000);
  container.append(prompt, button);
}

function minigameTrivia(container, onComplete) {
  addMinigameHeader(container);

  const questions = [
    { q: "¿Cuál es la capital de Francia?", a: "paris" },
    { q: "¿Cuántos planetas hay en el sistema solar?", a: "8" },
    { q: "¿Quién pintó la Mona Lisa?", a: "da vinci" },
    { q: "¿Cuál es el río más largo del mundo?", a: "amazonas" },
    { q: "¿En qué continente está Egipto?", a: "africa" },
    { q: "¿Cuántos lados tiene un triángulo?", a: "3" },
    { q: "¿Cuál es el océano más grande?", a: "pacifico" },
    { q: "¿Quién escribió 'Don Quijote'?", a: "cervantes" },
    { q: "¿Qué gas respiramos para vivir?", a: "oxigeno" },
    { q: "¿Cuál es el planeta rojo?", a: "marte" },
    { q: "¿Cuántos días tiene un año?", a: "365" },
  ];

  const item = questions[Math.floor(Math.random() * questions.length)];
  const question = document.createElement('div');
  question.textContent = item.q;

  const input = document.createElement('input');
  input.style.marginTop = '10px';

  const button = document.createElement('button');
  button.textContent = "Responder";
  button.onclick = () => {
    if (input.value.toLowerCase().trim() === item.a) {
      closeMinigame();
      onComplete();
    } else {
      question.textContent = "Incorrecto. Intenta otra vez: " + item.q;
    }
  };

  container.append(question, input, button);
}


function minigameSymbolMatch(container, onComplete) {
  addMinigameHeader(container);

  const symbols = ['★', '☀', '⚡', '☂', '❄', '♠', '♣', '♥', '♦'];
  const target = symbols[Math.floor(Math.random() * symbols.length)];

  const instruction = document.createElement('div');
  instruction.textContent = `Toca el símbolo: ${target}`;

  const feedback = document.createElement('div');
  feedback.style.color = 'red';
  feedback.style.marginTop = '10px';

  const buttonGrid = document.createElement('div');
  buttonGrid.style.display = 'grid';
  buttonGrid.style.gridTemplateColumns = 'repeat(3, auto)';
  buttonGrid.style.gap = '10px';

  const shuffled = [...symbols].sort(() => Math.random() - 0.5);

  shuffled.forEach(sym => {
    const btn = document.createElement('button');
    btn.textContent = sym;
    btn.onclick = () => {
      if (sym === target) {
        closeMinigame();
        onComplete();
      } else {
        feedback.textContent = '¡Incorrecto! Inténtalo de nuevo.';
      }
    };
    buttonGrid.appendChild(btn);
  });

  container.append(instruction, buttonGrid, feedback);
}

function minigameDontTouch(container, onComplete) {
  addMinigameHeader(container);

  const prompt = document.createElement('div');
  prompt.textContent = "No toques el botón durante 5 segundos...";

  const button = document.createElement('button');
  button.textContent = "¡NO ME TOQUES!";
  button.style.fontSize = "24px";
  button.style.padding = "20px 40px";
  button.style.marginTop = "20px";

  let touched = false;
  let timer;

  const fail = () => {
    touched = true;
    prompt.textContent = "¡Fallaste! Tocaste el botón. Reiniciando...";
    button.disabled = true;
    clearTimeout(timer);
    setTimeout(() => {
      container.innerHTML = '';
      minigameDontTouch(container, onComplete);
    }, 2000);
  };

  button.onclick = fail;

  timer = setTimeout(() => {
    if (!touched) {
      closeMinigame();
      onComplete();
    }
  }, 5000);

  container.append(prompt, button);
}