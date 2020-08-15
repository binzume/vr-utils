
AFRAME.registerComponent('position-controls', {
    schema: {
        arrowkeys: { default: "rotation" },
        wasdkeys: { default: "translation" },
        axismove: { default: "translation" },
        speed: { default: 0.1 },
        rotationSpeed: { default: 0.1 }
    },
    init: function () {
        let data = this.data;
        if (data.arrowkeys || data.wasdkeys) {
            let fns = {
                rotation: [
                    (o) => o.rotateY(-data.rotationSpeed),
                    (o) => o.rotateY(data.rotationSpeed),
                    (o) => o.rotateX(-data.rotationSpeed),
                    (o) => o.rotateX(data.rotationSpeed),
                    (o) => o.quaternion.set(0, 0, 0, 1)
                ],
                translation: [
                    (o) => o.translateX(-data.speed),
                    (o) => o.translateX(data.speed),
                    (o) => o.translateZ(data.speed),
                    (o) => o.translateZ(-data.speed),
                    (o) => o.position.set(0, 0, 0)
                ]
            };
            let arrowKeyFns = fns[data.arrowkeys] || [];
            let wasdKeyFns = fns[data.wasdkeys] || [];
            document.addEventListener('keydown', ev => {
                if (document.activeElement != document.body) {
                    return;
                }
                switch (ev.code) {
                    case "ArrowRight":
                        arrowKeyFns[0] && arrowKeyFns[0](this.el.object3D);
                        break;
                    case "ArrowLeft":
                        arrowKeyFns[1] && arrowKeyFns[1](this.el.object3D);
                        break;
                    case "ArrowDown":
                        arrowKeyFns[2] && arrowKeyFns[2](this.el.object3D);
                        break;
                    case "ArrowUp":
                        arrowKeyFns[3] && arrowKeyFns[3](this.el.object3D);
                        break;
                    case "Space":
                        arrowKeyFns[4] && arrowKeyFns[4](this.el.object3D);
                        break;
                    case "KeyA":
                        wasdKeyFns[0] && wasdKeyFns[0](this.el.object3D);
                        break;
                    case "KeyD":
                        wasdKeyFns[1] && wasdKeyFns[1](this.el.object3D);
                        break;
                    case "KeyS":
                        wasdKeyFns[2] && wasdKeyFns[2](this.el.object3D);
                        break;
                    case "KeyW":
                        wasdKeyFns[3] && wasdKeyFns[3](this.el.object3D);
                        break;
                }
            });
        }
        document.addEventListener('wheel', ev => {
            let speedFactor = 0.01;
            var camera = this.el.sceneEl.camera;
            var forward = camera.getWorldDirection(new THREE.Vector3());
            forward.y = 0;
            forward.normalize();
            this.el.object3D.position.add(forward.multiplyScalar(-ev.deltaY * speedFactor));
        });
        this.el.querySelectorAll('[laser-controls]').forEach(el => el.addEventListener('thumbstickmoved', ev => {
            let direction = ev.target.components.raycaster.raycaster.ray.direction;
            if (this.data.axismove == "translation") {
                let rot = Math.atan2(direction.x, direction.z);
                let v = new THREE.Vector3(-ev.detail.x, 0, -ev.detail.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
                this.el.object3D.position.add(v.multiplyScalar(this.data.speed));
            } else if (this.data.axismove == "rotation") {
                this.el.object3D.rotateY(-(ev.detail.x) * this.data.rotationSpeed * 0.1);
            } else {
                let rot = Math.atan2(direction.x, direction.z);
                let v = new THREE.Vector3(0, 0, -ev.detail.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
                this.el.object3D.position.add(v.multiplyScalar(this.data.speed));
                this.el.object3D.rotateY(-ev.detail.x * this.data.rotationSpeed * 0.1);
            }
        }));

        // TODO
        this.changed = [];
        this.el.addEventListener('gripdown', ev => {
            document.querySelectorAll("[xy-drag-control]").forEach(el => {
                this.changed.push([el, Object.assign({}, el.getAttribute('xy-drag-control'))]);
                el.setAttribute("xy-drag-control", { mode: "pull", autoRotate: false });
            });
        });
        this.el.addEventListener('gripup', ev => {
            this.changed.forEach(([el, dragControl]) => {
                el.setAttribute("xy-drag-control", { mode: dragControl.mode, autoRotate: dragControl.autoRotate });
            });
            this.changed = [];
        });
    }
});
