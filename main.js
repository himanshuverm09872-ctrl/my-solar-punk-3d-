import * as THREE from "three";
import { PlayerController } from "./PlayerController.js";
import { InteractionSystem } from "./InteractionSystem.js";
import { EnergyObject, EnergyObjectType } from "./EnergyObject.js";
import { TaskSystem } from "./TaskSystem.js";
import { PollutionSystem } from "./PollutionSystem.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4e6688);
scene.fog = new THREE.Fog(0x4e6688, 36, 120);

const WORLD_SIZE = 120;

// A few plain arrays are enough for this prototype. No engine architecture,
// just little moving pieces that make Aeris feel alive.
const minimapCanvas = document.querySelector("#minimap");
const minimapContext = minimapCanvas.getContext("2d");
const minimapMarkers = [];
const pollutionClouds = [];
const pollutionParticles = [];
const glowMotes = [];
const riverHighlights = [];
const birds = [];

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const sunLight = new THREE.DirectionalLight(0xffb36b, 0.85);
sunLight.position.set(-9, 8, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 110;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
scene.add(sunLight);

const softSkyLight = new THREE.HemisphereLight(0x7aa2d8, 0x3c5f3a, 0.55);
scene.add(softSkyLight);

const villageGlow = new THREE.PointLight(0xffc46b, 1.2, 26);
villageGlow.position.set(-18, 5, -14);
scene.add(villageGlow);

function createGrassMaterial() {
  // Hand-made canvas texture: cheap, cheerful, and better than a flat green floor.
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#78ad63";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const shade = 85 + Math.floor(Math.random() * 75);
    ctx.fillStyle = `rgba(${shade}, ${130 + Math.random() * 65}, ${70 + Math.random() * 45}, 0.42)`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);

  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x9bcf75,
    roughness: 0.95,
  });
}

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xf4f1de })
);
moon.position.set(17, 18, -24);
scene.add(moon);

for (let i = 0; i < 28; i += 1) {
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff8d8 })
  );
  star.position.set(
    Math.sin(i * 8.91) * 55,
    12 + (i % 7) * 1.2,
    Math.cos(i * 4.37) * 55
  );
  scene.add(star);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
  createGrassMaterial()
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pathMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8c58d,
  roughness: 0.85,
});

function createPath(width, length, x, z, rotationY = 0) {
  const path = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, length), pathMaterial);
  path.position.set(x, 0.025, z);
  path.rotation.y = rotationY;
  path.receiveShadow = true;
  scene.add(path);

  addPathStones(width, length, x, z, rotationY);
}

function addPathStones(width, length, x, z, rotationY) {
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xb7a77a, roughness: 0.9 });
  const step = 4;
  const count = Math.floor(length / step);

  for (let i = 0; i < count; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const localZ = -length / 2 + i * step + 1.5;
    const localX = side * (width * 0.55 + 0.25);
    const worldX = x + localX * Math.cos(rotationY) - localZ * Math.sin(rotationY);
    const worldZ = z + localX * Math.sin(rotationY) + localZ * Math.cos(rotationY);

    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.05, 0.35),
      stoneMaterial
    );
    stone.position.set(worldX, 0.06, worldZ);
    stone.rotation.y = rotationY + Math.sin(i) * 0.6;
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

createPath(2.4, 68, 0, 0);
createPath(2, 58, 0, 0, Math.PI / 2);
createPath(1.5, 42, 15, -7, -0.45);
createPath(1.4, 34, -24, -19, 0.8);
createPath(1.4, 40, 28, 20, 0.35);

const pond = new THREE.Mesh(
  new THREE.CircleGeometry(5.2, 56),
  new THREE.MeshStandardMaterial({
    color: 0x4cc9f0,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
  })
);
pond.rotation.x = -Math.PI / 2;
pond.position.set(-23, 0.035, -24);
scene.add(pond);

const canal = new THREE.Mesh(
  new THREE.BoxGeometry(5, 0.035, 42),
  new THREE.MeshStandardMaterial({
    color: 0x4895ef,
    roughness: 0.25,
    transparent: true,
    opacity: 0.62,
  })
);
canal.position.set(30, 0.04, -8);
canal.rotation.y = 0.3;
scene.add(canal);

