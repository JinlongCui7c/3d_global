import * as THREE from "../modules/three.module.js";
import { OrbitControls } from "../modules/controls/OrbitControls.js";
import { MeshLine, MeshLineMaterial } from "../modules/THREE.MeshLine.js";

/*
# 说明
迁徙图参考了网上大大们的方法做的，但是效果不太理想，
迁徙飞行效果原理是生成50个小球循环飞，数据量一大有点卡，需要优化。

*/

var _domID="three-frame";
var _earthOptions={
    imgEarth: '../assets/earth_bg.jpg',//地球贴图
    imgSky: '../assets/starry_sky_bg.jpg',//深空背景
    autorotationSpeed: 0.002,//自转速度（正数自西向东转，负数为逆向）
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
renderer.setSize(900,900);
// console.log(dom.clientWidth, dom.clientHeight);

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

// // // // // // 进行迁徙线的绘制 // // // // // // // 
// 数据的准备
var _flyData=[
    [[113.544,22.648],[73.544,25.648]],
    [[98.544,25.648],[126.544,20.648]],
    [[116.544,39.648],[44.544,35.648]],
    [[106.544,69.648],[54.544,47.648]],
];

// 1 创建地球
// 2 创建点位group，考虑后面会做删除功能，所以把所有的实体都以group组为单位添加，后续方便做删除.
// 标记点组合
var marking = new THREE.Group();

// 1 根据数据，在地球上添加飞出、飞入的点位，并且绘制贝塞尔曲线
var groupLines = new THREE.Group();
var animateDots=[];

for (var i = 0; i < _flyData.length; i++) {
    var ballPosFrom, ballPosTo;

    // 创建标记点球体 起点
    var ballFrom = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 30, 30),
        new THREE.MeshBasicMaterial({
            color: '#1bb4b0'//'#1bb4b0'
    }));
    
    // 获取标记点坐标 起点
    ballPosFrom = getPosition(_flyData[i][0][0]+90, _flyData[i][0][1], 30);
    ballFrom.position.set(ballPosFrom.x, ballPosFrom.y, ballPosFrom.z);
    marking.add(ballFrom);

    // 创建标记点球体 终点 
    var ballTo = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 30, 30), 
        new THREE.MeshBasicMaterial({
            color: '#1bb4b0'//'#1bb4b0'
    }));

    // 获取标记点坐标 终点 
    ballPosTo = getPosition(_flyData[i][1][0]+90,_flyData[i][1][1], 30);
    ballTo.position.set(ballPosTo.x, ballPosTo.y, ballPosTo.z);
    marking.add(ballTo);

    // 添加飞线
    //迁徙方向，第一个参数是起始方向
    var line = addLine(ballFrom.position, ballTo.position);
    groupLines.add(line.lineMesh);
    animateDots.push(line.curve.getPoints(150));
}

scene.add(marking);
scene.add(groupLines);

// 4 工具函数 将经纬度转换成球上坐标
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

// 5 工具函数 绘制贝塞尔曲线
function animationLine() {
    aGroup.children.forEach(function (elem, index) {
        var _index = parseInt(index / 50);
        var index2 = index - 50 * _index;
        var _vIndex = 0;
        if (firstBool) {
            _vIndex = vIndex - index2 % 50 >= 0 ? vIndex - index2 % 50 : 0;
        } else {
            _vIndex = vIndex - index2 % 50 >= 0 ? vIndex - index2 % 50 : 150 + vIndex - index2;
        }
        var v = animateDots[_index][_vIndex];
        elem.position.set(v.x, v.y, v.z);
    })

    vIndex++;
    if (vIndex > 150) {
        vIndex = 0;
    }

    if (vIndex == 150 && firstBool) {
        firstBool = false;
    }

    requestAnimationFrame(animationLine);
}

// 计算球体上两个点的中点
function getVCenter(v1, v2) {
    var v = v1.add(v2);
    return v.divideScalar(2);
}

// 计算球体两点向量固定长度的点
function getLenVcetor(v1, v2, len) {
    var v1v2Len = v1.distanceTo(v2);
    return v1.lerp(v2, len / v1v2Len);
}

// 添加轨迹函数
function addLine(v0, v3) {
    var angleRate = 0.5;
    var angle = (v0.angleTo(v3) * 180) / Math.PI;
    var aLen = angle * angleRate * (1 - angle / (Math.PI * 90));
    var hLen = angle * angle * 1.2 * (1 - angle / (Math.PI * 90));
    var p0 = new THREE.Vector3(0, 0, 0);

    // 法线向量
    var rayLine = new THREE.Ray(p0, getVCenter(v0.clone(), v3.clone()));
    // 顶点坐标
    var vtop = rayLine.at(hLen / rayLine.at(1).distanceTo(p0));
    // 控制点坐标
    var v1 = getLenVcetor(v0.clone(), vtop, aLen);
    var v2 = getLenVcetor(v3.clone(), vtop, aLen);

    // 绘制贝塞尔曲线
    var curve = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
    var geometry = new THREE.BufferGeometry();
    geometry.vertices = curve.getPoints(100);
    var line = new MeshLine();
    line.setGeometry(geometry);

    var material = new MeshLineMaterial({
        color: '#1bb4b0',
        lineWidth: 0.8,
        transparent: true,
        opacity: 1
    })

    return {
        curve: curve,
        lineMesh: new THREE.Mesh(line.geometry, material)
    }
}

// 6 构造循环动画的小球
// 线上滑动的小球
var aGroup = new THREE.Group();
for (var i = 0; i < animateDots.length; i++) {
    for (var j = 0; j < 50; j++) {
            var aGeo = new THREE.SphereGeometry(0.2, 10, 10);
            var aMaterial = new THREE.MeshBasicMaterial({
                color: '#F5F5F5',
                transparent: true,
                opacity: 1 - j * 0.02
        })
        var aMesh = new THREE.Mesh(aGeo, aMaterial);
        aGroup.add(aMesh);
    }
}

// // // // // // // // // // // // // 

// 将当前的画布或者说渲染器对象添加到目标的dom中
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

