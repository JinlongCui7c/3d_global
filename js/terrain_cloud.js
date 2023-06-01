import * as THREE from "../modules/three.module.js";
import { OrbitControls } from "../modules/controls/OrbitControls.js";


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
// var earthTexture = THREE.ImageUtils.loadTexture(_earthOptions.imgEarth);

// this.renderEarthByRender();

// // // // // // 地形起伏和云层浮动的绘制 // // // // // // // //
/*
    这里我们分别引入三个纹理，
    分别是地球的表面纹理，对应的海拔灰度图，
    和云朵的纹理。
    使用表面纹理还是地球的外貌，海拔灰度图给地球添加凹凸效果，云朵纹理给地球添加云朵效果。
*/

// 绘制几何体，加载贴图
var texture_cloud = new THREE.TextureLoader().load('../assets/cloud.jpg');
var texture_terrain = new THREE.TextureLoader().load('../assets/terrain.jpg');
var texture_global = new THREE.TextureLoader().load(_earthOptions.imgEarth);

// 使用uniform变量
// 这里除了将三张纹理传到着色器中，还传递了一个时间，这个时间来让纹理动起来。
// 云朵的纹理的wrapS和wrapT设置成THREE.RepeatWrapping，这是让纹理简单地重复到无穷大，而不至于[0,0]到[1,1]的范围。
var clock = new THREE.Clock();
var uniforms = {
    time: {
        value: clock.getDelta()*100
    },
    // texture3 是云层的纹理贴图
    texture3: {
        value: texture_cloud
    },
    // texture2 是地形的颜色
    texture2: {
        value: texture_terrain
    },
    // texture1 是地图本身的纹理贴图
    texture1: {
        value: texture_global
    },
};

// 纹理平铺的相关属性
// 纹理的wrapS、wrapT、repeat属性，它们都是用来设置纹理重复的相关属性.

// wrapS
// 纹理在水平方向上纹理包裹方式，在UV映射中对应于U，默认THREE.ClampToEdgeWrapping，
// 表示纹理边缘与网格的边缘贴合。中间部分等比缩放。
// 还可以设置为：THREE.RepeatWrapping(重复平铺) 
// 和 THREE.MirroredRepeatWrapping（先镜像再重复平铺）

// wrapT
// 纹理贴图在垂直方向上的包裹方式，在UV映射中对应于V，默认也是THREE.ClampToEdgeWrapping，
// 与wrapS属性一样也可以设置为：THREE.RepeatWrapping(重复平铺) 
// 和 THREE.MirroredRepeatWrapping（先镜像再重复平铺）

uniforms[ "texture3" ].value.wrapS = THREE.RepeatWrapping;
uniforms[ "texture3" ].value.wrapT = THREE.RepeatWrapping;

// 顶点着色器
// 顶点着色器我们只是用地球的灰度图，这里面是用texture2D( texture2, vUv )来获取图片中每个点的颜色值。
// 新建三维向量newPosition,这个向量代表球体上的点经过灰度贴图操作后新点的位置。
// 由于是灰度图，那么他的r,g,b应该是相同的，并且保证新的顶点坐标是沿着球表面法向量方向，
// 所以 vec3 newPosition = position + normal * tcolor.r / 2.0;

var vertexShader= `
    varying vec2 vUv;
    uniform sampler2D texture2;
    void main() {
        vUv = uv;
        vec4 tcolor = texture2D( texture2, vUv );
        vec3 newPosition = position + normal * tcolor.r / 2.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
    }
`

// 片元着色器
// 片元着色器使用两个纹理，还是顶点着色器传过来的uv以及时间。
// 这里tcolor1就是地图点的颜色，tcolor3代表云朵的纹理，但是他的uv是随时间变化的（这里要求纹理设置重复）。
// 这里还是用了mix方法，mix方法返回线性混合的x和y，如：x*(1−a)+y*a。

var fragmentShader= `
    varying vec2 vUv;
    uniform sampler2D texture1;
    uniform sampler2D texture3;
    uniform float time;
    void main() {
        vec4 tcolor1 = texture2D( texture1, vUv );
        vec4 tcolor3 = texture2D( texture3, vUv - vec2(time, - time * 0.4) );
        gl_FragColor = mix(tcolor1, tcolor3 * 1.3, tcolor3.r / 2.0);
    }
`

var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    // transparent: true
  });


// 创建地球
earthBall = new THREE.Mesh(
    new THREE.SphereGeometry(_earthOptions.earthBallSize, 50, 50), 
    material
    );

earthBall.layers.set(0);
scene.add(earthBall);

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

