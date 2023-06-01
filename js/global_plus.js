import * as THREE from "../modules/three.module.js";
// import * as d3 from "../node_modules/d3/src/index.js"
import * as d3 from 'https://unpkg.com/d3?module'
import { OrbitControls } from "../modules/controls/OrbitControls.js";
import { InitFlyLine } from "./flyLine.js";
import { MeshLine, MeshLineMaterial } from "../modules/THREE.MeshLine.js";
import pointArr from "../assets/world.js";

let flyManager = new InitFlyLine({
    texture: "../assets/point.png",
  });

// *************************** 阶段1 场景的初始化准备 **********************************************
let renderer, camera, scene, light, controls;
const Dom = document.getElementById( 'three-frame' );
const width = Dom.clientWidth;
const height = Dom.clientHeight;
// 创建组
const group = new THREE.Group()
const groupHalo = new THREE.Group()

// 星空
let stars
// 月球
let moonPoints

// 光圈的集合
var WaveMeshArr=[]

const clock = new THREE.Clock();
var _earthOptions={
        imgEarth: '../assets/earth_bg.jpg',//地球贴图
        imgSky: '../assets/starry_sky_bg.jpg',//深空背景
        autorotationSpeed: 0.001,//自转速度（正数自西向东转，负数为逆向）
        cameraZ: 200,//摄像头高度,
        earthBallSize: 30//地球大小
    };

/**
 * @description 初始 化渲染场景
 */
function initRenderer() {
    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( width, height );
    const containerDom = Dom;
    containerDom.appendChild( renderer.domElement );
}

/**
 * @description 初始化相机
 */
function initCamera() {
    camera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 );
    camera.position.set( 5, - 20, 200 );
    camera.lookAt( 0, 3, 0 );
    window.camera = camera;
}

/**
 * @description 初始化场景
 */
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x020924 );
    scene.fog = new THREE.Fog( 0x020924, 200, 1000 );
    window.scene = scene;
}

/**
 * 初始化用户交互
 **/
function initControls() {
    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 2;
    controls.enablePan = true;
}

/**
 * @description 初始化光
 */
function initLight() {
    // 环境光1
    const ambientLight = new THREE.AmbientLight( 0xcccccc, 1.1 );
    scene.add( ambientLight );

    // 平行光 1 2
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.2 );
    directionalLight.position.set( 1, 0.1, 0 ).normalize();
    var directionalLight2 = new THREE.DirectionalLight( 0xff2ffff, 0.2 );
    directionalLight2.position.set( 1, 0.1, 0.1 ).normalize();
    scene.add( directionalLight );
    scene.add( directionalLight2 );

    // 半球光 1
    var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 0.2 );
    hemiLight.position.set( 0, 1, 0 );
    scene.add( hemiLight );

    // 制造阴影的平行光
    // 阴影的形成也就是因为比周围获得的光照更少。因此，要形成阴影，光源必不可少。
    // 在 Three.js 中，能形成阴影的光源只有平行光 THREE.DirectionalLight 与聚光灯 THREE.SpotLight ；
    // 而相对地，能表现阴影效果的材质只有 THREE.LambertMaterial 与 THREE.PhongMaterial 。
    var directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 1, 500, - 20 );
    // 然后，对于光源以及所有要产生阴影的物体调用：
    // 对于平行光，需要设置 shadowCameraNear 、 shadowCameraFar 、 shadowCameraLeft 、shadowCameraRight 、 shadowCameraTop 以及 shadowCameraBottom 六个值，
    // 相当于正交投影照相机的六个面。同样，只有在这六个面围成的长方体内的物体才会产生阴影效果。
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 18;
    directionalLight.shadow.camera.bottom = - 10;
    directionalLight.shadow.camera.left = - 52;
    directionalLight.shadow.camera.right = 12;
    scene.add(directionalLight);
}

/**
 * 窗口变动
 **/
function onWindowResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( innerWidth, innerHeight );
    renders();
}

/**
 * @description 渲染
 */
function renders() {
    renderer.clear();
    renderer.render( scene, camera );
}

/**
 * 更新
 **/
