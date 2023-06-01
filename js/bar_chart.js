import * as THREE from "../modules/three.module.js";
import { OrbitControls } from "../modules/controls/OrbitControls.js";

/*
柱状图功能原理是在地球上加上圆柱对象，颜色和高度分别代表分类和值大小。
*/

var _domID="three-frame";
var _earthOptions={
    imgEarth: '../assets/earth_bg.jpg',//地球贴图
    imgSky: '../assets/starry_sky_bg.jpg',//深空背景
    autorotationSpeed: 0.004,//自转速度（正数自西向东转，负数为逆向）
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
renderer.setSize(800,800);

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

// // // // // // 柱状图的绘制 // // // // // // // //
// 1 创建球的过程参见"ThreeJS制作地球"

// 数据准备
var _columnData=[
    {'x':113,'y':31,'value':10},
    {'x':93,'y':41,'value':40},
    {'x':63,'y':11,'value':30},
    {'x':83,'y':51,'value':20}
];

// 2 创建柱子group，考虑后面会做删除功能，所以把所有的实体都以group组为单位添加，后续方便做删除.
// 标记点组合
var columnGroup = new THREE.Group();

// 3 根据数据，定义柱子颜色
// 获取柱体值对应颜色
var color = '#1bb4b0';//默认色
var columnRadius=1;
var columnScale=0.5;

for (var i = 0; i < _columnData.length; i++){
    // 4 创造柱子对象和材质
    var columnGeom = new THREE.CylinderGeometry(columnRadius, columnRadius, _columnData[i].value * columnScale, 32);
    var columnMaterial = new THREE.MeshBasicMaterial({
        color: color
    });
    var columnMesh = new THREE.Mesh(columnGeom, columnMaterial);

    // 5 设置柱子的坐标位置
    // 获取标记点坐标
    var columnPos = getPosition(_columnData[i].x + 90, _columnData[i].y, _earthOptions.earthBallSize);
    // console.log('columnPos',columnPos);

    // 6 旋转柱子，使柱子都垂直于地球表面
    // 旋转
    var matrix = new THREE.Matrix4();
    matrix.makeRotationX(Math.PI / 2);
    matrix.setPosition(new THREE.Vector3(0, 0, -(_columnData[i].value * columnScale) / 2));
    columnGeom.applyMatrix(matrix);
    let columnC = columnMesh.clone();
    columnC.rotation.z = Math.PI / 2;
    columnMesh.add(columnC);
    columnMesh.position.copy(columnPos);
    columnMesh.lookAt(0, 0, 0);
    columnGroup.add(columnMesh);
}
scene.add(columnGroup);
// console.log('columnGroup',columnGroup);

// // // // // // // // // // // // // // // // // // //

dom.appendChild(renderer.domElement);
render();

// 窗口resize事件
window.onresize = function () {
    // 重新初始化尺寸
    camera.aspect = dom.clientWidth / dom.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(dom.clientWidth, dom.clientHeight)
}

// 工具函数 将经纬度转换成球上坐标
//经纬度转球坐标
function getPosition(_longitude, _latitude, _radius) {
    // _radius=_earthOptions.earthBallSize;
    var lg = THREE.Math.degToRad(_longitude);
    var lt = THREE.Math.degToRad(_latitude);

    // 球面上的极坐标
    var temp = _radius * Math.cos(lt);
    var x = temp * Math.sin(lg);
    var y = _radius * Math.sin(lt);
    var z = temp * Math.cos(lg);
    return {
        x: x,
        y: y,
        z: z
    }
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

