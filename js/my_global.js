import * as THREE from "../modules/three.module.js";
import { OrbitControls } from "../modules/controls/OrbitControls.js";

var _domID="three-frame";

var _earthOptions={
    imgEarth: '../assets/earth_bg.jpg',//地球贴图
    imgSky: '../assets/starry_sky_bg.jpg',//深空背景
    autorotationSpeed: 0.005,//自转速度（正数自西向东转，负数为逆向）
    cameraZ: 200,//摄像头高度,
    earthBallSize: 30//地球大小
    };


var scene, renderer, camera, orbitcontrols;
var earthBall;//地球实体
var dom, handle;//容器,定时器动画句柄

/**
* 初始化地球，对象创建时自动调用
*/

//获取地球容器
dom = document.getElementById(_domID);
var _imgSky = _earthOptions.imgSky ? _earthOptions.imgSky : "";
dom.style.background = "url(" + _imgSky + ") no-repeat center center";
dom.style.backgroundColor = "#00000000";
// console.log(dom)

// 初始化场景
scene = new THREE.Scene();
// 初始化相机
camera = new THREE.PerspectiveCamera(20, dom.clientWidth / dom.clientHeight, 1, 100000);
// 设置相机位置
camera.position.set(0, 0, _earthOptions.cameraZ ? _earthOptions.cameraZ : 200);

renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});

renderer.autoClear = false;
// 设置窗口尺寸
renderer.setSize(500,500);
console.log(dom.clientWidth, dom.clientHeight);

// 初始化控制器
orbitcontrols = new OrbitControls(camera, renderer.domElement);

// 使动画循环使用时阻尼或自转 意思是否有惯性
orbitcontrols.enableDamping = true;

//动态阻尼系数 就是鼠标拖拽旋转灵敏度
orbitcontrols.dampingFactor = 0.9;

// 设置光线
scene.add(new THREE.HemisphereLight('#ffffff', '#ffffff', 1));

// 定义地球材质
var earthTexture = THREE.ImageUtils.loadTexture(_earthOptions.imgEarth);
// 创建地球
earthBall = new THREE.Mesh(
    new THREE.SphereGeometry(_earthOptions.earthBallSize, 50, 50), 
    new THREE.MeshBasicMaterial({
        map: earthTexture
}));

earthBall.layers.set(0);
scene.add(earthBall);
// this.renderEarthByRender();

dom.appendChild(renderer.domElement);

render();

// 窗口resize事件
window.onresize = function () {
    // 重新初始化尺寸
    camera.aspect = dom.clientWidth / dom.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(dom.clientWidth, dom.clientHeight)
}


// 执行函数
function render() {
    if (handle) {
        cancelAnimationFrame(handle);
    }
    renderer.clearDepth();
    //自转
    scene.rotation.y += _earthOptions.autorotationSpeed ? _earthOptions.autorotationSpeed : 0;
    renderer.render(scene, camera);
    orbitcontrols.update();
    handle = requestAnimationFrame(render);
}