function animate() {
    window.requestAnimationFrame( () => {
        if (controls) controls.update();

        //地球的自转
        group.rotation.y += _earthOptions.autorotationSpeed ? _earthOptions.autorotationSpeed : 0;
        
        // 星空的旋转变换
        stars.rotation.x += _earthOptions.autorotationSpeed ? _earthOptions.autorotationSpeed/40 : 0;
        stars.rotation.z += _earthOptions.autorotationSpeed ? _earthOptions.autorotationSpeed/45 : 0;
        
        // 月球绕地球的旋转
        var elapsed = clock.getElapsedTime();
        let moon_r=_earthOptions.earthBallSize+20;
        moonPoints.position.set(Math.sin(elapsed) * moon_r, 0, Math.cos(elapsed) * moon_r);
        
        // 城市动态光环
        cityWaveAnimate();

        //飞线更新，这句话一定要有
        if (flyManager != null) {
            flyManager.animation();
        }

        // 地图边界炫光
        mapLineRender();

        renders();
        animate();
    } );
}

initRenderer();
initCamera();
initScene();
initLight();
initControls();
animate();
window.addEventListener('resize', onWindowResize, false);


// *************************** 阶段2 动态星空背景 **********************************************
// 作为地球的背景，用动态星空的方式显得更加酷炫，使用原型贴图让原本方形的点模拟球形，
// 再加上动态设置颜色以及设置旋转偏移，更好的模拟星空效果。
function Dynamic_starry_sky(){
    // 随机生成10000个坐标点，设置不同的颜色
    const positions = [];
    const colors = [];

    //  BufferGeometry
    // 使用 BufferGeometry 可以有效减少向 GPU 传输几何体相关数据所需的开销
    // 可以自定义顶点位置, 面片索引, 法向量, 颜色值
    // 使用流程：
    /**
     * 1 创建所有点的位置数组, 每三个值形成x, y, z确定三维世界点的坐标
     * 2 创建所有点的颜色数组, 每三个值形成r, g, b确定三维世界点的颜色
     * 3 将位置数组和颜色数组导入到集合体中
     * */ 

    const geometry = new THREE.BufferGeometry();

    // 分别把生成的Vector3和Color放入数组，然后添加到geometry中，这样星空几何体有了。
    // Color里面setHSL可以设置颜色和饱和度，这里通过random来随机颜色。
    for (var i = 0; i < 10000; i ++) {
        var vertex = new THREE.Vector3();
        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        positions.push( vertex.x, vertex.y, vertex.z );
        var color = new THREE.Color();
        color.setHSL( Math.random() * 0.2 + 0.5, 0.55, Math.random() * 0.25 + 0.55 );
        colors.push( color.r, color.g, color.b );
    }
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );


    // 使用 ParticleBasicMaterial 生成材质
    // ParticleBasicMaterial 基础粒子材质用来搭配例子系统，
    // 这里我们可以设置粒子的大小，贴图，透明度等设置详细如下：
    var starsMaterial = new THREE.ParticleBasicMaterial( {
        size: 1,
        transparent: true,
        opacity: 1,
        vertexColors: true, //true：且该几何体的colors属性有值，则该粒子会舍弃第一个属性--color，而应用该几何体的colors属性的颜色
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    } );

    // 使用 ParticleSystem 生成模型
    // 这里使用ParticleSystem这个粒子系统，是为了提供性能，
    // 如果用精灵Particle动态随机生成10000个的话，帧率肯定收到影响，这里ParticleSystem的话，等于只有一个Mesh，能大大提高性能。
    // 把上面生成的几何体geometry 以及材质ParticleBasicMaterial来生成一个ParticleSystem，如下：
    stars = new THREE.ParticleSystem( geometry, starsMaterial );
    stars.scale.set( 300, 300, 300 );
    scene.add(stars);
}
Dynamic_starry_sky()

// 用于简单模拟3个坐标轴的对象，红色代表 X 轴. 绿色代表 Y 轴. 蓝色代表 Z 轴。
const axesHelper = new THREE.AxesHelper( 50 );
// scene.add( axesHelper );

