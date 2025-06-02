window.onload = () => {

    // 1. 3D scene creation --------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // get the auto-generated HTML canvas and
  // add it to the webpage
  document.body.appendChild(renderer.domElement);

  // 2. 3D scene initialisation --------------
  // create an instance of our Game class
  // to initialise and manage the game itself
  const gameInstance = new Game(scene, camera);
    

    // 3. update loop function definition and initial call --------
  function animate() {

    requestAnimationFrame(animate);

    // directly call the game instance method to
    // be agnostic of all details
    gameInstance.update();

    renderer.render(scene, camera);
  }
  animate();
}