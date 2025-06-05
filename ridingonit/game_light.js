import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { WaterRefractionShader } from 'three/addons/shaders/WaterRefractionShader.js';
// import { Water } from 'three/addons/objects/Water.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

    let scene, camera;
    let river, forest, character;
    let fillLight, dirGroup; // directionalLight removed
    let sky, sun;

    let particlePool = [];
    const maxParticles = 50; // Reduced for simplicity
    let particleSystemContainer;
    let splashTexture; // Will hold the generated texture

    let obstacles = [];
    let nuggets = [];
    let trees = [];
    let fishes = [];
    let grasss = [];


    let lanePositions = [-2, 0, 2];
    let currentLane = 1;
    let speed = 0.3;
    let hits = 0;
    let chances = 3;
    const SUBMERGE_AMOUNT = 0.1; // Or whatever value works best (e.g., 0.05, 0.2)
    let CharacterInitialY = 0;
    let characterBaseYOffset = 0; // Initialize, it will be set in addCharacter()

    let targetCharacterRotationY = Math.PI; // Default forward-facing rotation Y
    let targetCharacterRotationZ = 0;       // Default lean Z
    const LEAN_ANGLE = Math.PI / 15;      // Angle for leaning during turns
    let rotationSpeed = 0.1;              // Speed of rotation and returning to default

    let treasures = 0;
    let water; 
    const clock = new THREE.Clock();
    let QuoteNumber;
    let RandomQuote = null;
    let totalPoints = 0;
    let isTransitioning = false;

    let isJumping = false;
    let jumpProgress = 0;
    const JUMP_HEIGHT = 2; // Adjust as needed
    const JUMP_DURATION = 60; // In frames, adjust for desired speed
    const JUMP_SQUASH_SCALE_Y = 0.7;
    const JUMP_SQUASH_SCALE_XZ = 1.1;
    let originalCharacterScaleY = 0.5; // Will be set in addCharacter
    let originalCharacterScaleXZ = 0.5; // Will be set in addCharacter
    let targetLane;
    let isPaused = false;
    let terrainHeight;

    // Variables for camera shake
    let shakeDuration = 0;
    let shakeTime = 0;

    // Variables for controlling frame rate
    let lastTime = 0, lastTimeAnimation = 0;
    const fps = 30;
    const interval = 1000 / fps;

    let touchStartX = null;
    let touchStartY = null;
    let touchEndX = null;
    let touchEndY = null;

/// Grass animation & shader
const vertexShader = `
  varying vec2 vUv;
  uniform float time;
  
  
  float N (vec2 st) { // https://thebookofshaders.com/10/
      return fract( sin( dot( st.xy, vec2(12.9898,78.233 ) ) ) *  43758.5453123);
  }
  
  float smoothNoise( vec2 ip ){ 
      vec2 lv = fract( ip );
    vec2 id = floor( ip );
    
    lv = lv * lv * ( 3. - 2. * lv );
    
    float bl = N( id );
    float br = N( id + vec2( 1, 0 ));
    float b = mix( bl, br, lv.x );
    
    float tl = N( id + vec2( 0, 1 ));
    float tr = N( id + vec2( 1, 1 ));
    float t = mix( tl, tr, lv.x );
    
    return mix( b, t, lv.y );
  }

  
	void main() {

    vUv = uv;
    float t = time * 2.;
    
    // VERTEX POSITION
    
    vec4 mvPosition = vec4( position, 1.0 );
    #ifdef USE_INSTANCING
    	mvPosition = instanceMatrix * mvPosition;
    #endif
    
    // DISPLACEMENT
    
    float noise = smoothNoise(mvPosition.xz * 0.5 + vec2(0., t));
    noise = pow(noise * 0.5 + 0.5, 2.) * 2.;
    
    // here the displacement is made stronger on the blades tips.
    float dispPower = 1. - cos( uv.y * 3.1416 * 0.5 );
    
    float displacement = noise * ( 0.3 * dispPower );
    mvPosition.z -= displacement;
    
    //
    
    vec4 modelViewPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * modelViewPosition;

	}
`;

const fragmentShader = `
  varying vec2 vUv;
  
  void main() {
  	vec3 baseColor = vec3( 0.41, 1.0, 0.5 );
    float clarity = ( vUv.y * 0.875 ) + 0.125;
    gl_FragColor = vec4( baseColor * clarity, 1 );
  }
`;

const uniforms = {
	time: {
  	value: 0
  }
}

const leavesMaterial = new THREE.ShaderMaterial({
	vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide
});


    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = false;
    //renderer.shadowMapSoft = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

         // Initialize the loading manager
 const manager = new THREE.LoadingManager();
    manager.onLoad = () => {
      console.log('All assets loaded');
      init();
      initSky();
      animate();
    };
    manager.onError = (url) => {
      console.error('There was an error loading ' + url);
    };
    const textureLoader = new THREE.TextureLoader();

        const nuggetTexture = textureLoader.load('media/goldnugget.png');
        const waterTexture = textureLoader.load('media/waternormals.jpg');
        /// Load terrain
        const heightMapImage = textureLoader.load('media/HeightMap.jpg');
        const HeightMapTexture = textureLoader.load('media/HeightMapTexture.jpg');
        const waterNormals = new THREE.TextureLoader().load('media/waternormals.jpg', function(texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        });

function createSplashTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            // gradient.addColorStop(0, 'rgba(255,255,255,0.8)'); // Original white center
            // gradient.addColorStop(0.5, 'rgba(200,200,255,0.5)'); // Original light blueish-white
            // gradient.addColorStop(1, 'rgba(150,150,255,0)');   // Original very light transparent blue

            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');    // Bright white, slightly more opaque center
            gradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.7)'); // Lighter blueish-white, transition starts earlier
            gradient.addColorStop(0.7, 'rgba(100, 149, 237, 0.5)'); // Cornflower blue, more distinct blue
            gradient.addColorStop(1, 'rgba(70, 130, 180, 0)');      // Steel blue, fading to transparent
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

function initParticleSystem() {
    splashTexture = createSplashTexture(); // Generate the texture
    particleSystemContainer = new THREE.Object3D();
    scene.add(particleSystemContainer);
    for (let i = 0; i < maxParticles; i++) {
        const spriteMaterial = new THREE.SpriteMaterial({
            map: splashTexture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        const particle = new THREE.Sprite(spriteMaterial);
        particle.visible = false;
        particle.scale.set(0.1, 0.1, 0.1); // Smaller initial scale
        particleSystemContainer.add(particle);
        particlePool.push({
            sprite: particle,
            isActive: false,
            life: 0,
            velocity: new THREE.Vector3(),
            gravity: 0.01, // Reduced gravity
            initialScale: 0.1,
            maxScale: 0.3, // Reduced max scale
            scaleSpeed: 0.03
        });
    }
    console.log("Initialized simple particle system.");
}

function emitSplash(position, count = 5, baseVelocity = 0.05, upwardSpeedBias = 1.0) {
    let emittedCount = 0;
    for (let p of particlePool) {
        if (!p.isActive) {
            p.sprite.visible = true;
            p.isActive = true;
            p.life = 1.0 + Math.random() * 0.5; // Life in seconds
            p.sprite.position.copy(position);
            // Simplified spread, mostly upwards and slightly outwards
            const angle = Math.random() * Math.PI * 2;
            p.velocity.set(
                Math.cos(angle) * baseVelocity * (0.5 + Math.random() * 0.5),
                (baseVelocity + Math.random() * baseVelocity) * upwardSpeedBias * 2.0, // More upward bias
                Math.sin(angle) * baseVelocity * (0.5 + Math.random() * 0.5)
            );
            p.sprite.scale.set(p.initialScale, p.initialScale, p.initialScale);
            p.sprite.material.opacity = 0.8;
            emittedCount++;
            if (emittedCount >= count) break;
        }
    }
}

function updateParticles(delta) { // delta is time since last frame
    for (let p of particlePool) {
        if (p.isActive) {
            p.life -= delta;
            if (p.life <= 0) {
                p.isActive = false;
                p.sprite.visible = false;
            } else {
                p.sprite.position.addScaledVector(p.velocity, delta * 20); // Multiplied by 20 to make delta more impactful
                p.velocity.y -= p.gravity * delta * 20; // Multiplied by 20
                const lifeRatio = Math.max(0, p.life / (1.0 + 0.5)); // Assuming max life is 1.5
                p.sprite.material.opacity = Math.max(0, lifeRatio * 0.8);
                let currentScale = p.sprite.scale.x;
                currentScale += p.scaleSpeed * delta * 5; // Multiplied by 5
                currentScale = Math.min(currentScale, p.maxScale);
                p.sprite.scale.set(currentScale, currentScale, currentScale);
            }
        }
    }
}

    function initSky() {
        sky = new Sky();
        sky.scale.setScalar(450000);
        scene.add(sky);

        sun = new THREE.Vector3();

        const effectController = {
            turbidity: 10,
            rayleigh: 2,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 10,
            azimuth: 0,
            exposure: 0.9
        };

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render(scene, camera);
    } 

    function addTrees() {
        const loader = new GLTFLoader();
        
        loader.load(
            '3Dmodels/pine_tree.glb',
            function(gltf) {
                for (let i = 0; i < 80; i++) { // Reduced from 400
                    const tree = gltf.scene.clone();
                    const side = (i % 2 === 0) ? -1 : 1;
                    tree.position.set(side * (7 + Math.random() * 25), 0, -Math.random() * 300);

                    const randomScaleY = Math.random() * (4.0 - 0.5) + 1;
                    const randomRotationY = Math.random() * Math.PI * 2;

                    tree.scale.set(2, randomScaleY, 2);
                    tree.rotation.set(0, randomRotationY, 0);
                    
                    
                    // Check and ensure materials support shadows
                    tree.traverse(function(node) {
                        if (node.isMesh) {
                            
                            
                            if (node.material) {
                                node.material.shadowSide = THREE.FrontSide;
                            }
                        }
                    });
                    trees.push(tree);
                    scene.add(tree);

                }
            },
            undefined,
            function(error) {
                console.error('An error occurred while loading the model:', error);
            }
        );
    }

    function addGrass(){
/////////
// MESH
/////////

const instanceNumber = 50; // Reduced from 250
const dummy = new THREE.Object3D();
const riverWidth = 10; // Adjust this value to match your river's width
const grassMargin = 10; // Distance from the river's edge where grass starts


for (let i = 0; i < 40; i++) { // Reduced from 1000


const geometry = new THREE.PlaneGeometry( 0.1, 1, 1, 4 );
geometry.translate( 0, 0.5, 0 ); // move grass blade geometry lowest point at 0.

const grass = new THREE.InstancedMesh( geometry, leavesMaterial, instanceNumber );

const side = (i % 2 === 0) ? -1 : 1;
const sideOffset = side * (riverWidth / 2 + grassMargin + Math.random() * 25);
grass.position.set(sideOffset, 0, -Math.random() * 350);grass.position.set(side * (7 + Math.random() * 25), 0, -Math.random() * 350);


grass.traverse(function(node) {
                        if (node.isMesh) {
                            
                            
                            if (node.material) {
                                node.material.shadowSide = THREE.FrontSide;
                            }
                        }
                    });

scene.add( grass );
grasss.push(grass);

     // Position and scale the grass blade instances randomly.
     for (let j = 0; j < instanceNumber; j++) {
            let xPos;
            do {
                xPos = (Math.random() - 0.5) * 10;
            } while (Math.abs(xPos + sideOffset) < (riverWidth / 2 + grassMargin));

            dummy.position.set(
                xPos,
                0,
                (Math.random() - 0.5) * 10
            );
            
            dummy.scale.setScalar(0.02 + Math.random() * 0.3);
            
            dummy.rotation.y = Math.random() * Math.PI;
            
            dummy.updateMatrix();
            grass.setMatrixAt(j, dummy.matrix);
        }

        grass.instanceMatrix.needsUpdate = true;
    }
}


    function addFishes() {
    const loader3 = new GLTFLoader();
    
    loader3.load(
        '3Dmodels/fish.glb',
        function(gltf) {
            for (let i = 0; i < 1; i++) {
                const fish = gltf.scene.clone();
                const lane = 0; // Always set lane to 0 for the middle lane
                fish.position.set(lane * (5 + Math.random() * 5), 0, -Math.random() * 100);

                fish.scale.set(0.2, 0.2, 0.2);
                fish.position.y = -0.7;

                const randomRotationY = Math.random() * Math.PI * 2;
                fish.rotation.set(180, randomRotationY, 0);

                fish.traverse(function(node) {
                        if (node.isMesh) {
                            
                            
                            if (node.material) {
                                node.material.shadowSide = THREE.FrontSide;
                            }
                        }
                    });
                                    fishes.push(fish);
                scene.add(fish);
            }
        },
        undefined,
        function(error) {
            console.error('An error occurred while loading the model:', error);
        }
    );
}

    // let touchStartX = null; // Already defined globally
    // let touchEndX = null; // Already defined globally

    function onTouchStart(event) {
        // Prevent default browser handling of touch events (e.g., scrolling)
        // event.preventDefault(); // Decided against this for now, can add if scrolling becomes an issue.
                                  // test.html does not preventDefault here.

        if (!character || isPaused) { // Similar guards as in test.html's onTouchStart
            touchStartX = null; // Reset to ensure no stale data if game not ready
            touchStartY = null;
            return;
        }
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        
        // Reset touchEndX/Y for the new touch sequence
        touchEndX = null; 
        touchEndY = null;
    }

function onTouchMove(event) {
    // event.preventDefault(); // Again, decided against for now.

    if (!character || isPaused || touchStartX === null || touchStartY === null) { 
        // If no valid touch start, or game not ready, do nothing.
        return;
    }
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
}

function onTouchEnd() {
    if (!character || isPaused || touchStartX === null || touchEndX === null) {
        // Reset all touch coordinates if exiting early due to game state or incomplete swipe
        touchStartX = null; touchStartY = null; touchEndX = null; touchEndY = null;
        return;
    }

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY; // touchEndY can be null if no move, handle this

    // Define thresholds for swipe detection (can be tuned)
    const swipeThresholdMin = 40; // Minimum distance for a swipe
    const swipeThresholdMaxDelta = 50; // Max secondary axis movement for a clear swipe

    // Priority 1: Swipe Up for Jump
    if (deltaY < -swipeThresholdMin && Math.abs(deltaX) < swipeThresholdMaxDelta) {
        if (!isJumping && character) { // Check game conditions for jumping
            isJumping = true;
            jumpProgress = 0;
            console.log("Jump initiated by swipe up");
        }
    }
    // Priority 2: Swipe Left/Right for Lane Change
    else if (Math.abs(deltaX) > swipeThresholdMin && Math.abs(deltaY) < swipeThresholdMaxDelta) {
        const turnAudio = document.getElementById('turnAudio');
        if (deltaX > 0) { // Swipe Right
            targetCharacterRotationY = Math.PI - Math.PI / 8;
            targetCharacterRotationZ = -LEAN_ANGLE;
            if (!isTransitioning) { // Only change targetLane if not already moving
                if(turnAudio) turnAudio.play();
                targetLane = Math.min(2, currentLane + 1);
            }
        } else { // Swipe Left
            targetCharacterRotationY = Math.PI + Math.PI / 8;
            targetCharacterRotationZ = LEAN_ANGLE;
            if (!isTransitioning) { // Only change targetLane if not already moving
                if(turnAudio) turnAudio.play();
                targetLane = Math.max(0, currentLane - 1);
            }
        }

        if (targetLane !== currentLane && character && !isTransitioning) {
            isTransitioning = true;
            // Placeholder for potential splash on turn, if desired later
            // emitSplash(...) 
            smoothTransition(character.position.x, lanePositions[targetLane], 100, () => {
                currentLane = targetLane;
                isTransitioning = false;
            });
        }
    }

    // Reset all touch coordinates at the end of handling for the next touch sequence.
    touchStartX = null; touchStartY = null; touchEndX = null; touchEndY = null;
}

    function onKeyDown(event) {

        if (isPaused && event.key !== 'p') return;

        const turnAudio = document.getElementById('turnAudio');

        if (event.key === 'ArrowLeft' || event.key === 'a') {
            targetCharacterRotationY = Math.PI + Math.PI / 8; // Correct Y rotation for left
            targetCharacterRotationZ = LEAN_ANGLE;           // Correct Z lean for left
            if (isTransitioning) return; // Prevent lane change if already transitioning
            if(turnAudio) turnAudio.play();
            targetLane = Math.max(0, currentLane - 1);
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
            targetCharacterRotationY = Math.PI - Math.PI / 8; // Correct Y rotation for right
            targetCharacterRotationZ = -LEAN_ANGLE;          // Correct Z lean for right
            if (isTransitioning) return; // Prevent lane change if already transitioning
            if(turnAudio) turnAudio.play();
            targetLane = Math.min(2, currentLane + 1);
        } else if (event.key === 'p') {
            togglePause();
            return;
        } else if (event.code === 'Space' && !isJumping && character) {
            isJumping = true;
            jumpProgress = 0;
            // console.log("Jump initiated"); // For debugging
            return; // Prevent other key actions if jumping
        } else {
            return;
        }

        if (targetLane !== currentLane && character) { // Check targetLane is not undefined
            isTransitioning = true;
            smoothTransition(character.position.x, lanePositions[targetLane], 100, () => {
                currentLane = targetLane;
                isTransitioning = false;
            });
        }
    }

    function smoothTransition(start, end, duration, callback) {
        const startTime = Date.now();

        function animate() {
            const now = Date.now();
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            character.position.x = start + (end - start) * t;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        }

        requestAnimationFrame(animate);
    }

    function getRandomQuoteNumber() {
        return Math.floor(Math.random() * 8) + 1;
    }

    function playRandomQuote() {
        if (RandomQuote && !RandomQuote.paused) {
            return;
        }

        setTimeout(function() {
            QuoteNumber = getRandomQuoteNumber();
            RandomQuote = document.getElementById('Quote' + QuoteNumber);
            RandomQuote.play();
        }, 2000);
    }

    function checkCollisions() {
        for (let obstacle of obstacles) {
            if (character.position.distanceTo(obstacle.position) < 1) {
                hits++;
                chances--;
                document.getElementById('chances').innerText = chances;
                totalPoints -= 10;

                if (chances == 2) {
                    document.getElementById('collisions').style.backgroundColor = 'rgba(236,255,0,0.5)';
                    document.getElementById('collisions').style.color = 'black';
                }
                if (chances == 1) {
                    document.getElementById('collisions').style.backgroundColor = 'rgba(255,125,0,0.5)';
                    document.getElementById('collisions').style.color = 'black';
                }
                if (chances >= 3) {
                    document.getElementById('collisions').style.backgroundColor = 'rgba(0,255,0,0.5)';
                    document.getElementById('collisions').style.color = 'black';
                }

                collisionAudio.play();

                obstacle.position.z -= 100;
                triggerCameraShake(0.8);
                if (hits >= 3) {
                    backgroundAudio.pause();
                    alert('Game Over!\nScore: ' + totalPoints + '\nTotal nuggets: ' + treasures + '\nPress OK to restart.');
                    window.location.reload();
                }
            }
        }

        for (let nugget of nuggets) {
            if (character.position.distanceTo(nugget.position) < 1) {
                treasures++;
                chances++;
                hits--;
                document.getElementById('chances').innerText = chances;
                document.getElementById('treasuresFound').innerText = treasures;

                if (chances == 2) {
                    document.getElementById('collisions').style.backgroundColor = 'rgba(236,255,0,0.5)';
                    document.getElementById('collisions').style.color = 'black';
                }
                if (chances == 1) {
                    document.getElementById('collisions').style.backgroundColor = 'rgba(255,125,0,0.5)';
                    document.getElementById('collisions').style.color = 'black';
                }
                if (chances >= 3) {
                    document.getElementById('collisions').style.backgroundColor = 'rgba(0,255,0,0.5)';
                    document.getElementById('collisions').style.color = 'black';
                }
                
                nugget.position.z -= 100;
                treasureAudio.play();
                playRandomQuote();
            }
        }
    }

    function triggerCameraShake(duration) {
        shakeDuration = duration;
        shakeTime = 0;
    }

    function applyCameraShake() {
        if (shakeTime < shakeDuration) {
            const shakeAmount = 0.08;
            camera.position.x += (Math.random() - 0.5) * shakeAmount;
            camera.position.y += (Math.random() - 0.5) * shakeAmount;
            shakeTime += speed;
        } 
    }

    function updatePoints() {
        totalPoints += 1;
        document.getElementById('totalPoints').innerText = totalPoints;
        IncreaseSpeed();
    }

    function IncreaseSpeed() {
        if (totalPoints % 1000 === 0 && totalPoints > 0) {
            speed = speed + 0.05;
        }
    }

function animateWater() {
    // const time = performance.now() * 0.001;
    // water.material.uniforms['time'].value += 1.0 / 60.0; // Old logic for THREE.Water
    // water.material.uniforms['size'].value = Math.sin(time) * 5.0 + 10.0; // Old logic
    
    // New logic for simple scrolling texture (optional, can be added later):
    // if (water && water.material.map) {
    //     water.material.map.offset.y += 0.001; // Example scroll speed
    // }
}

    function init() {
        const backgroundAudio = document.getElementById('backgroundAudio');
        const collisionAudio = document.getElementById('collisionAudio');
        const treasureAudio = document.getElementById('treasureAudio');
        const turnAudio = document.getElementById('turnAudio');

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);



        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
    const fillLight = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 2); // Kept intensity at 2 for now
    fillLight.position.set(2, 1, 1);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(ambientLight);


    // const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Globally disabled shadows
    // directionalLight.position.set(0, 400, -100); // Globally disabled shadows
    // directionalLight.castShadow = true;  // Globally disabled shadows
    // directionalLight.shadow.mapSize.width = 300; // Globally disabled shadows
    // directionalLight.shadow.mapSize.height = 300; // Globally disabled shadows
    // directionalLight.shadow.mapSize.width = 1024; // Globally disabled shadows
    // directionalLight.shadow.mapSize.height = 1024; // Globally disabled shadows
    // directionalLight.shadow.camera.near = 0.5; // Globally disabled shadows
    // directionalLight.shadow.camera.far = 500; // Globally disabled shadows
    // directionalLight.shadow.camera.left = -150; // Globally disabled shadows
    // directionalLight.shadow.camera.right = 150; // Globally disabled shadows
    // directionalLight.shadow.camera.top = 150; // Globally disabled shadows
    // directionalLight.shadow.camera.bottom = -150; // Globally disabled shadows
    // directionalLight.shadow.radius = 2; // Globally disabled shadows
    // directionalLight.shadow.bias = -0.0001; // Globally disabled shadows
    // scene.add(directionalLight); // Globally disabled shadows


/// Shaddow debut helper
    //const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
    //scene.add(helper);


      const size = 256;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;

      context.drawImage(heightMapImage.image, 0, 0, size, size);
      const heightData = context.getImageData(0, 0, size, size).data;

      const forestGeometry = new THREE.PlaneGeometry(300, 300, size - 1, size - 1);
      for (let i = 0; i < forestGeometry.attributes.position.count; i++) {
        const x = i % size;
        const y = Math.floor(i / size);
        const height = heightData[(y * size + x) * 4] / 255 * 50;
        forestGeometry.attributes.position.setZ(i, height);
      }
      forestGeometry.computeVertexNormals();

      const forestMaterial = new THREE.MeshStandardMaterial({ map: HeightMapTexture });
      const forest = new THREE.Mesh(forestGeometry, forestMaterial);
      forest.rotation.x = -Math.PI / 2;
      forest.position.y = 0;

      // forest.receiveShadow = true; // Removed
      // forest.castShadow = true; // Removed

      scene.add(forest);

      window.forest = forest;

// Original Water setup commented out
        // Simplified Water
        const simpleWaterGeometry = new THREE.PlaneGeometry(12, 300, 1, 1); // Reduced width from 20 to 12
        const simpleWaterMaterial = new THREE.MeshBasicMaterial({ color: 0x007294, transparent: true, opacity: 0.75 });
        water = new THREE.Mesh(simpleWaterGeometry, simpleWaterMaterial); // Assign to existing global 'water' variable
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.05; // Adjust Y position slightly if needed, original was 0.1
        scene.add(water);

        addGrass();
        addTrees();
        addFishes();


        addCharacter();
        initParticleSystem(); // Initialize particles


        const loader = new GLTFLoader();
        
        loader.load(
            '3Dmodels/rock.glb',
            function(gltf) {
                for (let i = 0; i < 15; i++) {
                    const obstacle = gltf.scene.clone();
                    const side = (i % 2 === 0) ? -1 : 1;
                    obstacle.position.set(side * (5 + Math.random() * 5), 0, -Math.random() * 100);

                    const randomScaleY = Math.random() * (0.4 - 0.1) + 0.1;
                    const randomRotationY = Math.random() * Math.PI * 2;

                    obstacle.scale.set(randomScaleY, randomScaleY, randomScaleY);
                    obstacle.rotation.set(0, randomRotationY, 0);

                    obstacle.position.set(lanePositions[Math.floor(Math.random() * 3)], 0, -10 - i * 10);
                    // obstacle.castShadow = true; // Removed

                    obstacle.traverse(function(node) {
                        if (node.isMesh) {
                            // node.castShadow = true; // Removed
                            // node.receiveShadow = true; // Removed
                            if (node.material) {
                                node.material.shadowSide = THREE.FrontSide;
                            }
                        }
                    });

                    obstacles.push(obstacle);
                    scene.add(obstacle);
                }
            },
            undefined,
            function(error) {
                console.error('An error occurred while loading the model:', error);
            }
        );

        const loader2 = new GLTFLoader();
        
        loader2.load(
            '3Dmodels/gold_nugget.glb',
            function(gltf) {
                for (let i = 0; i < 1; i++) {
                    const nugget = gltf.scene.clone();
                    const side = (i % 2 === 0) ? -1 : 1;
                    nugget.position.set(side * (5 + Math.random() * 5), 0, -Math.random() * 100);

                    const randomScaleY = Math.random() * (15 - 15) + 5;
                    const randomRotationY = Math.random() * Math.PI * 2;

                    nugget.scale.set(randomScaleY, randomScaleY, randomScaleY);
                    nugget.rotation.set(0, randomRotationY, 0);

                    nugget.position.set(lanePositions[Math.floor(Math.random() * 3)], 1, -10 - i * 10);
                    const time = performance.now() * 5;
                    nugget.position.y = 0.1 + Math.sin(time) * 0;
                    const nuggetMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold color
                    nugget.traverse(function (child) {
                        if (child.isMesh) {
                            child.material = nuggetMaterial;
                        }
                    });
                    // nugget.castShadow = true; // Removed

                    nugget.traverse(function(node) {
                        if (node.isMesh) {
                            // node.castShadow = true; // Removed
                            // node.receiveShadow = true; // Removed
                            if (node.material) {
                                node.material.shadowSide = THREE.FrontSide;
                            }
                        }
                    });

                    nuggets.push(nugget);
                    scene.add(nugget);
                }
            },
            undefined,
            function(error) {
                console.error('An error occurred while loading the model:', error);
            }
        );

        document.addEventListener('keydown', onKeyDown);

        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: false });

        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5;

        initSky();

        requestAnimationFrame(animate);
    }