// *************************** 阶段3 加载地球模型+大气层光圈 **********************************************
function initEarth() {
    // 定义地球材质
    var earthTexture = THREE.ImageUtils.loadTexture(_earthOptions.imgEarth);
    // 创建地球
    var earthBall = new THREE.Mesh(
        new THREE.SphereGeometry(_earthOptions.earthBallSize, 50, 50), 
        new THREE.MeshBasicMaterial({
            map: earthTexture
    }));
    // group.rotation.set( 0.5, 2.9, 0.1 );
    group.add(earthBall);
    scene.add( group );

    // 大气层光圈这里也是用贴图实现
    var texture = THREE.ImageUtils.loadTexture( '../assets/earth_aperture.png' );
    var spriteMaterial = new THREE.SpriteMaterial( {
        map: texture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    } );
    /**
     * 什么是精灵(Sprite)
     * 按照Three.js官网的解释是：精灵是一个总是面朝着摄像机的平面，通常含有使用一个半透明的纹理。
     * 精灵不会投射任何阴影，即使设置了也将不会有任何效果。
    */
    // THREE.Sprite与THREE.Mesh一样，都是THREE.Object3D的子类，
    // 所以说，THREE.Sprite可以使用THREE.Mesh所能使用的大部分属性，你可以用来定义其位置、缩放 等属性。
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set( _earthOptions.earthBallSize * 3, _earthOptions.earthBallSize * 3, 1 );
    group.add( sprite );
  }
initEarth()
  

// *************************** 阶段4 卫星环绕特效 **********************************************
// 这里用到一个 Mesh 和一个 Poinst 结合，分别用来实现外圈的环形和两个小卫星
function orbit(){
    // 光环用 PlaneGeometry 矩形平面即可，加上贴图
    var texture = THREE.ImageUtils.loadTexture( '../assets/halo.png' );
    var geometry = new THREE.PlaneGeometry( 100, 100 );
    var material = new THREE.MeshLambertMaterial( {
        map: texture, 
        transparent: true,
        side: THREE.DoubleSide, 
        depthWrite: false
    } );
    var mesh = new THREE.Mesh( geometry, material );
    groupHalo.add( mesh );
    groupHalo.rotation.x=THREE.MathUtils.degToRad(90)
    scene.add(groupHalo);

    // 月球对象
    const moonGeometry = new THREE.SphereGeometry(3, 30, 30);
    const moonMaterial = new THREE.MeshPhongMaterial({
        // map: textureLoader.load("./imgs/moon.jpg"),
    });
    moonPoints = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moonPoints);
}
orbit()


// *************************** 方法定义 经纬度转标转成3D空间坐标 **********************************************
// 要定义地球上的一点，用经纬度是常用的办法，但是经纬度又不适合在Threejs上面使用，
// 所以这里就需要先做一步转换工作，把经纬度坐标转换成xyz空间坐标。

function lglt2xyz(lng, lat) {
    const phi = (180 + lng) * (Math.PI / 180)
    const theta = (90 - lat) * (Math.PI / 180)
    const radius=_earthOptions.earthBallSize
    return {
      x: -radius * Math.sin(theta) * Math.cos(phi),
      y: radius * Math.cos(theta),
      z: radius * Math.sin(theta) * Math.sin(phi),
    }
  }

