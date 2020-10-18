

AFRAME.registerComponent('hand-controller', {
    schema: {
        color: { default: '#00ff00' }
    },
    init() {
        this.hands = {};
        this.physics = null;
        this._tmpQ0 = new THREE.Quaternion();
        this._tmpV0 = new THREE.Vector3();
        this._tmpV1 = new THREE.Vector3();
        if (this.el.sceneEl.systems.webxr) {
            this.el.sceneEl.setAttribute('webxr', 'optionalFeatures:bounded-floor,hand-tracking');
            let hand0 = this.el.sceneEl.renderer.xr.getHand(0);
            hand0.addEventListener('connected', ev => this._handConnected(hand0, ev, 'leftHand'));
            hand0.addEventListener('disconnected', ev => this._handDisconnected(hand0, ev, 'leftHand'));
            let hand1 = this.el.sceneEl.renderer.xr.getHand(1);
            hand1.addEventListener('connected', ev => this._handConnected(hand1, ev, 'rightHand'));
            hand1.addEventListener('disconnected', ev => this._handDisconnected(hand1, ev, 'rightHand'));
        }
    },
    tick() {
        let hands = Object.values(this.hands);
        if (hands.length == 0) {
            this.pause();
        }
        hands.forEach(hand => {
            hand.binds.forEach(([node, obj, body]) => {
                if (body) {
                    body.position.copy(node.getWorldPosition(this._tmpV0));
                    body.quaternion.copy(node.getWorldQuaternion(this._tmpQ0));
                }
            });
            hand.fingerLen = hand.fingers.map(n => {
                let len = 0;
                for (let i = n - 3; i < n; i++) {
                    len += this._tmpV0.copy(hand.hand.joints[i + 1].position).sub(hand.hand.joints[i].position).length();
                }
                return len;
            });
            let dd = hand.fingers.map((n, i) => { // 4
                let tip = hand.hand.joints[n];
                let root = hand.hand.joints[n - 3];
                let tipPos = tip.getWorldPosition(this._tmpV0);
                let rootPos = root.getWorldPosition(this._tmpV1);
                if (hand.fingerLen[i] > 0.01) {
                    let r = tipPos.sub(rootPos).length() / hand.fingerLen[i];
                    if (r < 0.6 || r > 0.9) {
                        return r < 0.6;
                    }
                }
                return undefined;
            });
            hand.fingerState = dd;
            let open = dd[0] == false && dd[1] == false && dd[2] == false && dd[3] == false && dd[4] == false;
            if (!hand.open && open) {
                let el = document.getElementById(hand.name);
                if (el) {
                    el.setAttribute('raycaster', 'far', 0.04);
                }
            }
            hand.open = open;
            let pointing = dd[1] == false && dd[2] == true && dd[3] == true && dd[4] == true;
            if (!hand.pointing && pointing) {
                hand.pointing = pointing;
                let el = document.getElementById(hand.name);
                if (el) {
                    el.setAttribute('raycaster', 'far', Infinity);
                }
            }
            hand.pointing = pointing;
        });
    },
    remove() {
        let names = Object.keys(this.hands);
        names.forEach(name => {
            this.el.removeObject3D(name);
        });
    },
    _handConnected(hand, ev, name) {
        if (!ev.data.hand || this.hands[name]) {
            return;
        }
        if (globalThis.CANNON && this.el.sceneEl.systems.physics && this.el.sceneEl.systems.physics.driver) {
            this.physics = { driver: this.el.sceneEl.systems.physics.driver };
        }
        console.log("hand", hand, ev);
        let geometry = new THREE.BoxGeometry(1, 1, 1);
        let material = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.data.color) });
        material.transparent = true;
        material.opacity = 0.4;

        this.el.setObject3D(name, hand);
        let handData = { hand: hand, name: name, binds: [], fingers: [4, 9, 14, 19, 24] };
        this.hands[name] = handData;
        for (let joint of hand.joints) {
            let cube = new THREE.Mesh(geometry, material);
            let scale = Math.min(joint.jointRadius || 0.015, 0.05);
            cube.scale.set(scale, scale, scale);
            joint.add(cube);
            let body = null;
            if (this.physics) {
                body = new CANNON.Body({
                    mass: 0,
                    collisionFilterGroup: 4,
                    collisionFilterMask: ~4
                });
                body.addShape(new CANNON.Sphere(scale * 0.5));
                this.physics.driver.addBody(body);
            }
            handData.binds.push([joint, cube, body]);
        }
        this.play();

        for (let controllerEl of this.el.sceneEl.querySelectorAll('[generic-tracked-controller-controls]')) {
            controllerEl.setAttribute('generic-tracked-controller-controls', { defaultModel: false });
            if (this.physics) {
                controllerEl.removeAttribute('static-body');
            }
            console.log(controllerEl);
        }
    },
    _handDisconnected(hand, ev, name) {
        this.el.removeObject3D(name);
        if (this.hands[name]) {
            this.hands[name].binds.forEach(([node, obj, body]) => {
                obj.parent.remove(obj);
                if (body) {
                    this.physics.driver.removeBody(body);
                }
            });
            delete this.hands[name];
        }
    }
});
