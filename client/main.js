import * as THREE from 'https://cdn.skypack.dev/three@0.126.0';
import { ARButton } from "https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js";

let scene, camera, renderer, controller;
let hitTestSource = null;
let hitTestSourceRequested = false;
let localSpace = null;
let reticle = null;
let placed = false;

const totalTargets = 15;
let touchedTargets = 0;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test']
  }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const ringGeo = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(ringGeo, ringMat);
  reticle.visible = false;
  scene.add(reticle);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  renderer.setAnimationLoop(render);
}

function createRandomTargets(center) {
  const maxDistance = 1;

  // Dirección del reticle
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(reticle.quaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(reticle.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < totalTargets; i++) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16), 
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    let spawnPosition;
    do {
      const xOffset = (Math.random() - 0.5) * 2 * maxDistance; 
      const yOffset = (Math.random() - 0.5) * 2 * maxDistance; 
      const zOffset = Math.random() * maxDistance; 

      spawnPosition = new THREE.Vector3().copy(center)
        .add(right.clone().multiplyScalar(xOffset))
        .add(up.clone().multiplyScalar(yOffset))
        .add(forward.clone().multiplyScalar(zOffset));

    } while (spawnPosition.distanceTo(center) > maxDistance); 
    sphere.position.copy(spawnPosition);
    sphere.userData.clickable = true;
    sphere.userData.touched = false;
    scene.add(sphere);
  }
}

function onSelect() {
  if (reticle.visible && !placed) {
    createRandomTargets(reticle.position);
    placed = true;
  } else {
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(scene.children);
    for (const intersect of intersects) {
      const obj = intersect.object;
      if (obj.userData.clickable && !obj.userData.touched) {
        obj.material.color.set(0x0000ff);
        obj.userData.touched = true;
        touchedTargets++;

        if (touchedTargets >= Math.ceil(totalTargets / 2)) {
          //TODO: Logica para acabar y cerrar conexion con el servidor
        }
        break;
      }
    }
  }
}

async function initHitTestSource() {
  const session = renderer.xr.getSession();
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  localSpace = await session.requestReferenceSpace('local');
  session.addEventListener('end', () => {
    hitTestSourceRequested = false;
    hitTestSource = null;
  });
  hitTestSourceRequested = true;
}

function render(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      initHitTestSource();
    }

    if (hitTestSource && localSpace) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0 && !placed) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(localSpace);
        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
          reticle.matrix.decompose(reticle.position, reticle.quaternion, reticle.scale);
        }
      } else if (!placed) {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