// *************************** 阶段5 点位的标注以及扩散光圈 **********************************************
// 要实现标注功能很简单，直接一个平面加贴图即可
// 这里唯一要注意的就是，再球面上的物体，需要设置好角度，不然你会发现效果会和你预想的不一样
function createPointMesh(pos) {
    var pointmaterial = new THREE.MeshBasicMaterial( {
        color:0xffc300,
        map: THREE.ImageUtils.loadTexture( '../assets/point.png' ),
        transparent: true, //使用背景透明的png贴图，注意开启透明计算
        depthWrite: false, //禁止写入深度缓冲区数据
    } );
    var wave_material = new THREE.MeshBasicMaterial( {
        map: THREE.ImageUtils.loadTexture( '../assets/wave.png' ),
        transparent: true, //使用背景透明的png贴图，注意开启透明计算
        depthWrite: false, //禁止写入深度缓冲区数据
        opacity: 1.0,//透明度，结合transparent使用，范围为0~1
    } );

    // 点位的标志
    var cityGeometry = new THREE.PlaneGeometry(1, 1); //默认在XOY平面上
    var mesh = new THREE.Mesh( cityGeometry, pointmaterial );
    //矩形平面Mesh的尺寸
    var size = _earthOptions.earthBallSize * 0.04;
    //设置mesh大小
    mesh.scale.set( size, size, size );
    // 设置mesh位置
    mesh.position.set( pos.x, pos.y, pos.z );

    /**
     * hree.js的贴图默认贴在xoy平面，即使开了双面可见，视线总有看不见的（贴图是二维平面，而不是三维的）。
     * 解决办法：保证贴图与球面要进行贴图的某点相切，这样各个视角就看得见了.
     * 1 计算该点与球心构成法向量，并进行归一化；
     * 2 因为three.js的贴图默认贴在xoy平面，所以要贴的图法向量取(0, 0, 1)
     * 3 利用three封装好的四元数库，计算从向量vFrom到vTo所需的四元数，然后改变贴图的状态。
    */
    // mesh在球面上的法线方向(球心和球面坐标构成的方向向量)
    var coordVec3 = new THREE.Vector3( pos.x, pos.y, pos.z ).normalize();
    // mesh默认在XOY平面上，法线方向沿着z轴new THREE.Vector3(0, 0, 1)
    var meshNormal = new THREE.Vector3( 0, 0, 1 );
    // 四元数属性.quaternion表示mesh的角度状态
    //.setFromUnitVectors();计算两个向量之间构成的四元数值
    mesh.quaternion.setFromUnitVectors( meshNormal, coordVec3 );

    // 光圈
    var waveGeometry = new THREE.PlaneGeometry(1, 1); //默认在XOY平面上
    var mesh_2 = new THREE.Mesh( waveGeometry, wave_material );
    //矩形平面Mesh的尺寸
    var size = _earthOptions.earthBallSize * 0.08;
    //设置mesh大小
    mesh_2.scale.set(size, size, size);
    // 设置mesh位置
    mesh_2.position.set( pos.x, pos.y, pos.z )
    // 四元数属性.quaternion表示mesh的角度状态
    //.setFromUnitVectors();计算两个向量之间构成的四元数值
    mesh_2.quaternion.setFromUnitVectors( meshNormal, coordVec3 );
    mesh_2._s=0;

    group.add(mesh);
    group.add(mesh_2);
    WaveMeshArr.push(mesh_2)
}
// 在不同的城市创造标记
var city_list=[
    {lng:116.3,lat:39.5},
    {lng:125.3,lat:21.8},
    {lng:105.3,lat:11.8},
    {lng:85.3,lat:24.8},
    {lng:115.3,lat:26.8},
    {lng:75.3,lat:15.8}
]
city_list.forEach( function ( city ) { 
    createPointMesh(lglt2xyz(city.lng, city.lat))
})


// 光圈的话，贴图用一张有渐变效果的png图
// 然后也是贴在 PlaneBufferGeometry 上，和上面标注的效果实现一样，
// 最后要在渲染函数 animate 里面动态的修改尺寸和透明度即可。
// 动画效果参考如下代码,WaveMeshArr是所有光圈mesh的数组集合。
function cityWaveAnimate(){
    // 所有波动光圈都有自己的透明度和大小状态
    // 一个波动光圈透明度变化过程是：0~1~0反复循环
    // 控制光环的尺寸
    let wave_size=3
    WaveMeshArr.forEach(function (mesh) {
        mesh._s += 0.007;
        mesh.scale.set(
             mesh._s*wave_size,
             mesh._s*wave_size,
             mesh._s*wave_size
        );
        if (mesh._s <= 1.5) {
            mesh.material.opacity = (mesh._s - 1) * 2; //2等于1/(1.5-1.0)，保证透明度在0~1之间变化
        } else if (mesh._s > 1.5 && mesh._s <= 2) {
            mesh.material.opacity = 1 - (mesh._s - 1.5) * 2; //2等于1/(2.0-1.5) mesh缩放2倍对应0 缩放1.5被对应1
        } else {
            mesh._s = 1.0;
        }
    });
}