function addWaterHighlights() {
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xbde0fe,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  for (let i = 0; i < 8; i += 1) {
    const streak = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, 3.2),
      highlightMaterial.clone()
    );
    streak.position.set(30 + Math.sin(i) * 1.5, 0.085, -25 + i * 5.6);
    streak.rotation.y = 0.3;
    scene.add(streak);
    riverHighlights.push(streak);
  }

  const pondRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.25, 0.04, 8, 72),
    new THREE.MeshBasicMaterial({
      color: 0xd8f3ff,
      transparent: true,
      opacity: 0.34,
    })
  );
  pondRing.position.set(-23, 0.09, -24);
  pondRing.rotation.x = -Math.PI / 2;
  scene.add(pondRing);
  riverHighlights.push(pondRing);
}

const pollutedCanal = new THREE.Mesh(
  new THREE.BoxGeometry(5.6, 0.04, 20),
  new THREE.MeshStandardMaterial({
    color: 0x3d405b,
    roughness: 0.75,
    transparent: true,
    opacity: 0.72,
  })
);
pollutedCanal.position.set(37, 0.06, -21);
pollutedCanal.rotation.y = 0.3;
scene.add(pollutedCanal);

function createGridWhisperer() {
  // Low-poly by design. The silhouette matters more than perfect anatomy here.
  const character = new THREE.Group();

  const suitMaterial = new THREE.MeshStandardMaterial({
    color: 0x24505a,
    roughness: 0.55,
  });
  const clothMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6bd60,
    roughness: 0.65,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xc58b62,
    roughness: 0.7,
  });
  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2d2f,
    roughness: 0.6,
  });
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x72efdd,
    emissive: 0x1dd3b0,
    emissiveIntensity: 0.45,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x80ed99,
    emissive: 0x2dd4bf,
    emissiveIntensity: 0.18,
    roughness: 0.45,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.75, 8, 16), suitMaterial);
  body.position.y = 1.25;
  character.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), skinMaterial);
  head.position.y = 1.95;
  character.add(head);

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.12), clothMaterial);
  scarf.position.set(0.08, 1.66, -0.05);
  scarf.rotation.z = -0.15;
  character.add(scarf);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.55, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x6c584c, roughness: 0.8 })
  );
  backpack.position.set(0, 1.28, -0.34);
  character.add(backpack);

  const chestCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), glowMaterial);
  chestCore.position.set(0, 1.35, 0.31);
  character.add(chestCore);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.18), clothMaterial);
  belt.position.set(0, 1.02, 0.25);
  character.add(belt);

  const armGeometry = new THREE.CapsuleGeometry(0.08, 0.55, 6, 10);
  const leftArm = new THREE.Mesh(armGeometry, suitMaterial);
  leftArm.position.set(-0.42, 1.28, 0);
  leftArm.rotation.z = -0.25;
  character.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, suitMaterial);
  rightArm.position.set(0.42, 1.28, 0);
  rightArm.rotation.z = 0.25;
  character.add(rightArm);

  const legGeometry = new THREE.CapsuleGeometry(0.09, 0.55, 6, 10);
  const leftLeg = new THREE.Mesh(legGeometry, bootMaterial);
  leftLeg.position.set(-0.14, 0.55, 0);
  character.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, bootMaterial);
  rightLeg.position.set(0.14, 0.55, 0);
  character.add(rightLeg);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.08, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x90e0ef,
      emissive: 0x3a86ff,
      emissiveIntensity: 0.25,
    })
  );
  visor.position.set(0, 1.98, 0.25);
  character.add(visor);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.8 })
  );
  hair.position.y = 2.08;
  character.add(hair);

  const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), accentMaterial);
  leftShoulder.position.set(-0.34, 1.54, 0.02);
  character.add(leftShoulder);

  const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), accentMaterial);
  rightShoulder.position.set(0.34, 1.54, 0.02);
  character.add(rightShoulder);

  character.userData.rig = {
    body,
    head,
    scarf,
    backpack,
    chestCore,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    bodyBaseY: body.position.y,
    headBaseY: head.position.y,
    backpackBaseY: backpack.position.y,
    chestCoreBaseY: chestCore.position.y,
  };

  setObjectShadows(character);
  return character;
}

const player = createGridWhisperer();
player.position.set(0, 0, 7);
player.scale.setScalar(0.82);
scene.add(player);