function addCharacter(){
    const loader4 = new GLTFLoader();

    loader4.load(
        '3Dmodels/Lumberjack_on_a_log.glb',
        function (gltf) {
            character = gltf.scene;
            character.scale.set(0.5, 0.5, 0.5);
            originalCharacterScaleY = character.scale.y;
            originalCharacterScaleXZ = character.scale.x; // Assuming X and Z scales are the same

            const box = new THREE.Box3().setFromObject(character);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            characterBaseYOffset = CharacterInitialY - (center.y - size.y / 2) - SUBMERGE_AMOUNT; // Store this value

            character.position.set(0, characterBaseYOffset, 0); // Set initial Y position
            character.rotation.y = Math.PI;
            targetLane = currentLane; // Initialize targetLane

            character.traverse(function (node) { /* ... shadows ... */ });
            scene.add(character);

            // ... rest of your callback logic (camera.lookAt, animations, etc.)
            // If animate() is called right after loading, ensure it's here
            // animate(); // If animate() should only start after character is loaded
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded for Lumberjack_on_a_log.glb');
        },
        function (error) {
            console.error('An error occurred while loading Lumberjack_on_a_log.glb:', error);
        }
    );
}

    function updateCamera() {
        if (!character) return; // Ensure character exists

        const desiredX = character.position.x; // Camera X should align with character X
        const desiredY = character.position.y + 1.5; // Camera Y slightly above character (adjust as needed)
        const desiredZ = character.position.z + 3.0; // Camera Z offset behind the character (adjust as needed)

        camera.position.x = desiredX;
        camera.position.y = desiredY;
        camera.position.z = desiredZ;

        // Make the camera look at a point slightly in front of and above the character's base
        // This helps keep the character centered and provides a good view of the path ahead.
        camera.lookAt(character.position.x, character.position.y + 0.5, character.position.z); 
    }