// *************************** 阶段6 渐变光柱效果 **********************************************
// 通过shader，将物体的透明度由下往上，从1到0渐变即可（只需要两圈顶点，底下一圈alpha设为1，上面一圈alpha设为0）
function createLightColumn(pos) {
    let radius=0.1
    let height=3

    let geo,mat;
    let segment = 64;

    //创建几何体：这个几何体类似于圆柱，只是没有上下两个底面
    let bottomPos = []
    let topPos = []
    let angleOffset = (Math.PI * 2) / segment
    for (var i = 0; i < segment; i++) {
            let x = Math.cos(angleOffset * i) * radius
            let z = Math.sin(angleOffset * i) * radius
            bottomPos.push(x, 0, z)
            topPos.push(x, height, z)
    }
    bottomPos = bottomPos.concat(topPos)

    let face = []
    for (var i = 0; i < segment; i++) {
            if (i != segment - 1) {
            face.push(i + segment + 1, i, i + segment)
            face.push(i, i + segment + 1, i + 1)
            } else {
            face.push(segment, i, i + segment)
            face.push(i, segment, 0)
            }
    }

    geo = new THREE.BufferGeometry()
    //  BufferAttribute是属性缓冲区对象，它不仅可以表示几何体的顶点位置数据，还可以表示颜色和法向量数据。
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bottomPos), 3))
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array(face), 1))
    
    //mat
    let c = new THREE.Color('#FFCC00');
    mat = new THREE.ShaderMaterial({
        uniforms: {
            targetColor:{value:new THREE.Vector3(c.r,c.g,c.b)},
            height: { value: height},
        },
        transparent:true,
        side: THREE.DoubleSide, 
        //depthTest:false,
        depthWrite:false,

        vertexShader: [
            "varying vec3 modelPos;",
            "void main() {",
            "   modelPos = position;",
            "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
            "}"
        ].join("\n"),

        fragmentShader: [
            "uniform vec3 targetColor;",
            "uniform float height;",
            "varying vec3 modelPos;",

            "void main() {",
            "   gl_FragColor = vec4(targetColor.xyz,(1.0 - modelPos.y/height)*(1.0 - modelPos.y/height));",
            "}"
        ].join("\n")
    });

    let mesh = new THREE.Mesh(geo,mat);
    //设置mesh大小
    var size = _earthOptions.earthBallSize * 0.08;
    mesh.scale.set(size, size, size);
    // 设置mesh位置
    mesh.position.set( pos.x, pos.y, pos.z );
    // mesh.renderOrder = 9999;
    // mesh在球面上的法线方向(球心和球面坐标构成的方向向量)
    var coordVec3 = new THREE.Vector3( pos.x, pos.y, pos.z ).normalize();
    
    /**
     * 在Three.js中，Quaternion的setFromUnitVectors()方法用于计算两个向量之间的旋转Quaternion。
     * 该方法有两个参数：
     * 第一个参数是表示原始方向的向量，通常是(0,1,0)表示上方向，也可以是其他方向向量。
     * 第二个参数是表示目标方向的向量，通常是从原点指向所需方向的向量，也可以是其他方向向量。
     * 该方法的作用是计算一个四元数（Quaternion），用于将第一个向量旋转到第二个向量所表示的方向。
     * Quaternion表示一个旋转的轴和一个角度，可以通过将其应用于一个对象来实现旋转。
     * 在创建地球模型并在其表面创建圆柱体的场景中，
     * 第一个向量通常是沿着地球表面法线方向的向量，这样圆柱体就会垂直于地球表面。
     * 第二个向量通常是指向圆柱体的位置向量，这样圆柱体就会指向其所在的位置。
    */
    // 旋转使其垂直于球面
    // mesh在球面上的法线方向(球心和球面坐标构成的方向向量)
    var coordVec3 = new THREE.Vector3( pos.x, pos.y, pos.z ).normalize();
    // mesh默认在XOY平面上，法线方向沿着z轴new THREE.Vector3(0, 0, 1)
    var meshNormal = new THREE.Vector3( 0, 1, 0 );
    // 四元数属性.quaternion表示mesh的角度状态
    //.setFromUnitVectors();计算两个向量之间构成的四元数值
    mesh.quaternion.setFromUnitVectors( meshNormal, coordVec3 );

    group.add(mesh);
}

