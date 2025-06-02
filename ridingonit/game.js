    // Initialize variables
    var camera, scene, renderer;
    var player, obstacles, spheres;
    var playerSpeed = 0.1;
    var obstacleSpeed = 0.05;
    var obstacleSpawnRate = 1000; // milliseconds
    var lastObstacleSpawnTime = 0;
    var isMovingLeft = false;
    var isMovingRight = false;


    // Initialize the game
    function init() {
        // Create the scene       
        scene = new THREE.Scene();
        //scene.background = new THREE.Color(0x00AAFF); // Replace 0xabcdef with your desired color

        // Create the camera
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 6;
        
        // Create the player
            // Load the texture
            const loader = new THREE.TextureLoader();
            const PlayerImageStill = loader.load('media/LumberJackOnLog.png');
            const PlayerImageLeft = loader.load('media/LumberJackOnLogLeft.png');
            const PlayerImageRight = loader.load('media/LumberJackOnLogRight.png');

            const BackgroundRiver = loader.load('media/BG_River.png');
            scene.background = BackgroundRiver;
            
            // Create the material with the texture
            const PlayerStill = new THREE.MeshBasicMaterial({ map: PlayerImageStill, transparent: true });
            const PlayerLeft = new THREE.MeshBasicMaterial({ map: PlayerImageLeft, transparent: true });
            const PlayerRight = new THREE.MeshBasicMaterial({ map: PlayerImageRight, transparent: true });


            // Create the geometry
            const PlayerGeometry = new THREE.BoxGeometry(1, 1.5, 0); // Example for a box

            // Add the mesh to your scene
            player = new THREE.Mesh(PlayerGeometry, PlayerStill);
            playerStraight = new THREE.Mesh(PlayerGeometry, PlayerStill);
            playerLeft = new THREE.Mesh(PlayerGeometry, PlayerLeft);
            playerRight = new THREE.Mesh(PlayerGeometry, PlayerRight);

            player.position.y = -2; // Start player slightly above ground
            scene.add(player);

        
        // Create obstacles group
        obstacles = new THREE.Group();
        spheres = new THREE.Group();

        scene.add(obstacles);
        scene.add(spheres);
        
        // Create the renderer
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        // Event listeners for keyboard input
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        // Start the game loop
        animate();
    }

    function buildSky() {
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    return sky;
    }

    function buildSun() {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sun = new THREE.Vector3();

        // Defining the x, y and z value for our 3D Vector
    const theta = Math.PI * (0.49 - 0.5);
    const phi = 2 * Math.PI * (0.205 - 0.5);
    sun.x = Math.cos(phi);
    sun.y = Math.sin(phi) * Math.sin(theta);
    sun.z = Math.sin(phi) * Math.cos(theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    scene.environment = pmremGenerator.fromScene(sky).texture;
    return sun;
    }

    function buildWater() {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(
        waterGeometry,
        {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('', function ( texture ) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        alpha: 1.0,
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
        }
    );
    water.rotation.x =- Math.PI / 2;
    scene.add(water);
    
    const waterUniforms = water.material.uniforms;
    return water;
    }


    // Handle keyboard input
    function onKeyDown(event) {
        if ((event.key === 'a')||(event.key === 'ArrowLeft')) {
            isMovingLeft = true;
            scene.remove(player)
            playerLeft.position.copy(player.position);
            playerLeft.rotation.copy(player.rotation);
            playerLeft.scale.copy(player.scale);
            scene.add(playerLeft);
            player=playerLeft;
        } else if ((event.key === 'd')||(event.key === 'ArrowRight')) {
            isMovingRight = true;
            scene.remove(player)
            playerRight.position.copy(player.position);
            playerRight.rotation.copy(player.rotation);
            playerRight.scale.copy(player.scale);
            scene.add(playerRight);
            player=playerRight;
        } else if ((event.key === 'w')||(event.key === 'ArrowUp')) {
            playerSpeed = 0.1;
            obstacleSpeed = 0.1;
        }
        else if ((event.key === 's')||(event.key === 'ArrowDown')) {
            playerSpeed = 0.1;
            obstacleSpeed = 0.03;
        }
    }

    function onKeyUp(event) {
        if ((event.key === 'a')||(event.key === 'ArrowLeft')) {
            isMovingLeft = false;
            scene.remove(player)
            playerStraight.position.copy(player.position);
            playerStraight.rotation.copy(player.rotation);
            playerStraight.scale.copy(player.scale);
            scene.add(playerStraight);
            player=playerStraight;

        } else if ((event.key === 'd')||(event.key === 'ArrowRight')) {
            isMovingRight = false;
            scene.remove(player)
            playerStraight.position.copy(player.position);
            playerStraight.rotation.copy(player.rotation);
            playerStraight.scale.copy(player.scale);
            scene.add(playerStraight);
            player=playerStraight;

        } else if ((event.key === 'w')||(event.key === 'ArrowUp')) {
            playerSpeed = 0.1;
            obstacleSpeed = 0.05;
        } else if ((event.key === 's')||(event.key === 'ArrowDown')) {
            playerSpeed = 0.1;
            obstacleSpeed = 0.05;
        }
    }

    // Game loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Move player left or right
        if (isMovingLeft) {
            player.position.x -= playerSpeed;

        } else if (isMovingRight) {
            player.position.x += playerSpeed;
        }
        
        // Spawn obstacles periodically
        var currentTime = Date.now();
        if (currentTime - lastObstacleSpawnTime > obstacleSpawnRate) {
            // spawnObstacle();
            spanRocksObstacle();
            lastObstacleSpawnTime = currentTime;
        }

        
        // Move obstacles downwards
        obstacles.children.forEach(function(obstacle) {
            obstacle.position.y -= obstacleSpeed;
            
            // Check for collision with player
            if (player.position.distanceTo(obstacle.position) < 1) {
                gameOver();
            }
        });
        
        this.update = function() {
        // Animates our water
        water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

        }

        spheres.children.forEach(function(sphere) {
            sphere.position.y -= obstacleSpeed;
            
            // Check for collision with player
            if (player.position.distanceTo(sphere.position) < 1) {
                gameOver();
            }
        });
        // Render the scene
        renderer.render(scene, camera);
    }

    // Spawn an obstacle
    function spawnObstacle() {
        var obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
        var obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x006938 });
        var obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        obstacle.position.x = Math.random() * 6 - 3; // Random x position
        obstacle.position.y = 5; // Start obstacles above the screen
        obstacles.add(obstacle);
    }

    function spanRocksObstacle() {
        // Create a sphere geometry

            // Load the texture
            const loader = new THREE.TextureLoader();
            const texture = loader.load('media/Rock.png');

            // Create the material with the texture
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

            // Create the geometry
            const geometry = new THREE.BoxGeometry(5, 5, 0); // Example for a box

            // Add the mesh to your scene
            sphere = new THREE.Mesh(geometry, material);

        //var sphereGeometry = new THREE.SphereGeometry(1, 32, 32); // Radius, width segments, height segments
        //var sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA }); // gray color
        //var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        // Calculate the range for the middle 50% of the screen
        sphere.scale.set(0.2, 0.2, 0.2);


        var minX = -window.innerWidth / 6; // 16.7% from the left
        var maxX = window.innerWidth / 6; // 16.7% from the right


        sphere.position.x = Math.random() * 10 - 3; // Random x position
        //sphere.position.x = Math.random() * (maxX - minX) + minX;


        sphere.position.y = 10; // Start obstacles above the screen
        spheres.add(sphere);
    }

    

    // Game over
    function gameOver() {
        alert('Game over!');
        init();
        window.location.reload(); // Reload the page

    }

    // Start the game
    init();
