import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/addons/libs/tween.module.js';

class TweenManger {
	constructor() {
		this.numTweensRunning = 0;
	}

	_handleComplete() {
		-- this.numTweensRunning;
		console.assert( this.numTweensRunning >= 0 ); /* eslint no-console: off */
	}

	createTween( targetObject ) {
		const self = this;
		++ this.numTweensRunning;
		let userCompleteFn = () => {};

		// 创建一个新的 tween 并安装我们自己的 onComplete 回调函数。
		const tween = new TWEEN.Tween( targetObject ).onComplete( function ( ...args ) {
			self._handleComplete();
			userCompleteFn.call( this, ...args );

		});

		// 用我们自己的 onComplete 函数替换 tween 的 onComplete 函数
        // 这样我们可以在用户提供回调函数的情况下调用它。
		tween.onComplete = ( fn ) => {
			userCompleteFn = fn;
			return tween;

		};

		return tween;
	}
	update() {
		TWEEN.update();
		return this.numTweensRunning > 0;
	}

}

var Shaders = {
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

function main() {
	const canvas = document.querySelector( '#c' );
	const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
	const tweenManager = new TweenManger();

	const fov = 60;
	const aspect = 2; // the canvas default
	const near = 0.1;
	const far = 10;
	const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
	camera.position.z = 2.5;

	const controls = new OrbitControls( camera, canvas );
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minDistance = 1.2;
	controls.maxDistance = 4;
	controls.update();

	const scene = new THREE.Scene();
	scene.background = new THREE.Color( 'black' );

	{
		const loader = new THREE.TextureLoader();
        // 地球表面贴图材质
		const texture = loader.load( 'https://threejs.org/manual/examples/resources/images/world.jpg', render );
		texture.colorSpace = THREE.SRGBColorSpace;
		const geometry = new THREE.SphereGeometry( 1, 64, 32 );
		const material = new THREE.MeshBasicMaterial( { map: texture } );
		scene.add( new THREE.Mesh( geometry, material ) );

    
        // 大气层的材质
            // 大气层的材质
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(Shaders['atmosphere'].uniforms),
            vertexShader: Shaders['atmosphere'].vertexShader,
            fragmentShader: Shaders['atmosphere'].fragmentShader,
            side: THREE.BackSide, // 镜像翻转
            // blending：混合。
            // AdditiveBlending的原理是：把源和目标的RGB三通道分别进行相加
            // 我们我们可以为光晕提供多种材质。混合模式决定了如何将它们混合在一起。镜头光晕默认的混合方式是 THREE.AdditiveBlending。
            blending: THREE.AdditiveBlending, 
            transparent: true
        });

        const atmosphere = new THREE.Mesh(geometry, atmosphereMaterial);
        // //沿着XYZ分别缩放 x倍
        atmosphere.scale.set( 1.26, 1.26, 1.26 );
        scene.add(atmosphere);
	}

	async function loadFile( url ) {
		const req = await fetch( url );
		return req.text();

	}

	function parseData( text ) {
		const data = [];
		const settings = { data };
		let max;
		let min;
		// split into lines
		text.split( '\n' ).forEach( ( line ) => {

			// split the line by whitespace
			const parts = line.trim().split( /\s+/ );
			if ( parts.length === 2 ) {
				// only 2 parts, must be a key/value pair
				settings[ parts[ 0 ] ] = parseFloat( parts[ 1 ] );

			} else if ( parts.length > 2 ) {
				// more than 2 parts, must be data
				const values = parts.map( ( v ) => {
					const value = parseFloat( v );
					if ( value === settings.NODATA_value ) {
						return undefined;
					}

					max = Math.max( max === undefined ? value : max, value );
					min = Math.min( min === undefined ? value : min, value );
					return value;
				} );
				data.push( values );
			}

		} );
		return Object.assign( settings, { min, max } );
	}

	function dataMissingInAnySet( fileInfos, latNdx, lonNdx ) {
		for ( const fileInfo of fileInfos ) {
			if ( fileInfo.file.data[ latNdx ][ lonNdx ] === undefined ) {
				return true;
			}
		}
		return false;

	}

	function makeBoxes( file, hueRange, fileInfos ) {
		const { min, max, data } = file;
		const range = max - min;

		//这些帮助将使定位框变得容易
        //我们可以将lon helper在Y轴上旋转到经度
		const lonHelper = new THREE.Object3D();
		scene.add( lonHelper );

		// 我们将latHelper在其X轴上旋转到纬度
		const latHelper = new THREE.Object3D();
		lonHelper.add( latHelper );

		// 位置辅助器将对象移动到球体的边缘
		const positionHelper = new THREE.Object3D();
		positionHelper.position.z = 1;
		latHelper.add( positionHelper );

		// 用于移动立方体的中心，使其从Z轴位置缩放
		const originHelper = new THREE.Object3D();
		originHelper.position.z = 0.5;
		positionHelper.add( originHelper );

		const color = new THREE.Color();

		const lonFudge = Math.PI * .5;
		const latFudge = Math.PI * - 0.135;
		const geometries = [];
		data.forEach( ( row, latNdx ) => {
			row.forEach( ( value, lonNdx ) => {
				if ( dataMissingInAnySet( fileInfos, latNdx, lonNdx ) ) {
					return;
				}

				const amount = ( value - min ) / range;
				const boxWidth = 1;
				const boxHeight = 1;
				const boxDepth = 1;
				const geometry = new THREE.BoxGeometry( boxWidth, boxHeight, boxDepth );

				// adjust the helpers to point to the latitude and longitude
				lonHelper.rotation.y = THREE.MathUtils.degToRad( lonNdx + file.xllcorner ) + lonFudge;
				latHelper.rotation.x = THREE.MathUtils.degToRad( latNdx + file.yllcorner ) + latFudge;

				// use the world matrix of the origin helper to
				// position this geometry
				positionHelper.scale.set( 0.005, 0.005, THREE.MathUtils.lerp( 0.01, 0.5, amount ) );
				originHelper.updateWorldMatrix( true, false );
				geometry.applyMatrix4( originHelper.matrixWorld );

				// compute a color
				const hue = THREE.MathUtils.lerp( ...hueRange, amount );
				const saturation = 1;
				const lightness = THREE.MathUtils.lerp( 0.4, 1.0, amount );
				color.setHSL( hue, saturation, lightness );
				// get the colors as an array of values from 0 to 255
				const rgb = color.toArray().map( v => v * 255 );

				// make an array to store colors for each vertex
				const numVerts = geometry.getAttribute( 'position' ).count;
				const itemSize = 3; // r, g, b
				const colors = new Uint8Array( itemSize * numVerts );

				// copy the color into the colors array for each vertex
				colors.forEach( ( v, ndx ) => {
					colors[ ndx ] = rgb[ ndx % 3 ];

				} );

				const normalized = true;
				const colorAttrib = new THREE.BufferAttribute( colors, itemSize, normalized );
				geometry.setAttribute( 'color', colorAttrib );
				geometries.push( geometry );

			} );

		} );

		return BufferGeometryUtils.mergeGeometries(
			geometries, false );
	}

	async function loadData( info ) {
		const text = await loadFile( info.url );
		info.file = parseData( text );

	}

	async function loadAll() {
		const fileInfos = [
			{ name: 'Set 1', hueRange: [ 0.7, 0.3 ], url: 'https://threejs.org/manual/examples/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014mt_2010_cntm_1_deg.asc' },
			{ name: 'Set 2', hueRange: [ 0.9, 1.1 ], url: 'https://threejs.org/manual/examples/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014ft_2010_cntm_1_deg.asc' },
		];

		await Promise.all( fileInfos.map( loadData ) );
		function mapValues( data, fn ) {
			return data.map( ( row, rowNdx ) => {
				return row.map( ( value, colNdx ) => {
					return fn( value, rowNdx, colNdx );
				} );

			} );

		}

		function makeDiffFile( baseFile, otherFile, compareFn ) {
			let min;
			let max;
			const baseData = baseFile.data;
			const otherData = otherFile.data;
			const data = mapValues( baseData, ( base, rowNdx, colNdx ) => {
				const other = otherData[ rowNdx ][ colNdx ];
				if ( base === undefined || other === undefined ) {
					return undefined;
				}

				const value = compareFn( base, other );
				min = Math.min( min === undefined ? value : min, value );
				max = Math.max( max === undefined ? value : max, value );
				return value;
			} );
			// make a copy of baseFile and replace min, max, and data
			// with the new data
			return { ...baseFile, min, max, data };

		}

		// generate a new set of data
		{
			const menInfo = fileInfos[ 0 ];
			const womenInfo = fileInfos[ 1 ];
			const menFile = menInfo.file;
			const womenFile = womenInfo.file;

			function amountGreaterThan( a, b ) {
				return Math.max( a - b, 0 );

			}

			fileInfos.push( {
				name: 'Set 3',
				hueRange: [ 0.6, 1.1 ],
				file: makeDiffFile( menFile, womenFile, ( men, women ) => {
					return amountGreaterThan( men, women );

				} ),
			} );
			fileInfos.push( {
				name: 'Set 4',
				hueRange: [ 0.0, 0.4 ],
				file: makeDiffFile( womenFile, menFile, ( women, men ) => {
					return amountGreaterThan( women, men );
				} ),
			} );

		}

		// make geometry for each data set
		const geometries = fileInfos.map( ( info ) => {
			return makeBoxes( info.file, info.hueRange, fileInfos );

		} );

		// use the first geometry as the base
		// and add all the geometries as morphtargets
		const baseGeometry = geometries[ 0 ];
		baseGeometry.morphAttributes.position = geometries.map( ( geometry, ndx ) => {
			const attribute = geometry.getAttribute( 'position' );
			const name = `target${ndx}`;
			attribute.name = name;
			return attribute;

		} );
		baseGeometry.morphAttributes.color = geometries.map( ( geometry, ndx ) => {
			const attribute = geometry.getAttribute( 'color' );
			const name = `target${ndx}`;
			attribute.name = name;
			return attribute;

		} );
		const material = new THREE.MeshBasicMaterial( {
			vertexColors: true,
		} );
		const mesh = new THREE.Mesh( baseGeometry, material );
		scene.add( mesh );

		// show the selected data, hide the rest
		function showFileInfo( fileInfos, fileInfo ) {

			const targets = {};
			fileInfos.forEach( ( info, i ) => {
				const visible = fileInfo === info;
				info.elem.className = visible ? 'selected' : '';
				targets[ i ] = visible ? 1 : 0;

			} );
			const durationInMs = 1000;
			tweenManager.createTween( mesh.morphTargetInfluences )
				.to( targets, durationInMs )
				.start();
			requestRenderIfNotRequested();

		}

		const uiElem = document.querySelector( '#ui' );
		fileInfos.forEach( ( info ) => {
			const div = document.createElement( 'div' );
			info.elem = div;
			div.textContent = info.name;
			uiElem.appendChild( div );
			function show() {
				showFileInfo( fileInfos, info );

			}

			div.addEventListener( 'mouseover', show );
			div.addEventListener( 'touchstart', show );

		} );
		// show the first set of data
		showFileInfo( fileInfos, fileInfos[ 0 ] );

	}

	loadAll();

	function resizeRendererToDisplaySize( renderer ) {

		const canvas = renderer.domElement;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		const needResize = canvas.width !== width || canvas.height !== height;
		if ( needResize ) {
			renderer.setSize( width, height, false );
		}

		return needResize;

	}

	let renderRequested = false;

	function render() {
		renderRequested = undefined;

		if ( resizeRendererToDisplaySize( renderer ) ) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}

		if ( tweenManager.update() ) {
			requestRenderIfNotRequested();
		}

		controls.update();
		renderer.render( scene, camera );
	}

	render();
	function requestRenderIfNotRequested() {
		if ( ! renderRequested ) {
			renderRequested = true;
			requestAnimationFrame( render );
		}

	}

	controls.addEventListener( 'change', requestRenderIfNotRequested );
	window.addEventListener( 'resize', requestRenderIfNotRequested );
}

main();