// 在不同的位置建立光柱
city_list.forEach( function ( city ) { 
    createLightColumn(lglt2xyz(city.lng, city.lat))
})


// *************************** 阶段7 飞线特效 **********************************************
// 飞线有两块内容：一个是绘制三维三次贝赛尔曲线，另一个是飞线上模拟物体移动。
/**
 * earth: Object3D,
 * flyManager: InitFlyLine,
 * fromCity: City,
 * toCity: City,
 * color: string
*/
// 增加城市之间飞线
const addFlyLine = (fromCity,toCity) => {
    var coefficient = 1;
    var curvePoints = new Array();
    var fromXyz = lglt2xyz(fromCity.lng, fromCity.lat);
    var toXyz = lglt2xyz(toCity.lng, toCity.lat);
    curvePoints.push(new THREE.Vector3(fromXyz.x, fromXyz.y, fromXyz.z));
  
    //根据城市之间距离远近，取不同个数个点
    var distanceDivRadius =
      Math.sqrt(
        (fromXyz.x - toXyz.x) * (fromXyz.x - toXyz.x) +
          (fromXyz.y - toXyz.y) * (fromXyz.y - toXyz.y) +
          (fromXyz.z - toXyz.z) * (fromXyz.z - toXyz.z)
      ) / _earthOptions.earthBallSize;

    var partCount = 3 + Math.ceil(distanceDivRadius * 2);

    for (var i = 0; i < partCount; i++) {
      var partCoefficient =coefficient + (partCount - Math.abs((partCount - 1) / 2 - i)) * 0.01;
      var partTopXyz = getPartTopPoint(
        {
          x: (fromXyz.x * (partCount - i)) / partCount + (toXyz.x * (i + 1)) / partCount,
          y: (fromXyz.y * (partCount - i)) / partCount + (toXyz.y * (i + 1)) / partCount,
          z: (fromXyz.z * (partCount - i)) / partCount + (toXyz.z * (i + 1)) / partCount,
        },
         _earthOptions.earthBallSize,
        partCoefficient
      );
      curvePoints.push(new THREE.Vector3(partTopXyz.x, partTopXyz.y, partTopXyz.z));
    }
    curvePoints.push(new THREE.Vector3(toXyz.x, toXyz.y, toXyz.z));
  
    //使用B样条，将这些点拟合成一条曲线（这里没有使用贝赛尔曲线，因为拟合出来的点要在地球周围，不能穿过地球）
    var curve = new THREE.CatmullRomCurve3(curvePoints, false);
  
    //从B样条里获取点
    var pointCount = Math.ceil(500 * partCount);
    var allPoints = curve.getPoints(pointCount);
  
    //制作飞线动画
    // @ts-ignore
    var flyMesh = flyManager.addFly({
      curve: allPoints, //飞线飞线其实是N个点构成的
      width: 0.3, //点的半径
      length: Math.ceil((allPoints.length * 3) / 5), //飞线的长度（点的个数）
      speed: partCount + 10, //飞线的速度
      repeat: Infinity, //循环次数
    });
    group.add(flyMesh);

    // 再添加固定的线条
    //迁徙方向，第一个参数是起始方向
    // var line = addLine(fromXyz, toXyz);
    // group.add(line.lineMesh);
};

// 随机个时间间隔后，再添加连线（以免同时添加连线，显示效果死板）
const randomAddFlyLine = (fromCity,toCity) => {
    setTimeout(function () {
      addFlyLine(fromCity, toCity);
    }, Math.ceil(Math.random() * 150));
  };

