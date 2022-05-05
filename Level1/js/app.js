const unityInstance = UnityLoader.instantiate("unityContainer", "Build/Level1.json");
let sceneEl;
let arSystem;

let isCameraReady = false;
let isDetectionManagerReady = false;
let gl = null;

window.addEventListener('load', (event) => {
	sceneEl = document.querySelector('a-scene');
	arSystem = sceneEl.systems["mindar-image-system"];
		
	sceneEl.addEventListener("arReady", (event) => {
		console.log("MindAR is ready", event)
		unityInstance.SendMessage("DetectionManager", "arReady");

	});

	sceneEl.addEventListener("arError", (event) => {
		console.log("MindAR failed to start", event)
		unityInstance.SendMessage("DetectionManager", "arError");
	});
});


function cameraReady(){
    isCameraReady = true;
    gl = unityInstance.Module.ctx;
	arSystem.start();
}

function detectionManagerReady(){
    isDetectionManagerReady = true;
}

function createUnityMatrix(el){
    const m = el.matrix.clone();
    const zFlipped = new THREE.Matrix4().makeScale(-1, 1, 1).multiply(m);
    const rotated = zFlipped.multiply(new THREE.Matrix4()/*.makeRotationX(-Math.PI/2)*/);
    return rotated;
}

AFRAME.registerComponent('markercontroller', {
    schema: {
        imageIndex : {type: 'number'}
    },
    tock: function(time, timeDelta){

        let pos = new THREE.Vector3();
        let rot = new THREE.Quaternion();
        let scl = new THREE.Vector3();
		this.el.object3D.matrix.decompose(pos, rot, scl);
		let rotVec = new THREE.Euler();
		rotVec.setFromQuaternion(rot);
		// console.log(pos);
		// console.log(rotVec);
		// console.log(scl);
		
        let position = new THREE.Vector3();
        let rotation = new THREE.Quaternion();
        let scale = new THREE.Vector3();
		
        createUnityMatrix(this.el.object3D).decompose(position, rotation, scale);
		
        const serializedInfos = `${this.data.imageIndex},${this.el.object3D.visible},${position.toArray()},${rotation.toArray()},${scale.toArray()}`;
		
        if(isDetectionManagerReady){
          unityInstance.SendMessage("DetectionManager", "markerInfos", serializedInfos);
        }
    } 
});

AFRAME.registerComponent('cameratransform', {
    tock: function(time, timeDelta){

        let camtr = new THREE.Vector3();
        let camro = new THREE.Quaternion();
        let camsc = new THREE.Vector3();
		
        this.el.object3D.matrix.clone().decompose(camtr, camro, camsc);

        const projection = this.el.components.camera.camera.projectionMatrix.clone();
        const serializedProj = `${[...projection.elements]}`

        const posCam = `${[...camtr.toArray()]}`
        const rotCam = `${[...camro.toArray()]}`
 
        if(isCameraReady){
            unityInstance.SendMessage("Main Camera", "setProjection", serializedProj);
            unityInstance.SendMessage("Main Camera", "setPosition", posCam);
            unityInstance.SendMessage("Main Camera", "setRotation", rotCam);

            let w = window.innerWidth;
            let h = window.innerHeight; 

            const unityCanvas = document.getElementsByTagName('canvas')[0];

            const ratio = unityCanvas.height / h;

            w *= ratio
            h *= ratio

            const size = `${w},${h}`

            unityInstance.SendMessage("Canvas", "setSize", size);
        }

        if(gl != null){
            gl.dontClearOnFrameStart = true;
        }
    } 
});

AFRAME.registerComponent('copycanvas', {
    tick: function(time, timeDelta){
        const unityCanvas = document.getElementsByTagName('canvas')[0];
        unityCanvas.width = this.el.canvas.width
        unityCanvas.height = this.el.canvas.height
    } 
});
