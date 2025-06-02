class Game {

    constructor(scene, camera) {
        // initialise variables
        // prepare 3D scene
        this._initializeScene(scene, camera);

        // prepare 3D scene

        // bind event callbacks
        document.addEventListener('keydown', this._keydown.bind(this));
        document.addEventListener('keyup', this._keyup.bind(this));
      }

      update() {
        
        //this.cube.rotation.x += 0.01;
        //this.cube.rotation.y += 0.01;

        // event handling
        // recompute the game state
        this._updateGrid();
        this._checkCollisions();
        this._updateInfoPanel();

      }

      _keydown(event) {
        // check for the key to move the ship accordingly
      }
    
      _keyup() {
        // reset to "idle" mode
      }

      _updateGrid() {
        // "move" the grid backwards so that it
        // feels like we're moving forward
      }

      _checkCollisions() {
        // check obstacles
        // check bonuses
      }

      _updateInfoPanel() {
        // update DOM elements to show the
        // current state of the game
        // (traveled distance, score, lives...)
      }

      _gameOver() {
        // show "end state" UI
        // reset instance variables for a new game
      }
      
      _initializeScene(scene, camera) {
        // prepare the game-specific 3D scene
        // Create a lumberjack body
        /*
        const geometry = new THREE.BoxGeometry(1, 1.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown color

        this.cube = new THREE.Mesh(geometry, material);
        scene.add(this.cube);
        */

        
        // Create a log
        const logGeometry = new THREE.CylinderGeometry(1, 1, 6, 32);
        const logMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown color
        const log = new THREE.Mesh(logGeometry, logMaterial);
        scene.add(log);

        // Create a group for the lumberjack
        const lumberjackGroup = new THREE.Group();

        // Create body parts
        const hatGeometry = new THREE.ConeGeometry(1.5, 2, 32);
        const headGeometry = new THREE.SphereGeometry(1, 32, 32);
        const earGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const neckGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        const bodyGeometry = new THREE.BoxGeometry(2, 3, 1);
        const armsGeometry = new THREE.BoxGeometry(3, 1, 1);
        const beltGeometry = new THREE.TorusGeometry(1.2, 0.3, 16, 100);
        const legsGeometry = new THREE.BoxGeometry(1, 3, 1);

        // Materials
        const hatMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown color
        const skinMaterial = new THREE.MeshBasicMaterial({ color: 0xFCD6B4 }); // Skin color
        const redMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red color
        const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF }); // Blue color
        const beltMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown color

        // Create mesh for each body part
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        const leftEar = new THREE.Mesh(earGeometry, skinMaterial);
        const rightEar = new THREE.Mesh(earGeometry, skinMaterial);
        const neck = new THREE.Mesh(neckGeometry, skinMaterial);
        const body = new THREE.Mesh(bodyGeometry, redMaterial);
        const leftArm = new THREE.Mesh(armsGeometry, redMaterial);
        const rightArm = new THREE.Mesh(armsGeometry, redMaterial);
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        const leftLeg = new THREE.Mesh(legsGeometry, blueMaterial);
        const rightLeg = new THREE.Mesh(legsGeometry, blueMaterial);

        // Positioning the body parts
        hat.position.set(0, 3.5, 0);
        head.position.set(0, 2, 0);
        leftEar.position.set(-0.7, 2, 0);
        rightEar.position.set(0.7, 2, 0);
        neck.position.set(0, 0.5, 0);
        body.position.set(0, -1, 0);
        leftArm.position.set(-2.5, -1, 0);
        rightArm.position.set(2.5, -1, 0);
        belt.position.set(0, -2, 0);
        leftLeg.position.set(-0.5, -4.5, 0);
        rightLeg.position.set(0.5, -4.5, 0);

        // Add body parts to the group
        lumberjackGroup.add(hat);
        lumberjackGroup.add(head);
        lumberjackGroup.add(leftEar);
        lumberjackGroup.add(rightEar);
        lumberjackGroup.add(neck);
        lumberjackGroup.add(body);
        lumberjackGroup.add(leftArm);
        lumberjackGroup.add(rightArm);
        lumberjackGroup.add(belt);
        lumberjackGroup.add(leftLeg);
        lumberjackGroup.add(rightLeg);

        // Scale the group smaller
        const scaleFactor = 0.3; // Adjust as needed
        lumberjackGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
        log.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Add the lumberjack group to the scene
        scene.add(lumberjackGroup);

        // Adjust positions
        log.position.y = -5; // Sit log on the ground

        camera.position.z = 5;
      }


}