const getPartTopPoint = (innerPoint,earthRadius,partCoefficient) => {
    var fromPartLen = Math.sqrt(
        innerPoint.x * innerPoint.x +
        innerPoint.y * innerPoint.y +
        innerPoint.z * innerPoint.z
    );
    return {
      x: (innerPoint.x * partCoefficient * earthRadius) / fromPartLen,
      y: (innerPoint.y * partCoefficient * earthRadius) / fromPartLen,
      z: (innerPoint.z * partCoefficient * earthRadius) / fromPartLen,
    };
  };

function addLine( v0, v3 ) {
    // 夹角
    // var angle = ( v0.angleTo( v3 ) * 1.8 ) / Math.PI / 0.1; 
    v0=new THREE.Vector3(v0.x,v0.y,v0.z);
    v3=new THREE.Vector3(v3.x,v3.y,v3.z);
    var angle = (v0.angleTo(v3) * 180) / Math.PI;
    var aLen = angle * 0.4, hLen = angle * angle * 12;
    var p0 = new THREE.Vector3( 0, 0, 0 );
    // 法线向量
    var rayLine = new THREE.Ray( p0, getVCenter( v0.clone(), v3.clone() ) );
    // 顶点坐标
    var vtop = rayLine.at( hLen / rayLine.at( 1 ).distanceTo( p0 ) );
    // 控制点坐标
    var v1 = getLenVcetor( v0.clone(), vtop, aLen );
    var v2 = getLenVcetor( v3.clone(), vtop, aLen );
    
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

// demo 从一个城市飞向其他各个城市
var fly_list=[
    {lng:46.3,lat:39.5},
    {lng:65.3,lat:1.8},
    {lng:95.3,lat:31.8},
    {lng:107.3,lat:24.8},
    {lng:155.3,lat:56.8},
    {lng:135.3,lat:35.8}
]

// 相互之间的飞线效果
fly_list.forEach( function ( city_1 ){
    fly_list.forEach( function ( city ) { 
        randomAddFlyLine(city_1,city)
    })
})


fly_list.forEach( function ( city ) { 
    createPointMesh(lglt2xyz(city.lng, city.lat))
})

// *************************** 阶段8 世界地图边界 **********************************************
function countryLine() {
    let R=_earthOptions.earthBallSize+0.01;
    var geometry = new THREE.BufferGeometry(); //创建一个Buffer类型几何体对象
    //类型数组创建顶点数据
    var vertices = new Float32Array(pointArr);
    // 创建属性缓冲区对象
    var attribute = new THREE.BufferAttribute(vertices, 3); //3个为一组，表示一个顶点的xyz坐标
    // 设置几何体attributes属性的位置属性
    geometry.attributes.position = attribute;
    // 线条渲染几何体顶点数据
    var material = new THREE.LineBasicMaterial({
      color: '0x7aa5a5', //线条颜色
    }); //材质对象
    var line = new THREE.LineSegments(geometry, material); //间隔绘制直线
    line.scale.set(R, R, R); //lineData.js对应球面半径是1，需要缩放R倍
    group.add(line);
}
countryLine();


// *************************** 阶段9 中国描边以及动态流光效果 *************************************
const vertexShader=`
attribute float aOpacity;
// 通过uniform全局变量获取外部设置uSize，设置粒子大小
uniform float uSize;
// 通过varying变量把顶点对应的透明度aOpacity传入片元着色器。
varying float vOpacity;

void main(){
    // projectionMatrix是投影变换矩阵
    // modelViewMatrix是相机坐标系的变换矩阵
    // position顶点坐标
    gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
    gl_PointSize = uSize;

    vOpacity=aOpacity;
}
`
const fragmentShader = `
varying float vOpacity;
// 通过uniform全局变量获取外部设置uColor，基础颜色。
uniform vec3 uColor;

float invert(float n){
    return 1.-n;
}

void main(){
  // 设置透明度小于0.2的片元不执行。
  if(vOpacity <=0.2){
      discard;
  }
  vec2 uv=vec2(gl_PointCoord.x,invert(gl_PointCoord.y));
  vec2 cUv=2.*uv-1.;
  // 根据算法获取当前顶点要展示的颜色
  vec4 color=vec4(1./length(cUv));
  color*=vOpacity;
  color.rgb*=uColor;
  
  gl_FragColor=color;
}
`

// 绘制线条公用方法，并把边界点信息放入lines中。
let indexBol = true
let points
let geometry
var lines = []

// 以北京为中心 修改坐标
// const projection = d3.geoMercator().center([116.412318, 39.909843]).translate([0, 0])

geometry = new THREE.BufferGeometry()
let positions = null
let opacitys = null
const loader = new THREE.FileLoader()


/**
 * 中国边界 图形绘制
 * @param polygon 多边形 点数组
 * @param color 材质颜色
 * */
function lineDraw(polygon, color) {
  const lineGeometry = new THREE.BufferGeometry()
  const pointsArray = new Array()
  polygon.forEach((row) => {
    const pos = lglt2xyz(row[0], row[1])
    // 创建三维点
    pointsArray.push(new THREE.Vector3(pos.x, pos.y, pos.z))

    if (indexBol) {
      lines.push([pos.x, pos.y, pos.z])
    }
  })
  indexBol = false
  // 放入多个点
  lineGeometry.setFromPoints(pointsArray)

  const lineMaterial = new THREE.LineBasicMaterial({
    color: color,
  })

  return new THREE.Line(lineGeometry, lineMaterial)
}

function mapLineFlow(){
    loader.load('../assets/100000.json', (data) => {
        const jsondata = JSON.parse(data)

        // 中国边界
        const feature = jsondata.features[0]
        const province = new THREE.Object3D()

        // 点数据
        const coordinates = feature.geometry.coordinates

    coordinates.forEach((coordinate) => {
        // coordinate 多边形数据
        coordinate.forEach((rows) => {
        const line = lineDraw(rows, 0xffffff)
        province.add(line)
        })
     })

    positions = new Float32Array(lines.flat(1))
    // 设置顶点
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    // 设置 粒子透明度为 0
    opacitys = new Float32Array(positions.length).map(() => 0)
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacitys, 1))
    group.add(province)
})

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true, // 设置透明
        uniforms: {
            uSize: {value: 4.0},
            uColor: {value: new THREE.Color('#FFFFFF')}
        }
    })
    points = new THREE.Points(geometry, material)

    group.add(points)
}
mapLineFlow()