function createVictoryTrophy() {
  const trophy = new THREE.Group();
  trophy.position.set(40, 0, -32);
  trophy.visible = false;
  scene.add(trophy);

  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0x6b4e00,
    emissiveIntensity: 0.18,
    metalness: 0.65,
    roughness: 0.28,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.9, 0.35, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a2f20, roughness: 0.55 })
  );
  base.position.y = 0.18;
  trophy.add(base);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.75, 18), goldMaterial);
  stem.position.y = 0.72;
  trophy.add(stem);

  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 14), goldMaterial);
  cup.scale.set(1, 0.78, 1);
  cup.position.y = 1.25;
  trophy.add(cup);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 10, 36), goldMaterial);
  rim.position.y = 1.72;
  rim.rotation.x = Math.PI / 2;
  trophy.add(rim);

  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 20), goldMaterial);
    handle.position.set(side * 0.62, 1.35, 0);
    handle.rotation.y = Math.PI / 2;
    trophy.add(handle);
  }

  const glow = new THREE.PointLight(0xffd166, 0, 12);
  glow.position.y = 1.6;
  trophy.add(glow);
  trophy.userData.glow = glow;

  setObjectShadows(trophy);
  return trophy;
}

const victoryTrophy = createVictoryTrophy();

function setObjectShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function createSolarpunkBuilding(x, z, height, color) {
  const building = new THREE.Group();
  building.position.set(x, 0, z);
  scene.add(building);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, height, 2.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  );
  body.position.y = height / 2;
  building.add(body);

  const roofGarden = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.2, 3.1),
    new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.95 })
  );
  roofGarden.position.y = height + 0.12;
  building.add(roofGarden);

  const glassBand = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.45, 2.92),
    new THREE.MeshStandardMaterial({
      color: 0x90e0ef,
      roughness: 0.25,
      metalness: 0.1,
    })
  );
  glassBand.position.y = height * 0.55;
  building.add(glassBand);

  setObjectShadows(building);
  return building;
}

createSolarpunkBuilding(-14, 2, 4.5, 0xf4e8c1);
createSolarpunkBuilding(-13, 7, 6.2, 0xe7c8a0);
createSolarpunkBuilding(13, 8, 5.5, 0xc9e4ca);
createSolarpunkBuilding(14, -9, 7, 0xf2d0a4);
createSolarpunkBuilding(-6, 13, 4.2, 0xdde5b6);
createSolarpunkBuilding(31, 21, 6.4, 0xcdeac0);
createSolarpunkBuilding(37, 15, 4.8, 0xf1faee);
createSolarpunkBuilding(-34, 22, 5.8, 0xf7d9c4);
createSolarpunkBuilding(24, -31, 6.8, 0xd8f3dc);
createSolarpunkBuilding(-40, -30, 4.6, 0xffe5d9);

function createVillageHouse(x, z, rotationY = 0) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  house.rotation.y = rotationY;
  scene.add(house);

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 1.6, 2),
    new THREE.MeshStandardMaterial({ color: 0xe9d8a6, roughness: 0.8 })
  );
  walls.position.y = 0.8;
  house.add(walls);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.7, 1.1, 4),
    new THREE.MeshStandardMaterial({ color: 0x9b5de5, roughness: 0.75 })
  );
  roof.position.y = 2.05;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  const windowGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffa62b,
      emissiveIntensity: 0.65,
    })
  );
  windowGlow.position.set(0, 0.9, 1.03);
  house.add(windowGlow);

  const porchPlant = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.7, 7),
    new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.9 })
  );
  porchPlant.position.set(1.25, 0.35, 0.65);
  house.add(porchPlant);

  setObjectShadows(house);
  minimapMarkers.push({ x, z, color: "#ffd166", size: 3 });
  return house;
}

// A tiny village on the edge of Aeris, warm enough to feel inhabited.
createVillageHouse(-18, -14, 0.2);
createVillageHouse(-15, -17, -0.45);
createVillageHouse(-21, -18, 0.55);
createVillageHouse(-20, -10, -0.2);
createVillageHouse(-27, -21, 0.15);
createVillageHouse(-31, -15, -0.35);
createVillageHouse(-36, -25, 0.6);
createPath(1.4, 12, -18, -14, -0.7);

function createTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.set(scale, scale * 1.35, scale);
  scene.add(tree);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.2, 1.65, 8),
    new THREE.MeshStandardMaterial({ color: 0x8d6e45 })
  );
  trunk.position.y = 0.82;
  tree.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.9, 9),
    new THREE.MeshStandardMaterial({ color: 0x2d6a4f })
  );
  leaves.position.y = 2.05;
  tree.add(leaves);

  const topLeaves = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 1.35, 9),
    new THREE.MeshStandardMaterial({ color: 0x40916c })
  );
  topLeaves.position.y = 2.85;
  tree.add(topLeaves);

  setObjectShadows(tree);
  return tree;
}

function createGrassTuft(x, z, scale = 1) {
  const tuft = new THREE.Group();
  tuft.position.set(x, 0, z);
  tuft.scale.setScalar(scale);
  scene.add(tuft);

  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.95 });

  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 5), grassMaterial);
    blade.position.set((i - 1) * 0.11, 0.27, Math.sin(i) * 0.08);
    blade.rotation.z = (i - 1) * 0.22;
    tuft.add(blade);
  }

  return tuft;
}

function createSmallRock(x, z, scale = 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.28 * scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 0.9 })
  );
  rock.position.set(x, 0.16 * scale, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

function scatterGroundDetails() {
  for (let i = 0; i < 90; i += 1) {
    const x = Math.sin(i * 12.989) * 54;
    const z = Math.cos(i * 78.233) * 54;

    if (Math.abs(x) < 3 || Math.abs(z) < 3) {
      continue;
    }

    createGrassTuft(x, z, 0.7 + (i % 4) * 0.14);
  }

  for (let i = 0; i < 24; i += 1) {
    const x = Math.sin(i * 5.17) * 50;
    const z = Math.cos(i * 9.43) * 50;
    createSmallRock(x, z, 0.65 + (i % 3) * 0.25);
  }
}

function createGlowMotes() {
  const moteMaterial = new THREE.MeshBasicMaterial({
    color: 0xcaffbf,
    transparent: true,
    opacity: 0.75,
  });

  for (let i = 0; i < 24; i += 1) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), moteMaterial.clone());
    mote.position.set(
      Math.sin(i * 2.4) * 22,
      1.2 + (i % 5) * 0.25,
      Math.cos(i * 3.1) * 22
    );
    mote.userData.baseY = mote.position.y;
    mote.userData.speed = 0.8 + (i % 4) * 0.18;
    scene.add(mote);
    glowMotes.push(mote);
  }
}

function createBirds() {
  const birdMaterial = new THREE.MeshBasicMaterial({ color: 0xf8f9fa });

  for (let i = 0; i < 9; i += 1) {
    const bird = new THREE.Group();
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.08), birdMaterial);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.08), birdMaterial);

    leftWing.position.x = -0.25;
    rightWing.position.x = 0.25;
    leftWing.rotation.z = 0.35;
    rightWing.rotation.z = -0.35;

    bird.add(leftWing);
    bird.add(rightWing);

    bird.userData.leftWing = leftWing;
    bird.userData.rightWing = rightWing;
    bird.userData.radius = 18 + i * 2.8;
    bird.userData.height = 10 + (i % 4) * 1.4;
    bird.userData.speed = 0.16 + (i % 3) * 0.035;
    bird.userData.phase = i * 0.8;

    scene.add(bird);
    birds.push(bird);
  }
}

function createSolarPanel(x, z, rotationY = 0) {
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.15, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x1d3557 })
  );
  panel.position.set(x, 0.7, z);
  panel.rotation.set(-0.45, rotationY, 0);
  panel.castShadow = true;
  panel.receiveShadow = true;
  scene.add(panel);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.65, 0.08, 1.65),
    new THREE.MeshStandardMaterial({ color: 0xf6bd60, roughness: 0.45 })
  );
  frame.position.copy(panel.position);
  frame.position.y -= 0.09;
  frame.rotation.copy(panel.rotation);
  frame.castShadow = true;
  scene.add(frame);

  const newGrowth = createTree(x + 1.8, z + 1.2, 0.65);
  minimapMarkers.push({ x, z, color: "#4cc9f0", size: 3 });

  return new EnergyObject({
    type: EnergyObjectType.SolarPanel,
    root: panel,
    mesh: panel,
    greenery: [newGrowth],
    cityLight: sunLight,
  });
}

