import * as THREE from "../modules/three.module.js";
import { OrbitControls } from "../modules/controls/OrbitControls.js";

/*
柱状图功能原理是在地球上加上圆柱对象，颜色和高度分别代表分类和值大小。
*/

var _domID="three-frame";
var _earthOptions={
    imgEarth: '../assets/earth_bg.jpg',//地球贴图
    imgSky: '../assets/starry_sky_bg.jpg',//深空背景
    autorotationSpeed: 0.001,//自转速度（正数自西向东转，负数为逆向）
    cameraZ: 250,//摄像头高度,
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

// this.renderEarthByRender();

// // // // // // 热力图的绘制 // // // // // // // //

// 数据准备
var _columnData=[
    {'x':113,'y':31,'value':10},
    {'x':93,'y':41,'value':40},
    {'x':63,'y':11,'value':30},
    {'x':73,'y':15,'value':40},
    {'x':83,'y':51,'value':20}
];

// 顶点着色器
var vertexShader= `
    precision highp float;
    varying vec2 vUv;

    void main() {
	  // uv 和 顶点变换
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 
    }
`

// 片元着色器
var fragmentShader=`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D alphaScaleMap;
    uniform sampler2D paletteMap;
    uniform sampler2D texture1;

    void main() {
        vec4 tcolor1 = texture2D( texture1, vUv );

        // 温度转为权重alpha 并且 createRadialGradient 渐变的图
        vec4 alphaColor = texture2D(alphaScaleMap, vUv);

        // 根据温度转换为的权重alpha，确定改点的颜色 ，paletteMap 指定颜色条形图
        vec4 color = texture2D(paletteMap, vec2(alphaColor.a, 0.0));
        vec4 tcolor3 = vec4(color.r, color.g, color.b, 1.0);
        gl_FragColor = mix(tcolor1, tcolor3 * 1.3, tcolor3.r / 2.0);
    }
`

const segments = 45;

// 随机给出温度值 储存在2维数组
const getTemperature = () => {
    const temperatureArray = new Array();
    for ( let i = 0; i < segments; i ++ ) {
        temperatureArray[ i ] = parseInt( Math.random() * 25 + 10 );  // 颜色的变化区间 10 - 35

    }
    return temperatureArray;
}


// 绘制辐射圆
const drawCircular = ( context, opts ) => {
    var { x, y, radius, weight } = opts;
    radius = parseInt( radius * weight );

    /**
     * 径向渐变
     * createRadialGradient() 方法创建放射状/圆形渐变对象。
     * context.createRadialGradient(x0,y0,r0,x1,y1,r1);
     * x0	渐变的开始圆的 x 坐标
     * y0	渐变的开始圆的 y 坐标
     * r0	开始圆的半径
     * x1	渐变的结束圆的 x 坐标
     * y1	渐变的结束圆的 y 坐标
     * r1	结束圆的半径
     * */ 
    // 创建圆设置填充色
    const rGradient = context.createRadialGradient( x, y, 0, x, y, radius );
    rGradient.addColorStop( 0, 'rgba(255, 0, 0, 1)' );
    rGradient.addColorStop( 1, 'rgba(0, 255, 0, 0)' );
    context.fillStyle = rGradient;

    // 设置globalAlpha
    // globalAlpha 属性设置或返回绘图的当前透明值（alpha 或 transparency）。
    // globalAlpha 属性值必须是介于 0.0（完全透明） 与 1.0（不透明） 之间的数字。
    context.globalAlpha = weight;
    context.beginPath();
    context.arc( x, y, radius, 0, 2 * Math.PI );
    context.closePath();

    context.fill();

};

// 获得渐变颜色条图
const getPaletteMap = () => {
 
    //颜色条的颜色分布
    const colorStops = {
        1.0: '#f00',
        0.8: '#e2fa00',
        0.6: '#33f900',
        0.3: '#0349df',
        0.0: '#0f00ff'
    };

    //颜色条的大小
    const width = 256, height = 10;

    // 创建canvas
    const paletteCanvas = document.createElement( 'canvas' );
    paletteCanvas.width = width;
    paletteCanvas.height = height;
    paletteCanvas.style.position = 'absolute';
    paletteCanvas.style.top = '20px';
    paletteCanvas.style.right = '10px';
    const ctx = paletteCanvas.getContext( '2d' );

    // 创建线性渐变色
    const linearGradient = ctx.createLinearGradient( 0, 0, width, 0 );
    for ( const key in colorStops ) {
        linearGradient.addColorStop( key, colorStops[ key ] );
    }

    // 绘制渐变色条
    ctx.fillStyle = linearGradient;
    ctx.fillRect( 0, 0, width, height );

    document.body.appendChild( paletteCanvas );

    const paletteTexture = new THREE.Texture( paletteCanvas );
    paletteTexture.minFilter = THREE.NearestFilter;
    paletteTexture.needsUpdate = true;

    return paletteTexture;

};


const w = 500;
const h = 500;

// 获取透明度阶梯图
const getAlphaScaleMap = ( width, height ) => {
    const canvas = document.createElement( 'canvas' );
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext( '2d' );

    // 随机生成温度
    const tenperature = getTemperature();

    // 绘制透明度阶梯图
    for ( let i = 0; i < segments; i ++ ) {
        // 计算出当前温度占标准温度的权值
        const weight = tenperature[ i ] / 25; // 25 是之前颜色的变化区间 10 - 35

        // 绘制圆形
        drawCircular( context, {
            x: Math.random() * w,
            y: Math.random() * h,
            radius: 50,
            weight: weight
        } );
    }
    
    // 创建 Three 中的图片
    const tex = new THREE.Texture( canvas );
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    document.body.appendChild( canvas );
    return tex;
 
};


// 地球底图贴图
var texture_global = new THREE.TextureLoader().load(_earthOptions.imgEarth);

// 创建热力图渲染的材质
const heatMapMaterial = new THREE.ShaderMaterial( {
    transparent: true,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        'alphaScaleMap': {
            type: 't',
            value: getAlphaScaleMap( w, h )
        },
        'paletteMap': {
            type: 't',
            value: getPaletteMap()
        },
        // texture1 是地图本身的纹理贴图
        texture1: {
            value: texture_global
        },
    }

} );



// 创建地球 热力图Mesh
earthBall = new THREE.Mesh(new THREE.SphereGeometry(_earthOptions.earthBallSize, 50, 50), heatMapMaterial);

console.log('earthBall',earthBall)
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