let currentPos_1 = 0
let currentPos_2 = 2000
let currentPos_3 = 4000
let pointSpeed = 10 // 速度

// 渲染 
function mapLineRender() {
    if (points && geometry.attributes.position) {
        // 曳光的长度
        let wave_length=300

        currentPos_1 += pointSpeed
        currentPos_2 += pointSpeed
        currentPos_3 += pointSpeed

        // 曳光效果 1
        // 第一个清除上一次粒子透明度的修改。
        for (let i = 0; i < pointSpeed; i++) {
        opacitys[(currentPos_1 - i) % lines.length] = 0
        }
        // 第二个设置炫光长度和修改粒子的透明度。
        for (let i = 0; i < wave_length; i++) {
            opacitys[(currentPos_1 + i) % lines.length] = i / 50 > 2 ? 2 : i / 50
        }

        // 曳光效果 2
        // 第一个清除上一次粒子透明度的修改。
        for (let i = 0; i < pointSpeed; i++) {
            opacitys[(currentPos_2 - i) % lines.length] = 0
        } 
        // 第二个设置炫光长度和修改粒子的透明度。
        for (let i = 0; i < wave_length; i++) {
            opacitys[(currentPos_2 + i) % lines.length] = i / 50 > 2 ? 2 : i / 50
        }

        // 曳光效果 3
        // 第一个清除上一次粒子透明度的修改。
        for (let i = 0; i < pointSpeed; i++) {
            opacitys[(currentPos_3 - i) % lines.length] = 0
        }   
        // 第二个设置炫光长度和修改粒子的透明度。
        for (let i = 0; i < wave_length; i++) {
            opacitys[(currentPos_3 + i) % lines.length] = i / 50 > 2 ? 2 : i / 50
        }

        geometry.attributes.aOpacity.needsUpdate = true
    }
    // renderer.render(scene, camera)
    // requestAnimationFrame(render)
}