function createWindTurbine(x, z) {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.28, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xe9ecef })
  );
  base.position.set(x, 1.6, z);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  const blades = new THREE.Group();
  blades.position.set(x, 3.25, z);
  scene.add(blades);

  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    blade.position.x = 0.7;
    blade.rotation.z = (Math.PI * 2 * i) / 3;
    blade.castShadow = true;
    blades.add(blade);
  }

  const gardenPatch = new THREE.Group();
  gardenPatch.position.set(x - 1.1, 0, z + 1.2);
  scene.add(gardenPatch);

  for (let i = 0; i < 5; i += 1) {
    const sprout = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 7),
      new THREE.MeshStandardMaterial({ color: 0x52b788 })
    );
    sprout.position.set(i * 0.45 - 0.9, 0.35, Math.sin(i) * 0.3);
    sprout.castShadow = true;
    gardenPatch.add(sprout);
  }

  minimapMarkers.push({ x, z, color: "#f8f9fa", size: 3 });

  return new EnergyObject({
    type: EnergyObjectType.WindTurbine,
    root: base,
    mesh: base,
    greenery: [gardenPatch],
    spinningPart: blades,
    cityLight: sunLight,
  });
}

function createBioReactor(x, z) {
  const reactor = new THREE.Group();
  reactor.position.set(x, 0, z);
  scene.add(reactor);

  const tank = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 20, 14),
    new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.45,
      transparent: true,
      opacity: 0.86,
    })
  );
  tank.position.y = 0.95;
  reactor.add(tank);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.045, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xf6bd60, roughness: 0.35 })
  );
  ring.position.y = 0.95;
  ring.rotation.x = Math.PI / 2;
  reactor.add(ring);

  const compostBed = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.25, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0x6c584c, roughness: 0.9 })
  );
  compostBed.position.y = 0.18;
  reactor.add(compostBed);

  const vines = createTree(x + 1.4, z - 0.8, 0.55);
  setObjectShadows(reactor);
  minimapMarkers.push({ x, z, color: "#80ed99", size: 3 });

  return new EnergyObject({
    type: EnergyObjectType.BioReactor,
    root: reactor,
    mesh: tank,
    greenery: [vines],
    cityLight: sunLight,
    restoredColor: 0x80ed99,
    lightBoostAmount: 0.25,
    onRestored: () => pollutionSystem.reduce(6),
  });
}

function createWaterPump(x, z) {
  const pump = new THREE.Group();
  pump.position.set(x, 0, z);
  scene.add(pump);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.5, 14),
    new THREE.MeshStandardMaterial({ color: 0x457b9d, roughness: 0.55 })
  );
  base.position.y = 0.25;
  pump.add(base);

  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.055, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.35 })
  );
  wheel.position.set(0, 0.95, 0.08);
  pump.add(wheel);

  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1.1, 10),
    new THREE.MeshStandardMaterial({ color: 0xf6bd60, roughness: 0.45 })
  );
  axle.position.y = 0.95;
  axle.rotation.z = Math.PI / 2;
  pump.add(axle);

  const reeds = new THREE.Group();
  reeds.position.set(x - 1, 0, z + 0.6);
  scene.add(reeds);

  for (let i = 0; i < 6; i += 1) {
    const reed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.9, 6),
      new THREE.MeshStandardMaterial({ color: 0x95d5b2, roughness: 0.9 })
    );
    reed.position.set(i * 0.25 - 0.65, 0.45, Math.sin(i) * 0.18);
    reeds.add(reed);
  }

  setObjectShadows(pump);
  setObjectShadows(reeds);
  minimapMarkers.push({ x, z, color: "#4895ef", size: 3 });

  return new EnergyObject({
    type: EnergyObjectType.WaterPump,
    root: pump,
    mesh: base,
    greenery: [reeds],
    spinningPart: wheel,
    cityLight: sunLight,
    restoredColor: 0x4cc9f0,
    lightBoostAmount: 0.25,
    onRestored: () => pollutionSystem.reduce(7),
  });
}