function animate(currentTime) {
    requestAnimationFrame(animate); // Moved to top as per typical THREE.js examples

    if (isPaused) return;

    const delta = (currentTime - (lastTimeAnimation || currentTime)) / 1000; // seconds, handle first frame
    lastTimeAnimation = currentTime; // Use a new variable for animation's lastTime to avoid conflict

    if (isNaN(delta) || delta <= 0 || delta > 0.2) { // Skip if delta is weird (e.g., tab inactive)
        // For the particle system, we might still want to update with a fixed delta if this frame is skipped for game logic
        if (particleSystemContainer && typeof updateParticles === 'function') { // Check if ready
             updateParticles(1/fps); // Use fixed delta for particles if main frame is skipped
        }
        return;
    }
    
    updateParticles(delta); // Call updateParticles with calculated delta

        const time = performance.now() * 0.001;

    if (character) {
        if (!isJumping) { // Character is bobbing
            if (!isJumping) { character.position.y = characterBaseYOffset + Math.sin(time) * 0.03; } // This if redundant but from original
            // Ensure scale is reset if a jump was interrupted or if there's any doubt.
            if (character.scale.y !== originalCharacterScaleY || character.scale.x !== originalCharacterScaleXZ) {
                character.scale.set(originalCharacterScaleXZ, originalCharacterScaleY, originalCharacterScaleXZ);
            }
        } else { // Character IS jumping
        // JUMP LOGIC START
        if (isJumping) {
            jumpProgress += 1 / JUMP_DURATION; // Assumes JUMP_DURATION is in frames, animate is called per frame
            let currentJumpArcY = 0;

            // Phase 1: Anticipation (Squash) - First 15% of jump duration
            if (jumpProgress < 0.15) {
                character.scale.set(originalCharacterScaleXZ * JUMP_SQUASH_SCALE_XZ, originalCharacterScaleY * JUMP_SQUASH_SCALE_Y, originalCharacterScaleXZ * JUMP_SQUASH_SCALE_XZ);
                character.position.y = characterBaseYOffset; // Stay on ground
            }
            // Phase 2: Upward Stretch - Next 15% (from 15% to 30% of jump duration)
            else if (jumpProgress < 0.30) {
                const stretchProgress = (jumpProgress - 0.15) / (0.30 - 0.15);
                character.scale.set(
                    originalCharacterScaleXZ * (JUMP_SQUASH_SCALE_XZ - (JUMP_SQUASH_SCALE_XZ - 1.0) * stretchProgress), // from SQUASH_XZ to 1.0
                    originalCharacterScaleY * (JUMP_SQUASH_SCALE_Y + (1.2 - JUMP_SQUASH_SCALE_Y) * stretchProgress), // from SQUASH_Y to 1.2
                    originalCharacterScaleXZ * (JUMP_SQUASH_SCALE_XZ - (JUMP_SQUASH_SCALE_XZ - 1.0) * stretchProgress)  // from SQUASH_XZ to 1.0
                );
                // Optional: Slight lift during stretch
                character.position.y = characterBaseYOffset + (JUMP_HEIGHT * 0.05 * stretchProgress); 
            }
            // Phase 3, 4, 5: Airborne, Landing Squash, Reset - Remaining 70% (from 30% to 100%)
            else if (jumpProgress < 1.0) {
                const airTimeProgress = (jumpProgress - 0.30) / (1.0 - 0.30);
                // Parabolic arc for jump height, ensuring it starts from the slight lift if any
                currentJumpArcY = (JUMP_HEIGHT * 0.05) + Math.sin(airTimeProgress * Math.PI) * (JUMP_HEIGHT * 0.95);
                character.position.y = characterBaseYOffset + Math.max(0, currentJumpArcY);

                // Scaling during airtime and landing
                if (jumpProgress < 0.7) { // Airborne, normalizing scale towards original (or slightly stretched)
                    const airScaleProgress = (jumpProgress - 0.30) / (0.7 - 0.30); // Progress within 0.3 to 0.7
                     character.scale.set(
                        originalCharacterScaleXZ * (1.0 + ( (JUMP_SQUASH_SCALE_XZ / 1.1) - 1.0) * (1 - airScaleProgress)), // XZ from 1.0 towards normal
                        originalCharacterScaleY * (1.2 - (1.2 - 1.05) * airScaleProgress), // Y from 1.2 towards 1.05 (slightly stretched)
                        originalCharacterScaleXZ * (1.0 + ( (JUMP_SQUASH_SCALE_XZ / 1.1) - 1.0) * (1 - airScaleProgress))  // XZ from 1.0 towards normal
                    );
                } else { // Landing squash and reset (0.7 to 1.0 of jumpProgress)
                    const landProgress = (jumpProgress - 0.7) / (1.0 - 0.7); 
                    if (landProgress < 0.5) { // Squash on landing (0.7 to 0.85 of jumpProgress)
                        const squashFactor = landProgress / 0.5; // 0 to 1
                        character.scale.set(
                            originalCharacterScaleXZ * (1.0 + (JUMP_SQUASH_SCALE_XZ - 1.0) * squashFactor), // 1.0 to SQUASH_XZ
                            originalCharacterScaleY * (1.0 - (1.0 - JUMP_SQUASH_SCALE_Y) * squashFactor), // 1.0 to SQUASH_Y
                            originalCharacterScaleXZ * (1.0 + (JUMP_SQUASH_SCALE_XZ - 1.0) * squashFactor)  // 1.0 to SQUASH_XZ
                        );
                    } else { // Reset to original scale (0.85 to 1.0 of jumpProgress)
                        const resetFactor = (landProgress - 0.5) / 0.5; // 0 to 1
                        character.scale.set(
                            originalCharacterScaleXZ * (JUMP_SQUASH_SCALE_XZ - (JUMP_SQUASH_SCALE_XZ - originalCharacterScaleXZ) * resetFactor), // SQUASH_XZ to original
                            originalCharacterScaleY * (JUMP_SQUASH_SCALE_Y + (originalCharacterScaleY - JUMP_SQUASH_SCALE_Y) * resetFactor), // SQUASH_Y to original
                            originalCharacterScaleXZ * (JUMP_SQUASH_SCALE_XZ - (JUMP_SQUASH_SCALE_XZ - originalCharacterScaleXZ) * resetFactor)  // SQUASH_XZ to original
                        );
                    }
                }
            }
            // End of jump
            else {
                isJumping = false;
                jumpProgress = 0;
                character.position.y = characterBaseYOffset;
                character.scale.set(originalCharacterScaleXZ, originalCharacterScaleY, originalCharacterScaleXZ);
                // console.log("Jump completed"); // For debugging
                if (character) { // Ensure character exists before accessing its properties
                    emitSplash(new THREE.Vector3(character.position.x, characterBaseYOffset - 0.2, character.position.z), 5 + Math.floor(Math.random() *3));
                }

            }
        } else if (character) { // Ensure character scale is reset if not jumping (e.g., after an interrupted jump)
             if (character.scale.y !== originalCharacterScaleY || character.scale.x !== originalCharacterScaleXZ) {
                 character.scale.set(originalCharacterScaleXZ, originalCharacterScaleY, originalCharacterScaleXZ);
             }
        }
        // JUMP LOGIC END
        }
    }

    if (character) { // A new check for character existence specifically for rotation
        character.rotation.y += (targetCharacterRotationY - character.rotation.y) * rotationSpeed;
        character.rotation.z += (targetCharacterRotationZ - character.rotation.z) * rotationSpeed;

        if (!isTransitioning && currentLane === targetLane) { // Ensure currentLane has matched targetLane
            const defaultRotationY = Math.PI; 
            targetCharacterRotationY = defaultRotationY;
            targetCharacterRotationZ = 0;

            // Snap to default rotation if close enough
            if (Math.abs(character.rotation.y - defaultRotationY) < rotationSpeed * 0.01) { // Using 0.01 as per original
                character.rotation.y = defaultRotationY;
            }
            if (Math.abs(character.rotation.z - 0) < rotationSpeed * 0.01) { // Using 0.01 as per original
                character.rotation.z = 0;
            }
        }
    }

    if (currentTime - lastTime > interval) { // lastTime here is for the fixed interval logic
            lastTime = currentTime - ((currentTime - lastTime) % interval);

            water.position.z += speed;
            if (water.position.z > 10) water.position.z = 0;

            // water.material.uniforms['time'].value += 1.0 / 60.0; // Old logic for THREE.Water
            // water.material.uniforms['size'].value = Math.sin(time) * 5.0 + 10.0; // Old logic


            window.forest.position.z += speed;
           if (window.forest.position.z > 10) window.forest.position.z = 0;



            for (let obstacle of obstacles) {
                obstacle.position.z += speed;
                if (obstacle.position.z > 10) {
                    obstacle.position.z = -100;
                    obstacle.position.x = lanePositions[Math.floor(Math.random() * 3)];
                }
            }

            for (let nugget of nuggets) {
                nugget.position.z += speed;
                if (nugget.position.z > 10) {
                    nugget.position.z = -100;
                    nugget.position.x = lanePositions[Math.floor(Math.random() * 3)];
                }
            }
            for (let tree of trees) {
                tree.position.z += speed;
                if (tree.position.z > 10) {
                    tree.position.z = -100;
                    tree.position.x = (tree.position.x < 0 ? -1 : 1) * (7 + Math.random() * 25);


                }
            }

            for (let grass of grasss) {
                grass.position.z += speed;
                if (grass.position.z > 10) {
                    grass.position.z = -100;
                    grass.position.x = (grass.position.x < 0 ? -1 : 1) * (7 + Math.random() * 25);
                }
            }

            for (let fish of fishes) {
                // Variables for fish jumping animation
                const fishJumpHeight = 2; // Adjust the height of the jump
                const fishJumpDuration = 0.3; // Adjust the duration of the jump
                const fishJumpFrequency = 0.01; // Adjust the frequency of jumping

                fish.position.z += speed;
                fish.userData.jumpTime = (fish.userData.jumpTime || 0) + fishJumpFrequency;

                // Calculate the y position using a sine wave to simulate the jump
                fish.position.y = Math.sin(fish.userData.jumpTime * Math.PI / fishJumpDuration) * fishJumpHeight - 1;

                // Calculate the rotation angle based on jumpTime
                const rotationAngle = Math.sin(fish.userData.jumpTime * Math.PI / fishJumpDuration) * Math.PI;

                // Rotate the fish along the x-axis to simulate flipping
                fish.rotation.x = rotationAngle;

                // Reset the fish position and jump time when it moves past the view
                if (fish.position.z > 10) {
                    fish.position.z = -100;
                    fish.position.x = lanePositions[Math.floor(Math.random() * 3)];
                    fish.userData.jumpTime = 0;
                    fish.rotation.x = 0; // Reset rotation
                    fish.position.y = -1;
                }
            }

            // Animate the grass    Hand a time variable to vertex shader for wind displacement.  
            
            leavesMaterial.uniforms.time.value = clock.getElapsedTime();
            leavesMaterial.uniformsNeedUpdate = true;
            
            updatePoints();
            updateCamera();
            animateWater();

            checkCollisions();
            applyCameraShake();
            scene.fog = new THREE.Fog(0xcccccc, 0, 200);

            renderer.render(scene, camera);

            const Announcement = document.getElementById('Announcement');
            const dashboard = document.getElementById('dashboard');
            const pauseButton = document.getElementById('pauseButton');
            const countdown = document.getElementById('countdown');
            countdown.innerText = 3;

            let countdownValue = 3;
            Announcement.style.display = 'none';

            if(totalPoints == 10){
                togglePause();
                countdown.style.display = 'block';
                dashboard.style.display = 'block';

                const countdownInterval = setInterval(() => {
                    pauseButton.style.display = 'block';
                    countdown.innerText = countdownValue;
                    countdownValue -= 1;
                    if (countdownValue > 0) {
                        countdown.innerText = countdownValue;
                    } else {
                        clearInterval(countdownInterval);
                        countdown.style.display = 'none';
                        togglePause();
                        backgroundAudio.play();
                    }
                }, 1000);
            }
        }
    }

    window.startGame = function() {
        init();
    }

    function togglePause() {
        isPaused = !isPaused;
        if (!isPaused) {
            lastTime = performance.now(); // This lastTime is for the fixed interval game logic
            lastTimeAnimation = performance.now(); // Initialize for smooth delta calculation
            requestAnimationFrame(animate);
            backgroundAudio.play();
            document.getElementById('pauseButton').innerText = "Pause";
            document.getElementById('countdown').style.display = "none";
        } else {
            backgroundAudio.pause();
            document.getElementById('pauseButton').innerText = "Resume";
            if(totalPoints > 50){
                document.getElementById('countdown').style.display = "block";
                document.getElementById('countdown').style.cursor = "pointer";
                document.getElementById('countdown').innerText = "Game Paused";
                document.getElementById('countdown').onclick = togglePause;
            }
        }
    }

    document.getElementById('pauseButton').addEventListener('click', togglePause);
