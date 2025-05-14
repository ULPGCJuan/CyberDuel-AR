import * as THREE from 'https://cdn.skypack.dev/three@0.126.0';
import { ARButton } from "https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js";

let scene, camera, renderer, controller;
let totalTargets = 15;
let touchedTargets = 0;
let minigameActive = false;
let socket;
let isHost = false;
let userPosition, userQuaternion;
let arSessionStarted = false;



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

// Conexión WebSocket
function connectWebSocket() {
  socket = new WebSocket('wss://localhost:8080'); // Cambia esto a la IP de tu equipo

  socket.onopen = () => console.log('Conectado al WebSocket');

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'role') {
      isHost = msg.role === 'host';
      socket.role = msg.role; 
      console.log('Rol asignado:', msg.role);
    }

    if (msg.type === 'connected-users') {
      const numUsers = msg.count;
      const status = document.getElementById('waiting-status');
      status.textContent = `Jugadores conectados: ${numUsers}/3`;

      if (isHost) {
        const startBtn = document.getElementById('start-match-button');
        startBtn.style.display = numUsers >= 1 ? 'inline-block' : 'none';
        startBtn.onclick = () => {
          socket.send(JSON.stringify({ type: 'start' }));
          startBtn.style.display = 'none';
        };
      }
    }

    if (msg.type === 'start' && isHost) {
      // El host genera las esferas
      const positions = generateSpherePositions(userPosition, userQuaternion);
      socket.send(JSON.stringify({ type: 'positions', data: positions }));
      createTargets(positions);
      document.getElementById('waiting-overlay').style.display = 'none';
    }

    if (msg.type === 'positions' && !isHost) {
      // El cliente recibe las posiciones
      createTargets(msg.data);
      document.getElementById('waiting-overlay').style.display = 'none';
    }

    if (msg.type === 'game-over') {
      const winner = msg.winner;
      let displayName;

      if ((isHost && winner === 'host') || (!isHost && winner === socket.role)) {
        displayName = 'Tú';
      } else {
        if (winner === 'host') displayName = 'Jugador 1 (Anfitrión)';
        else if (winner === 'client2') displayName = 'Jugador 2 (Invitado)';
        else if (winner === 'client3') displayName = 'Jugador 3 (Invitado)';
        else displayName = 'Otro jugador';
      }

      showWinMessage(displayName);
    }

  };
}


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
    arSessionStarted = true;
    connectWebSocket();
    totalTargets = parseInt(document.getElementById('sphere-count').value);
    document.getElementById('config-screen').style.display = 'none';
    document.body.appendChild(renderer.domElement);
    init(); 

    document.getElementById('waiting-overlay').style.display = 'flex';
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

function showWinMessage(winnerName) {
  const winScreen = document.getElementById('win-screen');
  const winMessage = document.getElementById('win-message');
  
  winMessage.innerHTML = `
    <h2>🎉 ¡Partida terminada!</h2>
    <p>Ganador: <strong>${winnerName}</strong></p>
    <p>Gracias por jugar a CyberDuel AR</p>
  `;
  
  winScreen.style.display = 'flex';
}

function generateSpherePositions(userPosition, userQuaternion) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(userQuaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(userQuaternion).normalize();
  const center = new THREE.Vector3().copy(userPosition).add(forward.clone().multiplyScalar(2));

  const positions = [];

  for (let i = 0; i < totalTargets; i++) {
    const x = (Math.random() - 0.5) * 3.0; 
    const y = (Math.random() - 0.5) * 2.0; 
    const z = Math.random() * 2.0; 

    const pos = new THREE.Vector3().copy(center)
      .add(right.clone().multiplyScalar(x))
      .add(new THREE.Vector3(0, y, 0))
      .add(forward.clone().multiplyScalar(z));

    positions.push({ x: pos.x, y: pos.y, z: pos.z });
  }

  return positions;
}

function createTargets(positions) {
  positions.forEach(pos => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    sphere.position.set(pos.x, pos.y, pos.z);
    sphere.userData.clickable = true;
    sphere.userData.touched = false;
    scene.add(sphere);
  });

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

        if (touchedTargets == totalTargets) {
          const winnerRole = isHost ? 'host' : (socket.role || 'client');
          socket.send(JSON.stringify({ type: 'game-over', winner: winnerRole }));
          showWinMessage('Tú');
        }
      });
      break;
    }
  }
}

function render(timestamp, frame) {
  const refSpace = renderer.xr.getReferenceSpace();
  if (refSpace && frame) {
    const viewerPose = frame.getViewerPose(refSpace);
    if (viewerPose && viewerPose.transform) {
      const pos = viewerPose.transform.position;
      const orient = viewerPose.transform.orientation;

      userPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
      userQuaternion = new THREE.Quaternion(orient.x, orient.y, orient.z, orient.w);
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

  const a = Math.floor(Math.random() * 100);
  const b = Math.floor(Math.random() * 100);
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
    { q: "¿Cuál es la capital de Japón?", a: "tokio" },
    { q: "¿Cuántos planetas hay en el sistema solar?", a: "8" },
    { q: "¿Quién pintó la Mona Lisa?", a: "da vinci" },
    { q: "¿Cuál es el río más largo del mundo?", a: "amazonas" },
    { q: "¿En qué continente está Egipto?", a: "africa" },
    { q: "¿Cuántos lados tiene un triángulo?", a: "3" },
    { q: "¿Cuál es el océano más grande?", a: "pacifico" },
    { q: "¿Quién escribió 'El Quijote'?", a: "cervantes" },
    { q: "¿Qué gas respiramos para vivir?", a: "oxigeno" },
    { q: "¿Cuál es el planeta rojo?", a: "marte" },
    { q: "¿Cuántos días tiene un año?", a: "365" },
    { q: "¿Cuál es el animal más grande del mundo?", a: "ballena" },
    { q: "¿Qué país tiene forma de bota?", a: "italia" },
    { q: "¿Qué animal es conocido como el rey de la selva?", a: "león" },
    { q: "¿Cuál es el país más poblado del mundo?", a: "china" }
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