function createBatteryNode(x, z) {
  const node = new THREE.Group();
  node.position.set(x, 0, z);
  scene.add(node);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 1.7, 12),
    new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.5 })
  );
  pillar.position.y = 0.85;
  node.add(pillar);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xff9f1c,
      emissiveIntensity: 0.2,
      roughness: 0.35,
    })
  );
  core.position.y = 1.85;
  node.add(core);

  const flowerPatch = new THREE.Group();
  flowerPatch.position.set(x + 0.9, 0, z + 0.7);
  scene.add(flowerPatch);

  for (let i = 0; i < 7; i += 1) {
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xffafcc : 0xfdffb6 })
    );
    flower.position.set(Math.cos(i) * 0.55, 0.18, Math.sin(i * 1.7) * 0.45);
    flowerPatch.add(flower);
  }

  setObjectShadows(node);
  setObjectShadows(flowerPatch);
  minimapMarkers.push({ x, z, color: "#ffb703", size: 3 });

  return new EnergyObject({
    type: EnergyObjectType.BatteryNode,
    root: node,
    mesh: core,
    greenery: [flowerPatch],
    cityLight: sunLight,
    restoredColor: 0xfff3b0,
    lightBoostAmount: 0.28,
    onRestored: () => pollutionSystem.reduce(4),
  });
}

function createPollutingFactory(x, z) {
  // This is the visual problem in the level: smoke above, dirty water below.
  const factory = new THREE.Group();
  factory.position.set(x, 0, z);
  scene.add(factory);

  const mainBlock = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0x55524a, roughness: 0.8 })
  );
  mainBlock.position.y = 2;
  factory.add(mainBlock);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.35, 6.5),
    new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.7 })
  );
  roof.position.y = 4.25;
  factory.add(roof);

  for (let i = 0; i < 2; i += 1) {
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 5.2, 14),
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.65 })
    );
    chimney.position.set(2.2 + i * 1.5, 6.2, -1.7);
    factory.add(chimney);

    for (let puff = 0; puff < 5; puff += 1) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(0.65 + puff * 0.12, 12, 8),
        new THREE.MeshStandardMaterial({
          color: 0x2f2f2f,
          transparent: true,
          opacity: 0.48,
          roughness: 1,
        })
      );
      cloud.position.set(2.2 + i * 1.5 + puff * 0.35, 8.7 + puff * 0.55, -1.7);
      factory.add(cloud);
      pollutionClouds.push(cloud);
    }
  }

  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 5.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })
  );
  pipe.position.set(-3.9, 0.9, 3.5);
  pipe.rotation.x = Math.PI / 2;
  factory.add(pipe);

  const warning = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.7, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffb703, emissive: 0x6a4c00, emissiveIntensity: 0.2 })
  );
  warning.position.set(0, 2.5, 3.05);
  factory.add(warning);

  setObjectShadows(factory);
  minimapMarkers.push({ x, z, color: "#d00000", size: 5 });
  return factory;
}

function createAirPollutionParticles(centerX, centerZ) {
  for (let i = 0; i < 80; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + (i % 4) * 0.025, 8, 6),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0x5f5f5f : 0x3f3f3f,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );

    const spreadX = Math.sin(i * 5.37) * 15;
    const spreadZ = Math.cos(i * 3.91) * 11;

    particle.position.set(
      centerX + spreadX,
      2.2 + (i % 12) * 0.38,
      centerZ + spreadZ
    );

    particle.userData.baseX = particle.position.x;
    particle.userData.baseY = particle.position.y;
    particle.userData.baseZ = particle.position.z;
    particle.userData.speed = 0.55 + (i % 6) * 0.08;
    particle.userData.phase = i * 0.61;

    scene.add(particle);
    pollutionParticles.push(particle);
  }
}

function createTrashPile(x, z) {
  // Trash disappears after cleanup, which gives the player a clear little win.
  const trash = new THREE.Group();
  trash.position.set(x, 0, z);
  scene.add(trash);

  const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.9 });
  const scrapMaterial = new THREE.MeshStandardMaterial({ color: 0xadb5bd, roughness: 0.65 });

  for (let i = 0; i < 4; i += 1) {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), bagMaterial);
    bag.position.set(Math.cos(i) * 0.32, 0.24, Math.sin(i * 1.4) * 0.28);
    trash.add(bag);
  }

  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.35, 10), scrapMaterial);
  can.position.set(0.42, 0.18, -0.22);
  can.rotation.z = 0.9;
  trash.add(can);

  setObjectShadows(trash);
  minimapMarkers.push({ x, z, color: "#8d99ae", size: 3 });

  return new EnergyObject({
    type: EnergyObjectType.TrashPile,
    root: trash,
    mesh: trash.children[0],
    hideWhenRestored: true,
    restoredColor: 0x80ed99,
    onRestored: () => pollutionSystem.reduce(8),
  });
}

