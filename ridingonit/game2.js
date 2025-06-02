// Constants
const sceneWidth = window.innerWidth;
const sceneHeight = window.innerHeight;
const laneWidth = 5;
const numLanes = 3;
const riverBottomWidthPercentage = 0.8; // 80% of screen width at bottom
const riverTopWidthPercentage = 0.5; // 50% of screen width at top

// Initialize scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, sceneWidth / sceneHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(sceneWidth, sceneHeight);
document.body.appendChild(renderer.domElement);

// River
const riverBottomWidth = sceneWidth * riverBottomWidthPercentage;
const riverTopWidth = sceneWidth * riverTopWidthPercentage;
const riverShape = new THREE.Shape();
riverShape.moveTo(-riverBottomWidth / 2, 0);
riverShape.lineTo(-riverTopWidth / 2, -50);
riverShape.lineTo(riverTopWidth / 2, -50);
riverShape.lineTo(riverBottomWidth / 2, 0);
riverShape.lineTo(-riverBottomWidth / 2, 0);

const extrudeSettings = {
    steps: 2,
    depth: 1,
    bevelEnabled: false,
};

const riverGeometry = new THREE.ExtrudeGeometry(riverShape, extrudeSettings);
const riverMaterial = new THREE.MeshBasicMaterial({ color: 0x0077ff, side: THREE.DoubleSide });
const river = new THREE.Mesh(riverGeometry, riverMaterial);
scene.add(river);

// Character
const characterGeometry = new THREE.BoxGeometry(1, 1, 1);
const characterMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const character = new THREE.Mesh(characterGeometry, characterMaterial);
character.position.y = 0.5;
character.position.x = 0; // Set initial position
scene.add(character);

// Obstacles
const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
const obstacles = [];
const obstacleSpeed = 0.1;
let canMove = true;

function createObstacle() {
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    const laneIndex = Math.floor(Math.random() * numLanes);
    const laneOffset = (laneIndex - Math.floor(numLanes / 2)) * laneWidth;
    obstacle.position.set(laneOffset, 0.5, -20);
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// Keyboard input
const keyboard = {};

function keyDown(event) {
    if (!canMove) return;
    keyboard[event.keyCode] = true;
}

function keyUp(event) {
    if (!canMove) return;
    keyboard[event.keyCode] = false;
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

// Game loop
function update() {
    if (keyboard[37] && character.position.x > -laneWidth && canMove) { // Left arrow
        character.position.x -= laneWidth;
        canMove = false;
    }
    if (keyboard[39] && character.position.x < laneWidth && canMove) { // Right arrow
        character.position.x += laneWidth;
        canMove = false;
    }

    for (let obstacle of obstacles) {
        obstacle.position.z += obstacleSpeed;

        if (obstacle.position.z > 10) {
            scene.remove(obstacle);
            obstacles.splice(obstacles.indexOf(obstacle), 1);
        }

        if (character.position.distanceTo(obstacle.position) < 1) {
            // Collision detected
            alert("Game Over!");
            location.reload(); // Reload the game
        }
    }

    if (Math.random() < 0.01) {
        createObstacle();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
    canMove = true;
}

update();