function createFactoryManager(x, z) {
  // Story mode stays simple: find the manager, press E, make the complaint.
  const manager = new THREE.Group();
  manager.position.set(x, 0, z);
  scene.add(manager);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.75, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.65 })
  );
  body.position.y = 1.1;
  manager.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc58b62, roughness: 0.7 })
  );
  head.position.y = 1.78;
  manager.add(head);

  const hardHat = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.45 })
  );
  hardHat.position.y = 1.94;
  manager.add(hardHat);

  setObjectShadows(manager);
  minimapMarkers.push({ x, z, color: "#ffb703", size: 5 });

  return new EnergyObject({
    type: EnergyObjectType.FactoryManager,
    root: manager,
    mesh: body,
    restoredColor: 0xffd166,
    onRestored: () => pollutionSystem.reduce(12),
  });
}

const treeSpots = [
  [-10, -6, 1.2],
  [-8, 4, 0.9],
  [-3, -8, 1.1],
  [2, -7, 0.85],
  [8, 5, 1],
  [11, -3, 1.25],
  [0, 11, 1.1],
  [-12, 9, 0.95],
  [-26, -30, 1.2],
  [-33, -7, 1],
  [-45, 10, 1.15],
  [-38, 34, 0.9],
  [-14, 38, 1.25],
  [12, 33, 1.1],
  [27, 31, 1.2],
  [43, 15, 0.95],
  [42, -16, 1.15],
  [28, -39, 1],
  [4, -43, 1.2],
  [-20, -43, 0.9],
];

for (const [x, z, scale] of treeSpots) {
  createTree(x, z, scale);
}

scatterGroundDetails();
createGlowMotes();
createBirds();
addWaterHighlights();

createPollutingFactory(42, -31);
createAirPollutionParticles(42, -31);
createPath(2, 22, 36, -27, 0.55);

const pollutionSystem = new PollutionSystem(
  document.querySelector("#pollution-fill"),
  document.querySelector("#pollution-label")
);

const energyObjects = [
  createSolarPanel(-4, 0, 0),
  createSolarPanel(-7, -4, 0.35),
  createSolarPanel(0, -4, -0.25),
  createSolarPanel(6, 5, 0.6),
  createSolarPanel(24, 20, -0.15),
  createSolarPanel(34, 9, 0.5),
  createSolarPanel(-31, 18, -0.55),
  createSolarPanel(-42, -8, 0.25),
  createWindTurbine(4, 0),
  createWindTurbine(9, -5),
  createWindTurbine(-9, 6),
  createWindTurbine(38, -19),
  createWindTurbine(-36, 30),
  createWindTurbine(19, -42),
  createBioReactor(-28, -28),
  createBioReactor(31, 29),
  createBioReactor(-42, 12),
  createWaterPump(-23, -18),
  createWaterPump(30, -8),
  createWaterPump(38, -2),
  createBatteryNode(18, 24),
  createBatteryNode(-24, 28),
  createBatteryNode(44, 22),
  createTrashPile(36, -21),
  createTrashPile(39, -24),
  createTrashPile(44, -27),
  createTrashPile(31, -15),
  createTrashPile(-22, -23),
  createTrashPile(-18, -18),
  createFactoryManager(38, -34),
];

const taskSystem = new TaskSystem(
  document.querySelector("#task-list"),
  document.querySelector("#task-status"),
  {
    onAllTasksComplete: () => {
      victoryTrophy.visible = true;
      document.querySelector("#victory-panel").style.display = "block";
    },
  }
);

const playerController = new PlayerController(player, camera, renderer.domElement);
const interactionSystem = new InteractionSystem(player, energyObjects, {
  promptElement: document.querySelector("#prompt"),
  taskSystem,
});

const clock = new THREE.Clock();

function drawMiniMap() {
  const size = minimapCanvas.width;
  const worldSize = WORLD_SIZE;
  const center = size / 2;

  minimapContext.clearRect(0, 0, size, size);

  const duskGradient = minimapContext.createLinearGradient(0, 0, 0, size);
  duskGradient.addColorStop(0, "#102f3a");
  duskGradient.addColorStop(1, "#254b38");
  minimapContext.fillStyle = duskGradient;
  minimapContext.fillRect(0, 0, size, size);

  minimapContext.strokeStyle = "rgba(255, 255, 255, 0.14)";
  minimapContext.lineWidth = 1;
  minimapContext.beginPath();
  minimapContext.moveTo(center, 0);
  minimapContext.lineTo(center, size);
  minimapContext.moveTo(0, center);
  minimapContext.lineTo(size, center);
  minimapContext.stroke();

  for (const marker of minimapMarkers) {
    const mapX = center + (marker.x / worldSize) * size;
    const mapY = center + (marker.z / worldSize) * size;

    minimapContext.fillStyle = marker.color;
    minimapContext.beginPath();
    minimapContext.arc(mapX, mapY, marker.size, 0, Math.PI * 2);
    minimapContext.fill();
  }

  const playerX = center + (player.position.x / worldSize) * size;
  const playerY = center + (player.position.z / worldSize) * size;

  minimapContext.fillStyle = "#80ed99";
  minimapContext.beginPath();
  minimapContext.arc(playerX, playerY, 4, 0, Math.PI * 2);
  minimapContext.fill();

  minimapContext.strokeStyle = "rgba(255, 255, 255, 0.9)";
  minimapContext.stroke();
}

function updatePollutionVisuals(deltaTime) {
  // As the pollution number falls, the world quietly clears with it.
  const pollutionRatio = pollutionSystem.pollution / 100;
  pollutedCanal.material.opacity = 0.15 + pollutionRatio * 0.62;

  for (let i = 0; i < pollutionClouds.length; i += 1) {
    const cloud = pollutionClouds[i];
    cloud.material.opacity = 0.08 + pollutionRatio * 0.45;
    cloud.position.x += Math.sin(clock.elapsedTime + i) * deltaTime * 0.08;
    cloud.position.y += Math.cos(clock.elapsedTime * 0.8 + i) * deltaTime * 0.05;
  }

  for (let i = 0; i < pollutionParticles.length; i += 1) {
    const particle = pollutionParticles[i];
    const t = clock.elapsedTime * particle.userData.speed + particle.userData.phase;

    particle.visible = pollutionRatio > 0.04;
    particle.material.opacity = pollutionRatio * (0.18 + (i % 5) * 0.08);
    particle.scale.setScalar(0.55 + pollutionRatio * 1.25);

    particle.position.x = particle.userData.baseX + Math.sin(t) * 1.6;
    particle.position.y = particle.userData.baseY + Math.sin(t * 0.7) * 0.45;
    particle.position.z = particle.userData.baseZ + Math.cos(t * 0.8) * 1.2;
  }
}

function updateGlowMotes() {
  for (let i = 0; i < glowMotes.length; i += 1) {
    const mote = glowMotes[i];
    mote.position.y = mote.userData.baseY + Math.sin(clock.elapsedTime * mote.userData.speed + i) * 0.25;
    mote.material.opacity = 0.45 + Math.sin(clock.elapsedTime * 1.4 + i) * 0.25;
  }
}

function updateWaterHighlights() {
  for (let i = 0; i < riverHighlights.length; i += 1) {
    const highlight = riverHighlights[i];
    highlight.material.opacity = 0.22 + Math.sin(clock.elapsedTime * 1.8 + i) * 0.12;

    if (highlight.geometry.type === "BoxGeometry") {
      highlight.position.z += Math.sin(clock.elapsedTime + i) * 0.006;
    }
  }
}

function updateBirds() {
  for (let i = 0; i < birds.length; i += 1) {
    const bird = birds[i];
    const angle = clock.elapsedTime * bird.userData.speed + bird.userData.phase;
    const wingFlap = Math.sin(clock.elapsedTime * 7 + i) * 0.35;

    bird.position.set(
      Math.cos(angle) * bird.userData.radius,
      bird.userData.height + Math.sin(angle * 1.7) * 0.8,
      Math.sin(angle) * bird.userData.radius
    );
    bird.rotation.y = -angle + Math.PI / 2;
    bird.userData.leftWing.rotation.z = 0.35 + wingFlap;
    bird.userData.rightWing.rotation.z = -0.35 - wingFlap;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  playerController.update(deltaTime);
  interactionSystem.update();

  for (const energyObject of energyObjects) {
    energyObject.update(deltaTime);
  }

  updatePollutionVisuals(deltaTime);
  updateGlowMotes();
  updateWaterHighlights();
  updateBirds();
  drawMiniMap();
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
