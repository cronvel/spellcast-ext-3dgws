(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GTransition = require( './GTransition.js' ) ;
const vectorUtils = require( './vectorUtils.js' ) ;
//const domKit = require( 'dom-kit' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
function Camera( gScene ) {
	this.gScene = gScene ;    // immutable

	this.mode = null ;
	this.position = { x: 0 , y: 0 , z: 10 } ;
	this.target = { x: 0 , y: 0 , z: 0 } ;
	this.rotation = {
		x: 0 , y: 0 , z: 0 , w: 1
	} ;
	this.yaw = 0 ;
	this.pitch = 0 ;
	this.roll = 0 ;
	this.distance = 10 ;
	this.fov = 90 ;
	this.perspective = 1 ;
	this.free = false ;
	this.trackingMode = null ;

	// Babylon stuffs
	this.babylon = {
		type: null ,
		camera: null
	} ;

	// This create and attach actual camera
	this.setMode( 'firstPerson' ) ;
}

module.exports = Camera ;



// !THIS SHOULD TRACK SERVER-SIDE Camera! spellcast/lib/gfx/Camera.js
Camera.prototype.update = function( data , awaiting = false ) {
	console.warn( "3D Camera.update()" , data ) ;
	var camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.mode ) {
		this.setMode( data.mode ) ;
	}

	if ( data.transition ) {
		data.transition = new GTransition( data.transition ) ;
	}

	if ( data.free !== undefined ) {
		if ( this.updateFree( data.free ) ) {
			if ( ! data.position ) { data.position = this.position ; }
			if ( ! data.rotation ) { data.rotation = this.rotation ; }
			if ( ! data.target ) { data.target = this.target ; }
			if ( data.yaw === undefined ) { data.yaw = this.yaw ; }
			if ( data.pitch === undefined ) { data.pitch = this.pitch ; }
			if ( data.roll === undefined ) { data.roll = this.roll ; }
			if ( data.distance === undefined ) { data.distance = this.distance ; }
		}
	}

	switch ( this.mode ) {
		case 'positions' :
			if ( data.position || data.target || data.roll !== undefined ) {
				this.updateFirstPerson( data , false , true ) ;
			}
			break ;
		case 'firstPerson' :
			if ( data.position || data.yaw !== undefined || data.pitch !== undefined || data.roll !== undefined ) {
				this.updateFirstPerson( data ) ;
			}
			break ;
		case 'firstPersonQuaternion' :
			if ( data.position || data.rotation ) {
				this.updateFirstPerson( data , true ) ;
			}
			break ;
		case 'orbital' :
			if ( data.target || data.yaw !== undefined || data.pitch !== undefined || data.roll !== undefined || data.distance !== undefined ) {
				this.updateOrbital( data ) ;
			}
			break ;
	}

	if ( data.fov !== undefined ) {
		this.fov = data.fov || 90 ;
		// It looks like fov is divided by 2 in Babylon, hence the 360 instead of 180

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'fov' ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.fov * Math.PI / 360
			) ;
		}
		else {
			camera.fov = this.fov * Math.PI / 360 ;
		}
	}

	if ( data.trackingMode !== undefined ) { this.trackingMode = data.trackingMode || null ; }

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



Camera.prototype.setMode = function( mode ) {
	var alpha , beta ;

	console.warn( "##### Camera.setMode()" , mode , this.mode ) ;
	if ( mode === this.mode ) { return ; }
	this.mode = mode ;

	switch ( this.mode ) {
		case 'positions' :
		case 'firstPerson' :
		case 'firstPersonQuaternion' :
			if ( this.babylon.type === 'FreeCamera' ) {
				this.babylon.camera.position = new BABYLON.Vector3( this.position.x , this.position.y , this.position.z ) ;
			}
			else {
				this.babylon.type = 'FreeCamera' ;

				if ( this.babylon.camera ) { this.babylon.camera.dispose() ; }

				this.babylon.camera = new BABYLON.FreeCamera(
					'Camera' ,
					new BABYLON.Vector3( this.position.x , this.position.y , this.position.z ) ,
					this.gScene.babylon.scene
				) ;

				this.babylon.camera.onViewMatrixChangedObservable.add( () => {
					this.gScene.changes.camera = true ;
				} ) ;
			}

			if ( this.mode === 'positions' ) {
				this.babylon.camera.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(
					vectorUtils.cameraRotationFromOriginAndTarget( this.position , this.target , this.roll * vectorUtils.DEG_TO_RAD )
				) ;
			}
			else if ( this.mode === 'firstPersonQuaternion' ) {
				this.babylon.camera.rotationQuaternion = new BABYLON.Quaternion(
					this.rotation.x ,
					this.rotation.y ,
					this.rotation.z ,
					this.rotation.w
				) ;
			}
			else {
				this.babylon.camera.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
					this.pitch * vectorUtils.DEG_TO_RAD ,
					this.yaw * vectorUtils.DEG_TO_RAD ,
					this.roll * vectorUtils.DEG_TO_RAD
				) ;
			}

			break ;

		case 'orbital' :
			alpha = vectorUtils.toCameraAlpha( this.yaw ) ;
			beta = vectorUtils.toCameraBeta( this.pitch ) ;

			if ( this.babylon.type === 'ArcRotateCamera' ) {
				this.babylon.camera.target = new BABYLON.Vector3( this.target.x , this.target.y , this.target.z ) ;
				this.babylon.camera.alpha = alpha ;
				this.babylon.camera.beta = beta ;
				this.babylon.camera.radius = this.distance ;
			}
			else {
				this.babylon.type = 'ArcRotateCamera' ;

				if ( this.babylon.camera ) { this.babylon.camera.dispose() ; }

				this.babylon.camera = new BABYLON.ArcRotateCamera(
					'Camera' ,
					alpha ,
					beta ,
					this.distance ,
					new BABYLON.Vector3( this.target.x , this.target.y , this.target.z ) ,
					this.gScene.babylon.scene
				) ;

				this.babylon.camera.onViewMatrixChangedObservable.add( () => {
					this.gScene.changes.camera = true ;
				} ) ;
			}

			break ;

			// Not supported ATM
			//case 'orbitalQuaternion' :

		default :
			return ;
	}

	// Make the mouse wheel move less
	this.babylon.camera.wheelPrecision = 100 ;

	console.warn( "~~~~~~ Camera.setMode() done" ) ;
} ;



// Return true if the current camera position/rotation/target/etc should be moved back to its original position
Camera.prototype.updateFree = function( free ) {
	free = !! free ;

	if ( free === this.free ) { return ; }
	this.free = free ;

	if ( ! this.free ) {
		//this.babylon.camera.detachControl( this.gScene.$gscene ) ;
		this.babylon.camera.detachControl() ;
		return true ;
	}

	//this.babylon.camera.attachControl( this.gScene.$gscene ) ;
	this.babylon.camera.attachControl() ;

	return false ;
} ;



Camera.prototype.updateFirstPerson = function( data , quaternionMode , positionsMode ) {
	var oldRotationQuaternion , newRotationQuaternion ,
		camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) { this.position = data.position ; }
	if ( data.target ) { this.target = data.target ; }
	if ( data.rotation ) { this.rotation = data.rotation ; }
	if ( data.yaw !== undefined ) { this.yaw = data.yaw ; }
	if ( data.pitch !== undefined ) { this.pitch = data.pitch ; }
	if ( data.roll !== undefined ) { this.roll = data.roll ; }

	// Rotation can't be animated properly without quaternion, so we use it everywhere

	if ( positionsMode ) {
		// In this mode, any changes will always change the rotation
		newRotationQuaternion = BABYLON.Quaternion.FromEulerVector(
			vectorUtils.cameraRotationFromOriginAndTarget( this.position , this.target , this.roll * vectorUtils.DEG_TO_RAD )
		) ;
	}
	else if ( quaternionMode ) {
		if ( data.rotation ) {
			newRotationQuaternion = new BABYLON.Quaternion( this.rotation.x , this.rotation.y , this.rotation.z , this.rotation.w ) ;
		}
	}
	else if ( data.yaw !== undefined || data.pitch !== undefined || data.roll !== undefined ) {
		newRotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
			this.pitch * vectorUtils.DEG_TO_RAD ,
			this.yaw * vectorUtils.DEG_TO_RAD ,
			this.roll * vectorUtils.DEG_TO_RAD
		) ;
	}

	if ( data.transition ) {
		oldRotationQuaternion =
			camera.rotationQuaternion ? camera.rotationQuaternion :
			BABYLON.Quaternion.FromEulerVector( camera.rotation ) ;

		console.warn( "[!] camera transition:" , camera , oldRotationQuaternion , newRotationQuaternion ) ;

		if ( data.position ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'position' ,
				BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
				new BABYLON.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}

		if ( newRotationQuaternion ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'rotationQuaternion' ,
				BABYLON.Animation.ANIMATIONTYPE_QUATERNION ,
				newRotationQuaternion ,
				oldRotationQuaternion
			) ;
		}
	}
	else {
		console.warn( "[!] camera direct:" , camera , newRotationQuaternion ) ;
		if ( data.position ) {
			camera.position = new BABYLON.Vector3( this.position.x , this.position.y , this.position.z ) ;
		}

		if ( newRotationQuaternion ) { camera.rotationQuaternion = newRotationQuaternion ; }
	}
} ;



Camera.prototype.updateOrbital = function( data ) {
	var alpha , beta ,
		camera = this.babylon.camera ,
		scene = this.gScene.babylon.scene ;

	if ( data.target ) { this.target = data.target ; }

	if ( data.yaw ) {
		this.yaw = data.yaw ;
		alpha = vectorUtils.toCameraAlpha( this.yaw ) ;
	}

	if ( data.pitch ) {
		this.pitch = data.pitch ;
		beta = vectorUtils.toCameraBeta( this.pitch ) ;
	}

	if ( data.distance ) { this.distance = data.distance ; }

	if ( data.transition ) {
		console.warn( "[!] camera transition:" , camera ) ;

		if ( data.target ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'target' ,
				BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
				new BABYLON.Vector3( this.target.x , this.target.y , this.target.z )
			) ;
		}

		if ( data.yaw ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'alpha' ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				alpha
			) ;
		}

		if ( data.pitch ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'beta' ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				beta
			) ;
		}

		if ( data.distance ) {
			data.transition.createAnimation(
				scene ,
				camera ,
				'radius' ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.distance
			) ;
		}
	}
	else {
		console.warn( "[!] camera direct:" , camera ) ;
		if ( data.target ) { camera.target = new BABYLON.Vector3( this.target.x , this.target.y , this.target.z ) ; }
		if ( data.yaw ) { camera.alpha = alpha ; }
		if ( data.pitch ) { camera.beta = beta ; }
		if ( data.distance ) { camera.radius = this.distance ; }
	}
} ;


},{"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],2:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GTransition = require( './GTransition.js' ) ;
const Parametric = require( './Parametric.js' ) ;

const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
function GEntity( dom , gScene , data ) {
	this.id = data.id || null ;
	this.dom = dom ;	// Dom instance, immutable
	this.gScene = gScene ;
	this.usage = data.usage || 'sprite' ;	// immutable
	this.transient = data.transient || undefined ;	// immutable
	this.parent = undefined ;	// immutable, set later in the constructor

	this.show = false ;
	this.persistent = true ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;	// A name, not the instance, see this.texturePackObject for the instance
	this.variant = 'default' ;	// A name, not the instance, see this.variantObject for the instance
	this.frame = 0 ;			// An index, not the instance
	this.opacity = 1 ;
	this.location = null ;
	this.origin = { x: 0 , y: 0 , z: 0 } ;
	this.position = { x: 0 , y: 0 , z: 0 } ;
	this.positionMode = 'default' ;
	this.size = { x: 1 , y: 1 , z: 1 } ;
	this.sizeMode = 'default' ;
	this.rotation = { x: 0 , y: 0 , z: 0 } ;
	this.rotationMode = 'default' ;
	this.direction = { x: 1 , y: 0 , z: 0 } ;
	this.facing = 0 ;
	this.opacity = 1 ;

	this.special = {} ;
	this.meta = {} ;
	this.engine = {} ;
	this.parametric = null ;

	// Internals

	this.clientMods = {		// Things that are not server-side
		variant: null ,		// A variant affix that is automatically computed
		xFlipVariant: null ,	// A variant that can be used flipped
		xFlip: false ,
		origin: null ,
		size: null
	} ;

	this.updateMeshNeeded = true ;
	this.updateMaterialNeeded = true ;
	this.createLightNeeded = false ;
	this.texturePackObject = null ;	// The TexturePack instance
	this.variantObject = null ;		// The Variant instance
	this.frameObject = null ;		// The Frame instance
	this.lightEmitting = false ;

	this.textureCache = {} ;
	this.textureAnimationTimer = null ;

	this.children = new Set() ;
	if ( data.parent ) { this.setParent( data.parent ) ; }

	this.babylon = {
		material: null ,
		mesh: null ,
		light: null ,	// Attached light, if any
		texture: null ,	// Only relevant for material-less entity, like particle system
		particleSystem: null
	} ;

	this.nextTextureFrame = this.nextTextureFrame.bind( this ) ;

	this.defineStates( 'loaded' , 'loading' ) ;

	if ( this.transient ) {
		setTimeout( () => this.destroy() , this.transient * 1000 ) ;
	}

	if ( this.noLocalLighting ) {
		this.gScene.noLocalLightingGEntities.add( this ) ;
		this.gScene.once( 'render' , () => this.gScene.updateLightExcludedMeshes() , { unique: true , id: 'updateLightExcludedMeshes' } ) ;
	}
}

GEntity.prototype = Object.create( Ngev.prototype ) ;
GEntity.prototype.constructor = GEntity ;

module.exports = GEntity ;



GEntity.prototype.localBBoxSize = 1 ;
GEntity.prototype.noLocalLighting = false ;		// Is it sensible to local lights (point-light/spot-light)?
GEntity.prototype.isLocalLight = true ;		// Is it a local light (point-light/spot-light)?



// TODO
GEntity.prototype.destroy = function() {
	if ( this.noLocalLighting ) {
		this.gScene.noLocalLightingGEntities.remove( this ) ;
		this.gScene.once( 'render' , () => this.gScene.updateLightExcludedMeshes() , { unique: true , id: 'updateLightExcludedMeshes' } ) ;
	}

	if ( this.children.size ) {
		for ( let child of this.children ) {
			child.destroy() ;
		}
	}

	if ( this.babylon.mesh ) {
		this.babylon.mesh.parent = null ;
		this.babylon.mesh.dispose() ;
		this.babylon.mesh = null ;
	}

	if ( this.babylon.material ) {
		this.babylon.material.dispose(
			false , // forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true    // notBoundToMesh
		) ;
		this.babylon.material = null ;
	}

	if ( this.babylon.texture ) {
		this.babylon.texture.dispose() ;
		this.babylon.texture = null ;
	}

	if ( this.babylon.particleSystem ) {
		this.babylon.particleSystem.dispose() ;
		this.babylon.particleSystem = null ;
	}

	this.gScene.removeGEntity( this.id ) ;
	this.destroyed = true ;
} ;



GEntity.prototype.setParent = function( parentId ) {
	var parent = this.gScene.gEntities[ parentId ] ;
	if ( ! parent ) { return ; }
	this.parent = parent ;
	parent.addChild( this ) ;
} ;



GEntity.prototype.addChild = function( child ) {
	// Derivated class may have specific works here...
	this.children.add( child ) ;
} ;



// !THIS SHOULD TRACK SERVER-SIDE GEntity! spellcast/lib/gfx/GEntity.js
GEntity.prototype.update = async function( data , awaiting = false , initial = false ) {
	console.warn( "3D GEntity.update()" , data ) ;

	if ( data.transition ) {
		if ( initial ) { delete data.transition ; }
		else { data.transition = new GTransition( data.transition ) ; }
	}

	// Structural/discrete part

	if ( data.engine !== undefined ) { await this.updateEngine( data.engine ) ; }

	if ( data.special !== undefined ) { await this.updateSpecialStage1( data ) ; }

	if ( data.texturePack !== undefined || data.variant !== undefined || data.theme !== undefined ) {
		await this.updateTexture( data.texturePack , data.variant , data.theme ) ;
	}

	if ( this.updateMeshNeeded ) { await this.updateMesh() ; }
	if ( this.updateMaterialNeeded ) { await this.updateMaterial() ; }

	// /!\ This createLightNeeded thing is not coded very well, need refacto... /!\
	if ( this.createLightNeeded ) {
		this.createLightNeeded = false ;
		this.lightEmitting = true ;
		await this.createLight() ;
	}

	if ( data.special !== undefined ) { await this.updateSpecialStage2( data ) ; }

	//if ( data.button !== undefined ) { this.updateButton( data.button ) ; }

	// Continuous part

	if ( typeof data.opacity === 'number' ) { this.updateOpacity( data.opacity ) ; }

	if ( data.origin !== undefined ) { this.updateOrigin( data.origin ) ; }

	if ( data.direction !== undefined ) { this.updateDirection( data.direction ) ; }
	if ( data.facing !== undefined ) { this.updateFacing( data.facing ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) { this.updatePosition( data ) ; }
	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data.size ) ; }

	//if ( data.meta ) { this.updateMeta( data.meta ) ; }

	if ( data.parametric !== undefined ) {
		if ( ! data.parametric ) {
			if ( this.parametric ) {
				this.parametric = null ;
				this.gScene.parametricGEntities.delete( this ) ;
			}
		}
		else if ( typeof data.parametric === 'object' ) {
			if ( ! this.parametric ) {
				this.gScene.parametricGEntities.add( this ) ;
				this.parametric = new Parametric( data.parametric ) ;
			}
			else {
				this.parametric.update( data.parametric ) ;
			}
		}
		console.warn( "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 3D GEntity.update() parametric" , data ) ;
	}

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



// Not to be confused with .updateParametric() (which don't exist).
// This does not update the parametric value (done by this.parametric.update()),
// but instead update based on actual parametric formulas.
GEntity.prototype.parametricUpdate = function( absoluteT ) {
	var data = this.parametric.compute( absoluteT , this ) ;

	if ( ! data ) {
		// If data is null, then the animation have finished, we can remove it.
		this.parametric = null ;
		this.gScene.parametricGEntities.delete( this ) ;
		return ;
	}

	if ( typeof data.opacity === 'number' ) { this.updateOpacity( data.opacity , true ) ; }

	if ( data.position !== undefined || data.positionMode !== undefined ) { this.updatePosition( data , true ) ; }
	if ( data.rotation !== undefined || data.rotationMode !== undefined ) { this.updateRotation( data , true ) ; }
	if ( data.size !== undefined || data.sizeMode !== undefined ) { this.updateSize( data.size , true ) ; }
} ;



GEntity.prototype.updateEngine = function( engineData ) {} ;
GEntity.prototype.updateSpecialStage1 = function( data ) {} ;



GEntity.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special.light !== undefined ) {
		this.updateLight( data ) ;
	}

	if ( data.special && data.special.material ) {
		this.updateMaterialParams( data.special.material ) ;
	}
} ;



// By default, changing the facing direction does nothing
GEntity.prototype.updateDirection = function( direction ) { this.direction = direction ; } ;
GEntity.prototype.updateFacing = function( facing ) { this.facing = facing ; } ;
GEntity.prototype.updateMesh = function() { this.updateMeshNeeded = false ; } ;



// Refresh all the material stack, from texture to actual Babylon material
GEntity.prototype.refreshMaterial = async function() {
	this.updateTexture() ;
	if ( this.updateMaterialNeeded ) { await this.updateMaterial() ; }
} ;



// Basic/common material
GEntity.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntity.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'basicMaterial' , scene ) ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;
	material.diffuseColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.emissiveColor = new BABYLON.Color3( 0 , 0 , 0 ) ;

	material.backFaceCulling = true ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	//if ( ! mesh ) { console.warn( "@@@@@@@@@@@@@@@@@@!!!!!!!!!!! mesh undefined!" , Object.getPrototypeOf( this ).constructor.name ) ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntity.prototype.updateMaterialParams = function( params , volatile = false ) {
	var r , g , b ,
		material = this.babylon.material ;

	console.warn( "@@@@@@@@@@@@@@@@@@ updateMaterialParams()" , params ) ;
	if ( params.ambient && typeof params.ambient === 'object' ) {
		if ( ! this.special.ambient ) { this.special.ambient = { r: 1 , g: 1 , b: 1 } ; }

		r = params.ambient.r !== undefined ? params.ambient.r : this.special.ambient.r ,
		g = params.ambient.g !== undefined ? params.ambient.g : this.special.ambient.g ,
		b = params.ambient.b !== undefined ? params.ambient.b : this.special.ambient.b ;

		if ( ! volatile ) {
			this.special.ambient.r = r ;
			this.special.ambient.g = g ;
			this.special.ambient.b = b ;
		}

		material.ambientColor.set( r , g , b ) ;
	}

	if ( params.diffuse && typeof params.diffuse === 'object' ) {
		if ( ! this.special.diffuse ) { this.special.diffuse = { r: 0 , g: 0 , b: 0 } ; }

		r = params.diffuse.r !== undefined ? params.diffuse.r : this.special.diffuse.r ,
		g = params.diffuse.g !== undefined ? params.diffuse.g : this.special.diffuse.g ,
		b = params.diffuse.b !== undefined ? params.diffuse.b : this.special.diffuse.b ;

		if ( ! volatile ) {
			this.special.diffuse.r = r ;
			this.special.diffuse.g = g ;
			this.special.diffuse.b = b ;
		}

		material.diffuseColor.set( r , g , b ) ;
	}

	if ( params.specular && typeof params.specular === 'object' ) {
		if ( ! this.special.specular ) { this.special.specular = { r: 0 , g: 0 , b: 0 } ; }

		r = params.specular.r !== undefined ? params.specular.r : this.special.specular.r ,
		g = params.specular.g !== undefined ? params.specular.g : this.special.specular.g ,
		b = params.specular.b !== undefined ? params.specular.b : this.special.specular.b ;

		if ( ! volatile ) {
			this.special.specular.r = r ;
			this.special.specular.g = g ;
			this.special.specular.b = b ;
		}

		material.specularColor.set( r , g , b ) ;
	}

	if ( params.emissive && typeof params.emissive === 'object' ) {
		console.warn( "@@@@@@@@@@@@@@@@@@ updateMaterialParams() emissive" , params.emissive ) ;
		if ( ! this.special.emissive ) { this.special.emissive = { r: 0 , g: 0 , b: 0 } ; }

		r = params.emissive.r !== undefined ? params.emissive.r : this.special.emissive.r ,
		g = params.emissive.g !== undefined ? params.emissive.g : this.special.emissive.g ,
		b = params.emissive.b !== undefined ? params.emissive.b : this.special.emissive.b ;

		if ( ! volatile ) {
			this.special.emissive.r = r ;
			this.special.emissive.g = g ;
			this.special.emissive.b = b ;
		}

		material.emissiveColor.set( r , g , b ) ;
	}
} ;



GEntity.prototype.updateOpacity = function( opacity , volatile = false ) {
	var material = this.babylon.material ;
	if ( ! material ) { return ; }

	if ( opacity < 0 ) { opacity = 0 ; }
	else if ( opacity > 1 ) { opacity = 1 ; }

	if ( ! volatile ) { this.opacity = opacity ; }
	material.alpha = opacity ;
} ;



// Update the gEntity's texture
// frameIndex is optional, in this case either it does not change if variant remains unchanged, or it default to 0
GEntity.prototype.updateTexture = function( texturePackId , variantId , themeId , frameIndex , keepAnimationSchedule = false ) {
	var texturePack , variant , frame ;

	if ( texturePackId !== undefined ) { this.texturePack = texturePackId || null ; }
	if ( variantId !== undefined ) { this.variant = variantId || null ; }
	if ( themeId !== undefined ) { this.theme = themeId || null ; }

	console.warn( "3D GEntity.updateTexture()" , texturePackId , variantId , themeId ) ;

	texturePack = this.gScene.texturePacks[ this.texturePack + '/' + ( this.theme || this.gScene.theme ) ] ;

	if ( ! texturePack ) {
		console.warn( "3D Texture pack" , this.texturePack + '/' + ( this.theme || this.gScene.theme ) , "not found" ) ;
		texturePack = this.gScene.texturePacks[ this.texturePack + '/default' ] ;

		if ( ! texturePack ) {
			console.warn( "3D Texture pack fallback" , this.texturePack + '/default' , "not found" ) ;
			return ;
		}
	}


	var oldXFlip = this.clientMods.xFlip ;
	this.clientMods.xFlip = false ;

	if ( this.clientMods.variant ) {
		variant = texturePack.variants[ this.variant + '@' + this.clientMods.variant ] ;
		if ( ! variant ) {
			variant = texturePack.variants[ this.variant + '@' + this.clientMods.xFlipVariant ] ;

			if ( variant ) {
				this.clientMods.xFlip = true ;
			}
			else {
				variant = texturePack.variants[ this.variant ] || texturePack.variants.default ;
			}
		}
	}
	else {
		variant = texturePack.variants[ this.variant ] || texturePack.variants.default ;
	}

	//console.warn( "@@@@@@@@@@ variant" , this.clientMods.variant ? this.variant + '@' + this.clientMods.variant : this.variant ) ;

	if ( ! variant ) {
		console.warn( "3D Texture pack variant" , this.variant , "not found, and default variant missing too" ) ;
		return ;
	}

	if ( variant === this.variantObject ) {
		if ( frameIndex !== undefined ) {
			this.frame = variant.frames[ frameIndex ] ? + frameIndex : 0 ;
		}
	}
	else {
		this.frame = frameIndex !== undefined && variant.frames[ frameIndex ] ? + frameIndex : 0 ;
	}

	frame = variant.frames[ this.frame ] || variant.frames[ 0 ] ;

	// Preloading the texturePack on change
	if ( texturePack !== this.texturePackObject ) {
		this.whenTextureCacheReady().then( () => {
			// Check that the texturePack has not changed in between, otherwise it would be useless
			if ( texturePack === this.texturePackObject ) { this.preloadTexturePack() ; }
		} ) ;
	}

	// Check if something changed
	if (
		texturePack === this.texturePackObject && variant === this.variantObject &&
		frame === this.frameObject && oldXFlip === this.clientMods.xFlip
	) {
		return ;
	}

	this.texturePackObject = texturePack ;
	this.variantObject = variant ;
	this.frameObject = frame ;

	if ( this.variantObject.animation ) {
		this.startTextureAnimation( ! keepAnimationSchedule ) ;
	}
	else {
		this.stopTextureAnimation() ;
	}

	this.updateMaterialNeeded = true ;
} ;



GEntity.prototype.startTextureAnimation = function( reset = false ) {
	//console.warn( "_____________________________ startTextureAnimation" , this.variantObject , this.variantObject.animation ) ;
	if ( ! this.variantObject.animation ) {
		if ( this.textureAnimationTimer ) {
			clearTimeout( this.textureAnimationTimer ) ;
			this.textureAnimationTimer = null ;
		}

		return ;
	}

	if ( this.textureAnimationTimer ) {
		if ( ! reset ) { return ; }
		clearTimeout( this.textureAnimationTimer ) ;
		this.textureAnimationTimer = null ;
	}

	//console.warn( "_____________________________ startTextureAnimation: ok for" , this.frameObject.duration ) ;
	this.textureAnimationTimer = setTimeout( this.nextTextureFrame , 1000 * this.frameObject.duration ) ;
} ;



GEntity.prototype.stopTextureAnimation = function() {
	//console.warn( "_____________________________ stopTextureAnimation" ) ;
	if ( this.textureAnimationTimer ) {
		clearTimeout( this.textureAnimationTimer ) ;
		this.textureAnimationTimer = null ;
	}
} ;



GEntity.prototype.nextTextureFrame = function() {
	//console.warn( "___________________________ nextTextureFrame BEFORE" , this.frame , this.frameObject ) ;
	if ( this.frame >= this.variantObject.frames.length - 1 ) {
		if ( this.variantObject.animation === 'loop' ) {
			this.frame = 0 ;
		}
		else {
			this.stopTextureAnimation() ;
			return ;
		}
	}
	else {
		this.frame ++ ;
	}

	this.frameObject = this.variantObject.frames[ this.frame ] ;
	//console.warn( "___________________________ nextTextureFrame AFTER" , this.frame , this.frameObject ) ;
	this.textureAnimationTimer = setTimeout( this.nextTextureFrame , 1000 * this.frameObject.duration ) ;
	this.updateMaterial() ;
} ;



// Here clientMod is an override
GEntity.prototype.updateOrigin = function( newOrigin , isClientMod = false ) {
	if ( this.clientMods.origin && ! isClientMod ) {
		this.origin = newOrigin ;
		return ;
	}

	var currentOrigin = this.clientMods.origin || this.origin ;

	// First check if there is a difference between them...
	if ( currentOrigin.x === newOrigin.x && currentOrigin.y === newOrigin.y && currentOrigin.z === newOrigin.z ) { return ; }

	var mesh = this.babylon.mesh ,
		rate = this.localBBoxSize / 2 ;

	// For each axis, 0 is middle of BBox, -1 is lower bound, +1 is upper bound
	mesh.bakeTransformIntoVertices( BABYLON.Matrix.Translation(
		( currentOrigin.x - newOrigin.x ) * rate ,
		( currentOrigin.y - newOrigin.y ) * rate ,
		( currentOrigin.z - newOrigin.z ) * rate
	) ) ;

	if ( isClientMod ) { this.clientMods.origin = newOrigin ; }
	else { this.origin = newOrigin ; }
} ;



GEntity.prototype.updatePosition = function( data , volatile = false ) {
	//console.warn( "3D GEntity.updatePosition()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( ! mesh ) { return ; }

	var x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ,
		z = data.position.z !== undefined ? data.position.z : this.position.z ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
		this.position.z = z ;
	}

	if ( data.transition ) {
		//console.warn( "mesh:" , mesh ) ;
		// Animation using easing

		data.transition.createAnimation(
			scene ,
			mesh ,
			'position' ,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
			new BABYLON.Vector3( x , y , z )
		) ;
	}
	else {
		mesh.position.set( x , y , z ) ;
	}
} ;



GEntity.prototype.updateRotation = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateRotation()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( ! mesh ) { return ; }

	var x = data.rotation.x !== undefined ? data.rotation.x : this.rotation.x ,
		y = data.rotation.y !== undefined ? data.rotation.y : this.rotation.y ,
		z = data.rotation.z !== undefined ? data.rotation.z : this.rotation.z ;

	if ( ! volatile ) {
		this.rotation.x = x ;
		this.rotation.y = y ;
		this.rotation.z = z ;
	}

	mesh.angle = z ;
} ;



// Here clientMod multiply over base size
GEntity.prototype.updateSize = function( size , volatile = false , isClientMod = false ) {
	console.warn( "3D GEntity.updateSize()" , size ) ;
	var x , y , z ,
		mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( isClientMod ) {
		this.clientMods.size = {
			x: size.x !== undefined ? size.x : 1 ,
			y: size.y !== undefined ? size.y : 1 ,
			z: size.z !== undefined ? size.z : 1
		} ;

		x = this.size.x ;
		y = this.size.y ;
		z = this.size.z ;
	}
	else if ( volatile ) {
		x = size.x !== undefined ? size.x : this.size.x ;
		y = size.y !== undefined ? size.y : this.size.y ;
		z = size.z !== undefined ? size.z : this.size.z ;
	}
	else {
		x = this.size.x = size.x !== undefined ? size.x : this.size.x ;
		y = this.size.y = size.y !== undefined ? size.y : this.size.y ;
		z = this.size.z = size.z !== undefined ? size.z : this.size.z ;
	}

	if ( ! mesh ) { return ; }

	if ( this.clientMods.size ) {
		x *= this.clientMods.size.x ;
		y *= this.clientMods.size.y ;
		z *= this.clientMods.size.z ;
	}

	//mesh.width = this.size.x ;
	//mesh.height = this.size.y ;
	mesh.scaling.x = x ;
	mesh.scaling.y = y ;
	mesh.scaling.z = z ;
} ;



// Light color/intensity/...
GEntity.prototype.updateLight = function( data , volatile = false ) {
	console.warn( "3D GEntity.updateLight()" , data ) ;
	if ( data.special.light === undefined ) { return ; }

	// Create/remove light
	if ( ! data.special.light !== ! this.lightEmitting ) {
		this.lightEmitting = !! data.special.light ;

		if ( ! this.lightEmitting ) {
			this.destroyLight() ;
			return ;
		}

		this.createLight() ;
	}

	if ( ! data.special.light || typeof data.special.light !== 'object' ) { return ; }

	var scene = this.gScene.babylon.scene ,
		light = this.babylon.light ;

	if ( data.special.light.diffuse && typeof data.special.light.diffuse === 'object' ) {
		this.special.light.diffuse = data.special.light.diffuse ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'diffuse' ,
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b )
			) ;
		}
		else {
			light.diffuse.set( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b ) ;
		}
	}

	if ( data.special.light.specular && typeof data.special.light.specular === 'object' ) {
		this.special.light.specular = data.special.light.specular ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'specular' ,
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( this.special.light.specular.r , this.special.light.specular.g , this.special.light.specular.b )
			) ;
		}
		else {
			light.specular.set( this.special.light.specular.r , this.special.light.specular.g , this.special.light.specular.b ) ;
		}
	}

	if ( data.special.light.intensity !== undefined ) {
		this.special.light.intensity = data.special.light.intensity ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'intensity' ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.light.intensity
			) ;
		}
		else {
			light.intensity = this.special.light.intensity ;
		}
	}
} ;



GEntity.prototype.createLight = function() {
	console.warn( "@@@@@@@@@@@@@@@@@@@@@@@@@ GEntity.createLight()" ) ;
	if ( ! this.babylon.mesh ) {
		throw new Error( "Non pure light GEntity needs a mesh to be light-emitting" ) ;
	}

	var scene = this.gScene.babylon.scene ;

	if ( ! this.special.light ) {
		this.special.light = {
			diffuse: new BABYLON.Color3( 1 , 1 , 1 ) ,
			specular: new BABYLON.Color3( 0.5 , 0.5 , 0.5 ) ,
			intensity: 1
		} ;
	}

	this.babylon.light = new BABYLON.PointLight(
		"pointLight" ,
		new BABYLON.Vector3( 0 , 0 , 0 ) ,
		scene
	) ;

	this.babylon.light.parent = this.babylon.mesh ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;

	if ( this.isLocalLight ) { this.registerLocalLight() ; }
} ;



GEntity.prototype.destroyLight = function() {
	if ( this.isLocalLight ) { this.unregisterLocalLight() ; }

	if ( this.babylon.light ) {
		this.babylon.light.dispose() ;
	}

	this.special.light = null ;
} ;



GEntity.prototype.registerLocalLight = function() {
	this.gScene.localLightGEntities.add( this ) ;
	this.babylon.light.excludedMeshes = [ ... this.gScene.noLocalLightingGEntities ].map( e => e.babylon.mesh ) ;
} ;



GEntity.prototype.unregisterLocalLight = function() {
	this.gScene.localLightGEntities.delete( this ) ;
} ;



GEntity.prototype.getTexture = function( url ) {
	var texture ,
		scene = this.gScene.babylon.scene ;

	url = this.dom.cleanUrl( url ) ;
	if ( this.textureCache[ url ] ) { return this.textureCache[ url ] ; }
	texture = this.textureCache[ url ] = new BABYLON.Texture( url , scene ) ;
	return texture ;
} ;



// Preload the whole texturePack, return a promise resolving when its done
GEntity.prototype.preloadTexturePack = function() {
	var variantName , variant , frame , mapName , textures = [] ;

	for ( variantName in this.texturePackObject.variants ) {
		variant = this.texturePackObject.variants[ variantName ] ;
		for ( frame of variant.frames ) {
			if ( frame.url ) { textures.push( this.getTexture( frame.url ) ) ; }
			if ( frame.maps ) {
				for ( mapName in frame.maps ) {
					textures.push( this.getTexture( frame.maps[ mapName ] ) ) ;
				}
			}
		}
	}

	return new Promise( resolve => BABYLON.Texture.WhenAllReady( textures , () => resolve() ) ) ;
} ;



// Return a promise resolving when all texture in the cache are ready
GEntity.prototype.whenTextureCacheReady = function() {
	return new Promise( resolve => BABYLON.Texture.WhenAllReady( [ ... Object.values( this.textureCache ) ] , () => resolve() ) ) ;
} ;



GEntity.prototype.flipTexture = function( texture , xFlip , yFlip ) {
	if ( xFlip ) {
		texture.uScale = -1 ;
		texture.uOffset = 1 ;
	}
	else {
		texture.uScale = 1 ;
		texture.uOffset = 0 ;
	}

	if ( yFlip ) {
		texture.vScale = -1 ;
		texture.vOffset = 1 ;
	}
	else {
		texture.vScale = 1 ;
		texture.vOffset = 0 ;
	}
} ;



GEntity.prototype.updateSizeFromPixelDensity = function( texture , pixelDensity ) {
	var size ;

	if ( texture.isReady() ) {
		//console.warn( "++++++++++++++++++++++++++++ Already READY" ) ;
		size = texture.getBaseSize() ;
		this.updateSize( { x: size.width / pixelDensity , y: size.height / pixelDensity } , false , true ) ;
	}
	else {
		//console.warn( "++++++++++++++++++++++++++++ When all ready: BEFORE" ) ;
		BABYLON.Texture.WhenAllReady( [ texture ] , () => {
			size = texture.getBaseSize() ;
			//console.warn( "++++++++++++++++++++++++++++ When all ready: READY" , size , size.width / this.texturePackObject.pixelDensity , size.height / this.texturePackObject.pixelDensity ) ;
			this.updateSize( { x: size.width / pixelDensity , y: size.height / pixelDensity } , false , true ) ;
		} ) ;
	}
} ;


},{"./GTransition.js":16,"./Parametric.js":17,"nextgen-events/lib/browser.js":30,"seventh":42}],3:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Promise = require( 'seventh' ) ;



/*
	Background is a 360° texture wrapped around a cylinder, a sort of skybox without zenith nor nadir.
*/

function GEntityBackground( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityBackground.prototype = Object.create( GEntity.prototype ) ;
GEntityBackground.prototype.constructor = GEntityBackground ;

module.exports = GEntityBackground ;



GEntityBackground.prototype.localBBoxSize = 1000 ;
GEntityBackground.prototype.noLocalLighting = true ;	// Not sensible to point-light/spot-light, only ambient, hemispheric and directional



// Update the gEntity's material/texture
GEntityBackground.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityBackground.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	var url = this.variantObject.frames[ 0 ].url ;
	this.babylon.material = material = new BABYLON.StandardMaterial( 'simpleMaterial' , scene ) ;
	material.backFaceCulling = true ;
	material.diffuseTexture = new BABYLON.Texture( this.dom.cleanUrl( url ) , scene ) ;
	//material.specularPower = 0 ;
	material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Use emissive instead of regular lighting?
	//material.emissiveColor = new BABYLON.Color3( 0.1 , 0.1 , 0.1 ) ;
	//material.ambientColor = new BABYLON.Color3( 1 , 0 , 0 ) ; material.disableLighting = true ;

	// TEMP!
	material.backFaceCulling = false ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityBackground.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.MeshBuilder.CreateCylinder(
		'background' ,
		{
			height: this.localBBoxSize ,
			diameter: this.localBBoxSize ,
			tessellation: 24 ,
			cap: BABYLON.Mesh.NO_CAP ,
			sideOrientation: BABYLON.Mesh.BACKSIDE
		} ,
		scene
	) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"seventh":42}],4:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



const SHAPE_CLASS = {
	sphere: 'CreateSphere'
} ;



function GEntityBasicShape( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	this.shapeClass = null ;
	this.shapeParams = {} ;
}

GEntityBasicShape.prototype = Object.create( GEntity.prototype ) ;
GEntityBasicShape.prototype.constructor = GEntityBasicShape ;

module.exports = GEntityBasicShape ;



GEntityBasicShape.prototype.updateSpecialStage1 = function( data ) {
	GEntity.prototype.updateSpecialStage1.call( this , data ) ;

	if ( data.special.shape && typeof data.special.shape === 'object' ) {
		if ( data.special.shape && SHAPE_CLASS[ data.special.shape.type ] ) {
			this.shapeClass = SHAPE_CLASS[ data.special.shape.type ] ;
		}

		Object.assign( this.shapeParams , data.special.shape ) ;
		this.updateMeshNeeded = true ;
	}
} ;



GEntityBasicShape.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	console.warn( '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ GEntityBasicShape.updateMesh()' , this.shapeClass ) ;
	if ( ! this.shapeClass ) { return ; }
	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.MeshBuilder[ this.shapeClass ]( 'basic-shape' , this.shapeParams , scene ) ;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;
	mesh.scaling.z = this.size.z ;

	console.warn( '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],5:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityDirectionalLight( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	this.updateMeshNeeded = this.updateMaterialNeeded = false ;
}

GEntityDirectionalLight.prototype = Object.create( GEntity.prototype ) ;
GEntityDirectionalLight.prototype.constructor = GEntityDirectionalLight ;

module.exports = GEntityDirectionalLight ;



GEntityDirectionalLight.prototype.isLocalLight = false ;   // It is world wide light



// Light color/intensity/...
GEntityDirectionalLight.prototype.updateLight = function( data ) {
	console.warn( "3D GEntityDirectionalLight.updateLight()" , data ) ;
	GEntity.prototype.updateLight.call( this , data ) ;

	if ( ! data.special.light || typeof data.special.light !== 'object' ) { return ; }

	var scene = this.gScene.babylon.scene ,
		light = this.babylon.light ;

	if ( data.special.light.direction && typeof data.special.light.direction === 'object' ) {
		this.special.light.direction = data.special.light.direction ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'direction' ,
				BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
				new BABYLON.Vector3( this.special.light.direction.x , this.special.light.direction.y , this.special.light.direction.z )
			) ;
		}
		else {
			light.direction.set( this.special.light.direction.x , this.special.light.direction.y , this.special.light.direction.z ) ;
		}
	}
} ;



GEntityDirectionalLight.prototype.createLight = function() {
	var scene = this.gScene.babylon.scene ;
	if ( this.babylon.light ) { console.warn( "GEntityDirectionalLight.createLight(): light is already existing" ) ; return ; }

	if ( ! this.special.light ) {
		this.special.light = {
			direction: new BABYLON.Vector3( 0 , -1 , 0 ) ,
			diffuse: new BABYLON.Color3( 1 , 1 , 1 ) ,
			specular: new BABYLON.Color3( 0 , 0 , 0 ) ,
			intensity: 0.2
		} ;
	}

	this.babylon.light = new BABYLON.DirectionalLight(
		"directionalLight" ,
		this.special.light.direction ,
		scene
	) ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;

	if ( this.isLocalLight ) { this.registerLocalLight() ; }
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],6:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityFloatingText( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.special.content = {
		text: '' ,
		textColor: 'white'
	} ;
}

GEntityFloatingText.prototype = Object.create( GEntity.prototype ) ;
GEntityFloatingText.prototype.constructor = GEntityFloatingText ;

module.exports = GEntityFloatingText ;



GEntityFloatingText.prototype.destroy = function() {
	if ( this.babylon.advancedTexture ) {
		this.babylon.advancedTexture.parent = null ;
		this.babylon.advancedTexture.dispose() ;
	}

	GEntity.prototype.destroy.call( this ) ;
} ;



// This GEntity has no texture
GEntityFloatingText.prototype.updateTexture = function() {} ;



// Update the gEntity's material/texture
GEntityFloatingText.prototype.updateMaterial = function() {
	var advancedTexture , textBlock , icon ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityFloatingText.updateMaterial()" ) ;

	if ( this.babylon.advancedTexture ) {
		advancedTexture = this.babylon.advancedTexture ;
	}
	else {
		if ( ! mesh ) { mesh = this.updateMesh() ; }
		this.babylon.advancedTexture = advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh( mesh , 1024 , 64 ) ;
	}

	if ( this.babylon.textBlock ) {
		textBlock = this.babylon.textBlock ;
	}
	else {
		this.babylon.textBlock = textBlock = new BABYLON.GUI.TextBlock() ;
		// Font size should be at most 3/4 of the texture height, but with shadow, it should be even less...
		textBlock.fontSizeInPixels = 46 ;
		//textBlock.text = "test Hq Ap|█" ;
		textBlock.text = this.special.content.text ;
		textBlock.color = this.special.content.textColor ;
		textBlock.alpha = this.opacity ;
		textBlock.resizeToFit = true ;
		advancedTexture.addControl( textBlock ) ;
	}


	//mesh.material = material ;
	//mesh.material = null ;

	this.updateMaterialNeeded = false ;
} ;



// Because font does not use 100% of height all the time...
const ICON_HEIGHT_RATIO = 0.7 ;

GEntityFloatingText.prototype.updateContent = function( content ) {
	var icon ,
		advancedTexture = this.babylon.advancedTexture ,
		textBlock = this.babylon.textBlock ;

	if ( ! textBlock ) { return ; }

	if ( content.text !== undefined ) { textBlock.text = this.special.content.text = '' + content.text ; }
	if ( typeof content.textColor === 'string' ) { textBlock.color = this.special.content.textColor = content.textColor ; }
	if ( typeof content.outlineColor === 'string' ) { textBlock.outlineColor = this.special.content.outlineColor = content.outlineColor ; }
	if ( typeof content.outlineWidth === 'number' ) { textBlock.outlineWidth = this.special.content.outlineWidth = content.outlineWidth ; }
	if ( typeof content.shadowColor === 'string' ) { textBlock.shadowColor = this.special.content.shadowColor = content.shadowColor ; }
	if ( typeof content.shadowBlur === 'number' ) { textBlock.shadowBlur = this.special.content.shadowBlur = content.shadowBlur ; }

	if ( content.icon ) {
		// /!\ Use a texture instead of a direct URL? So this could be preloaded?
		if ( this.babylon.icon ) {
			icon = this.babylon.icon ;
			icon.source = this.dom.cleanUrl( content.icon ) ;
			icon.width = ICON_HEIGHT_RATIO * 0.0625 ;
			icon.height = ICON_HEIGHT_RATIO ;
		}
		else {
			this.babylon.icon = icon = new BABYLON.GUI.Image( 'icon' , this.dom.cleanUrl( content.icon ) ) ;
			icon.width = ICON_HEIGHT_RATIO * 0.0625 ;
			icon.height = ICON_HEIGHT_RATIO ;
			advancedTexture.addControl( icon ) ;
		}

		this.fixIcon() ;
	}

	//textBlock.shadowOffsetX = textBlock.shadowOffsetY = 1 ;
	//advancedTexture.background = "rgba(255,0,255,0.2)" ;
} ;



// Internal
GEntityFloatingText.prototype.fixIcon = function() {
	// The width of the TextBlock is not correctly synchronously detected,
	// we have to wait a bit for the correct width to be computed.
	if ( this.babylon.textBlock._width.isPixel ) {
		this.babylon.icon.left = -32 - this.babylon.textBlock.widthInPixels / 2 ;
	}
	else {
		setTimeout( () => this.fixIcon() , 10 ) ;
	}
} ;



// TODO?
GEntityFloatingText.prototype.updateMaterialParams = function( params , volatile = false ) {
} ;



GEntityFloatingText.prototype.updateOpacity = function( opacity , volatile = false ) {
	if ( opacity < 0 ) { opacity = 0 ; }
	else if ( opacity > 1 ) { opacity = 1 ; }

	if ( ! volatile ) { this.opacity = opacity ; }

	// It looks like changing the opacity of the whole advancedTexture does not works, so we have to change both the text and icon
	if ( this.babylon.textBlock ) { this.babylon.textBlock.alpha = opacity ; }
	if ( this.babylon.icon ) { this.babylon.icon.alpha = opacity ; }
} ;



GEntityFloatingText.prototype.updateMesh = function() {
	var mesh , parentMesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.PlaneBuilder.CreatePlane( 'floating-text' , { width: 80 , height: 5 } , scene ) ;
	//mesh.position.x = 0 ; mesh.position.y = 10 ; mesh.position.z = 0 ;
	mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL ;

	if ( this.parent && this.parent.babylon.mesh ) {
		mesh.parent = parentMesh = this.parent.babylon.mesh ;

		// Compensate for the parent scaling which enlarge and deform the floating text
		mesh.scaling.x = 1 / parentMesh.scaling.x ;
		mesh.scaling.y = 1 / parentMesh.scaling.y ;
	}

	console.warn( 'GEntityFloatingText .updateMesh() Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



GEntityFloatingText.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special && data.special.content ) {
		this.updateContent( data.special.content ) ;
	}
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],7:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Promise = require( 'seventh' ) ;



/*
	Ground howto:
	https://doc.babylonjs.com/how_to/set_shapes#ground
	Tiled ground demo:
	https://www.babylonjs-playground.com/#1XBLWB#6
	Multi-material for tiles:
	https://makina-corpus.com/blog/metier/2014/how-to-use-multimaterials-with-a-tiled-ground-in-babylonjs
*/

function GEntityGround( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityGround.prototype = Object.create( GEntity.prototype ) ;
GEntityGround.prototype.constructor = GEntityGround ;

module.exports = GEntityGround ;



// Update the gEntity's material/texture
GEntityGround.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityGround.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	var url = this.variantObject.frames[ 0 ].url ;
	this.babylon.material = material = new BABYLON.StandardMaterial( 'simpleMaterial' , scene ) ;
	material.backFaceCulling = true ;
	//*
	material.diffuseTexture = new BABYLON.Texture( this.dom.cleanUrl( url ) , scene ) ;
	material.diffuseTexture.uScale = 20 ;
	material.diffuseTexture.vScale = 20 ;
	//material.specularPower = 0 ;
	material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;
	//*/
	/*	For instance there is only ambient light, so no need to compute multiple pass
	material.ambientTexture = new BABYLON.Texture( this.dom.cleanUrl( url ) , scene ) ;
	material.ambientTexture.uScale = 20 ;
	material.ambientTexture.vScale = 20 ;
	//*/

	// TEMP!
	material.backFaceCulling = false ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityGround.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.MeshBuilder.CreateGround(
		'ground' ,
		{ height: 1000 , width: 1000 , subdivisions: 4 } ,
		scene
	) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"seventh":42}],8:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */


const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityHemisphericLight( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	this.updateMeshNeeded = this.updateMaterialNeeded = false ;
	this.createLightNeeded = true ;
}

GEntityHemisphericLight.prototype = Object.create( GEntity.prototype ) ;
GEntityHemisphericLight.prototype.constructor = GEntityHemisphericLight ;

module.exports = GEntityHemisphericLight ;



GEntityHemisphericLight.prototype.isLocalLight = false ;   // It is world wide light



// Light color/intensity/...
GEntityHemisphericLight.prototype.updateLight = function( data ) {
	console.warn( "3D GEntityHemisphericLight.updateLight()" , data ) ;
	GEntity.prototype.updateLight.call( this , data ) ;

	if ( ! data.special.light || typeof data.special.light !== 'object' ) { return ; }

	var scene = this.gScene.babylon.scene ,
		light = this.babylon.light ;

	if ( data.special.light.ground && typeof data.special.light.ground === 'object' ) {
		this.special.light.ground = data.special.light.ground ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'groundColor' ,
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( this.special.light.ground.r , this.special.light.ground.g , this.special.light.ground.b )
			) ;
		}
		else {
			light.groundColor.set( this.special.light.ground.r , this.special.light.ground.g , this.special.light.ground.b ) ;
		}
	}

	if ( data.special.light.up && typeof data.special.light.up === 'object' ) {
		this.special.light.up = data.special.light.up ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				light ,
				'direction' ,
				BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
				new BABYLON.Vector3( this.special.light.up.x , this.special.light.up.y , this.special.light.up.z )
			) ;
		}
		else {
			light.direction.set( this.special.light.up.x , this.special.light.up.y , this.special.light.up.z ) ;
		}
	}
} ;



GEntityHemisphericLight.prototype.createLight = function() {
	var scene = this.gScene.babylon.scene ;
	if ( this.babylon.light ) { console.warn( "GEntityHemisphericLight.createLight(): light is already existing" ) ; return ; }

	if ( ! this.special.light ) {
		this.special.light = {
			up: new BABYLON.Vector3( 0 , 1 , 0 ) ,
			diffuse: new BABYLON.Color3( 1 , 1 , 1 ) ,
			specular: new BABYLON.Color3( 0 , 0 , 0 ) ,
			ground: new BABYLON.Color3( 0.2 , 0.2 , 0.2 ) ,
			intensity: 0.2
		} ;
	}

	this.babylon.light = new BABYLON.HemisphericLight(
		"hemisphericLight" ,
		this.special.light.up ,
		scene
	) ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.groundColor = this.special.light.ground ;
	this.babylon.light.intensity = this.special.light.intensity ;

	if ( this.isLocalLight ) { this.registerLocalLight() ; }
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],9:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityParticleSystem( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.special.particleSystem = {
		capacity: 100 ,
		updateRate: 1 ,
		attachToCamera: false ,
		shape: {
			type: 'box' ,
			xmin: 0 ,
			xmax: 0 ,
			ymin: 0 ,
			ymax: 0 ,
			zmin: 0 ,
			zmax: 0 ,
			minRadius: 0 ,
			maxRadius: 0
		} ,
		emitRate: 100 ,
		duration: { min: 10 , max: 10 } ,
		blendMode: BLENDMODE.default ,
		speed: {
			x: 0 , y: 0 , z: 0 , xyzmin: 1 , xyzmax: 1
		} ,
		altSpeed: null ,	// { x: 0 , y: 0 , z: 0 } ,
		rotation: { min: 0 , max: 0 } ,
		rotationSpeed: { min: 0 , max: 0 } ,
		acceleration: { x: 0 , y: 0 , z: 0 } ,
		size: {
			xmin: 1 , xmax: 1 , ymin: 1 , ymax: 1 , xymin: 1 , xymax: 1
		} ,
		color: {
			r: 1 , g: 1 , b: 1 , a: 1
		} ,
		altColor: null ,	// { r: 1 , g: 1 , b: 1 , a: 1 } ,
		endColor: null ,	// { r: 1 , g: 1 , b: 1 , a: 1 } ,
		autoFacing: 'all'
	} ;

	this.emitterShape = 'box' ;
}

GEntityParticleSystem.prototype = Object.create( GEntity.prototype ) ;
GEntityParticleSystem.prototype.constructor = GEntityParticleSystem ;

module.exports = GEntityParticleSystem ;



const BLENDMODE = {
	add: BABYLON.ParticleSystem.BLENDMODE_ADD ,
	multiply: BABYLON.ParticleSystem.BLENDMODE_MULTIPLY ,
	multiplyAdd: BABYLON.ParticleSystem.BLENDMODE_MULTIPLYADD ,
	oneOne: BABYLON.ParticleSystem.BLENDMODE_ONEONE ,
	standard: BABYLON.ParticleSystem.BLENDMODE_STANDARD
} ;

BLENDMODE.default = BLENDMODE.standard ;



const EMITTER_SHAPE = {
	box: 'box' ,
	sphere: 'sphere'
} ;



const AUTOFACING = {
	none: 'none' ,
	all: 'all' ,
	'all-axis': 'all' ,
	y: 'y' ,
	'y-axis': 'y'
} ;



GEntityParticleSystem.prototype.updateSpecialStage2 = function( data ) {
	var pData , newPData ;

	GEntity.prototype.updateSpecialStage2.call( this , data ) ;

	if ( data.special.particleSystem && typeof data.special.particleSystem === 'object' ) {
		newPData = data.special.particleSystem ;
		pData = this.special.particleSystem ;

		// Fix/manage
		if ( Number.isFinite( newPData.capacity ) ) { pData.capacity = newPData.capacity ; }
		if ( Number.isFinite( newPData.updateRate ) ) { pData.updateRate = newPData.updateRate ; }
		if ( typeof newPData.attachToCamera === 'boolean' ) { pData.attachToCamera = newPData.attachToCamera ; }

		if ( newPData.shape && typeof newPData.shape === 'object' ) {
			if ( newPData.shape.type && EMITTER_SHAPE[ newPData.shape.type ] ) { pData.shape.type = EMITTER_SHAPE[ newPData.shape.type ] ; }
			if ( Number.isFinite( newPData.shape.xmin ) ) { pData.shape.xmin = newPData.shape.xmin ; }
			if ( Number.isFinite( newPData.shape.ymin ) ) { pData.shape.ymin = newPData.shape.ymin ; }
			if ( Number.isFinite( newPData.shape.zmin ) ) { pData.shape.zmin = newPData.shape.zmin ; }
			if ( Number.isFinite( newPData.shape.xmax ) ) { pData.shape.xmax = newPData.shape.xmax ; }
			if ( Number.isFinite( newPData.shape.ymax ) ) { pData.shape.ymax = newPData.shape.ymax ; }
			if ( Number.isFinite( newPData.shape.zmax ) ) { pData.shape.zmax = newPData.shape.zmax ; }

			if ( Number.isFinite( newPData.shape.minRadius ) ) { pData.shape.minRadius = newPData.shape.minRadius ; }
			if ( Number.isFinite( newPData.shape.maxRadius ) ) { pData.shape.maxRadius = newPData.shape.maxRadius ; }
			else if ( Number.isFinite( newPData.shape.radius ) ) { pData.shape.maxRadius = newPData.shape.radius ; }
		}

		if ( Number.isFinite( newPData.emitRate ) ) { pData.emitRate = newPData.emitRate ; }

		if ( newPData.duration !== undefined ) {
			if ( typeof newPData.duration === 'object' ) {
				if ( Number.isFinite( newPData.duration.min ) ) { pData.duration.min = newPData.duration.min ; }
				if ( Number.isFinite( newPData.duration.max ) ) { pData.duration.max = newPData.duration.max ; }
			}
			else if ( Number.isFinite( newPData.duration ) ) {
				pData.duration.min = pData.duration.max = newPData.duration ;
			}
		}

		if ( newPData.blendMode && BLENDMODE[ newPData.blendMode ] ) { pData.blendMode = BLENDMODE[ newPData.blendMode ] ; }

		if ( newPData.speed && typeof newPData.speed === 'object' ) {
			if ( Number.isFinite( newPData.speed.x ) ) { pData.speed.x = newPData.speed.x ; }
			if ( Number.isFinite( newPData.speed.y ) ) { pData.speed.y = newPData.speed.y ; }
			if ( Number.isFinite( newPData.speed.z ) ) { pData.speed.z = newPData.speed.z ; }
			if ( Number.isFinite( newPData.speed.xyzmin ) ) { pData.speed.xyzmin = newPData.speed.xyzmin ; }
			if ( Number.isFinite( newPData.speed.xyzmax ) ) { pData.speed.xyzmax = newPData.speed.xyzmax ; }
		}

		if ( newPData.altSpeed === null ) {
			pData.altSpeed = null ;
		}
		else if ( newPData.altSpeed && typeof newPData.altSpeed === 'object' ) {
			if ( ! pData.altSpeed ) { pData.altSpeed = { x: 0 , y: 0 , z: 0 } ; }
			if ( Number.isFinite( newPData.altSpeed.x ) ) { pData.altSpeed.x = newPData.altSpeed.x ; }
			if ( Number.isFinite( newPData.altSpeed.y ) ) { pData.altSpeed.y = newPData.altSpeed.y ; }
			if ( Number.isFinite( newPData.altSpeed.z ) ) { pData.altSpeed.z = newPData.altSpeed.z ; }
		}

		if ( newPData.acceleration && typeof newPData.acceleration === 'object' ) {
			if ( Number.isFinite( newPData.acceleration.x ) ) { pData.acceleration.x = newPData.acceleration.x ; }
			if ( Number.isFinite( newPData.acceleration.y ) ) { pData.acceleration.y = newPData.acceleration.y ; }
			if ( Number.isFinite( newPData.acceleration.z ) ) { pData.acceleration.z = newPData.acceleration.z ; }
		}

		if ( newPData.rotation !== undefined ) {
			if ( typeof newPData.rotation === 'object' ) {
				if ( Number.isFinite( newPData.rotation.min ) ) { pData.rotation.min = newPData.rotation.min ; }
				if ( Number.isFinite( newPData.rotation.max ) ) { pData.rotation.max = newPData.rotation.max ; }
			}
			else if ( Number.isFinite( newPData.rotation ) ) {
				pData.rotation.min = pData.rotation.max = newPData.rotation ;
			}
		}

		if ( newPData.rotationSpeed !== undefined ) {
			if ( typeof newPData.rotationSpeed === 'object' ) {
				if ( Number.isFinite( newPData.rotationSpeed.min ) ) { pData.rotationSpeed.min = newPData.rotationSpeed.min ; }
				if ( Number.isFinite( newPData.rotationSpeed.max ) ) { pData.rotationSpeed.max = newPData.rotationSpeed.max ; }
			}
			else if ( Number.isFinite( newPData.rotationSpeed ) ) {
				pData.rotationSpeed.min = pData.rotationSpeed.max = newPData.rotationSpeed ;
			}
		}

		if ( newPData.size && typeof newPData.size === 'object' ) {
			if ( Number.isFinite( newPData.size.x ) ) {
				pData.size.xmin = pData.size.xmax = newPData.size.x ;
			}
			else {
				if ( Number.isFinite( newPData.size.xmin ) ) { pData.size.xmin = newPData.size.xmin ; }
				if ( Number.isFinite( newPData.size.xmax ) ) { pData.size.xmax = newPData.size.xmax ; }
			}

			if ( Number.isFinite( newPData.size.y ) ) {
				pData.size.ymin = pData.size.ymax = newPData.size.y ;
			}
			else {
				if ( Number.isFinite( newPData.size.ymin ) ) { pData.size.ymin = newPData.size.ymin ; }
				if ( Number.isFinite( newPData.size.ymax ) ) { pData.size.ymax = newPData.size.ymax ; }
			}

			if ( Number.isFinite( newPData.size.xy ) ) {
				pData.size.xymin = pData.size.xymax = newPData.size.xy ;
			}
			else {
				if ( Number.isFinite( newPData.size.xymin ) ) { pData.size.xymin = newPData.size.xymin ; }
				if ( Number.isFinite( newPData.size.xymax ) ) { pData.size.xymax = newPData.size.xymax ; }
			}
		}

		if ( newPData.color && typeof newPData.color === 'object' ) {
			if ( Number.isFinite( newPData.color.r ) ) { pData.color.r = newPData.color.r ; }
			if ( Number.isFinite( newPData.color.g ) ) { pData.color.g = newPData.color.g ; }
			if ( Number.isFinite( newPData.color.b ) ) { pData.color.b = newPData.color.b ; }
			if ( Number.isFinite( newPData.color.a ) ) { pData.color.a = newPData.color.a ; }
		}

		if ( newPData.altColor === null ) {
			pData.altColor = null ;
		}
		else if ( newPData.altColor && typeof newPData.altColor === 'object' ) {
			if ( ! pData.altColor ) { pData.altColor = { r: 1 , g: 1 , b: 1 , a: 1 } ; }
			if ( Number.isFinite( newPData.altColor.r ) ) { pData.altColor.r = newPData.altColor.r ; }
			if ( Number.isFinite( newPData.altColor.g ) ) { pData.altColor.g = newPData.altColor.g ; }
			if ( Number.isFinite( newPData.altColor.b ) ) { pData.altColor.b = newPData.altColor.b ; }
			if ( Number.isFinite( newPData.altColor.a ) ) { pData.altColor.a = newPData.altColor.a ; }
		}

		if ( newPData.endColor === null ) {
			pData.endColor = null ;
		}
		else if ( newPData.endColor && typeof newPData.endColor === 'object' ) {
			if ( ! pData.endColor ) { pData.endColor = { r: 1 , g: 1 , b: 1 , a: 1 } ; }
			if ( Number.isFinite( newPData.endColor.r ) ) { pData.endColor.r = newPData.endColor.r ; }
			if ( Number.isFinite( newPData.endColor.g ) ) { pData.endColor.g = newPData.endColor.g ; }
			if ( Number.isFinite( newPData.endColor.b ) ) { pData.endColor.b = newPData.endColor.b ; }
			if ( Number.isFinite( newPData.endColor.a ) ) { pData.endColor.a = newPData.endColor.a ; }
		}

		if ( newPData.autoFacing !== undefined ) {
			if ( newPData.autoFacing && AUTOFACING[ newPData.autoFacing ] ) { pData.autoFacing = AUTOFACING[ newPData.autoFacing ] ; }
			else if ( newPData.autoFacing ) { pData.autoFacing = 'all' ; }
			else { pData.autoFacing = 'none' ; }
		}
		
		console.warn( "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ data.special.particleSystem" , this.special.particleSystem ) ;

		this.updateParticleSystem() ;
	}
} ;



GEntityParticleSystem.prototype.updateParticleSystem = function() {
	var texture , particleSystem , emitter ,
		fixedDirection = false ,
		pData = this.special.particleSystem ,
		scene = this.gScene.babylon.scene ;

	console.warn( "3D GEntityParticleSystem.updateParticleSystem()" , this.texturePackObject , this.variantObject ) ;

	if ( this.babylon.texture ) { this.babylon.texture.dispose() ; }
	if ( this.babylon.particleSystem ) { this.babylon.particleSystem.dispose() ; }

	var url = this.variantObject.frames[ 0 ].url ;
	this.babylon.texture = texture = new BABYLON.Texture( this.dom.cleanUrl( url ) , scene ) ;

	// Create a particle system
	this.babylon.particleSystem = particleSystem =
		// For instance, GPU particles doesn't work with LUT... -_-'
		//BABYLON.GPUParticleSystem.IsSupported ? new BABYLON.GPUParticleSystem( "particles" , pData.capacity ) :
		new BABYLON.ParticleSystem( "particles" , pData.capacity ) ;

	// Global speed multiplier
	particleSystem.updateSpeed = pData.updateRate * 0.01 ;

	// Texture of each particle
	particleSystem.particleTexture = texture ;

	// Position where the particles are emitted from
	if ( pData.attachToCamera ) {
		particleSystem.emitter = this.gScene.globalCamera.babylon.camera ;
	}
	else {
		// Should used origin
		particleSystem.emitter = new BABYLON.Vector3( 0 , 0 , 0 ) ;
	}

	this.emitterShape = pData.shape.type ;

	switch ( this.emitterShape ) {
		case 'box' :
			particleSystem.minEmitBox = new BABYLON.Vector3( pData.shape.xmin , pData.shape.ymin , pData.shape.zmin ) ;
			particleSystem.maxEmitBox = new BABYLON.Vector3( pData.shape.xmax , pData.shape.ymax , pData.shape.zmax ) ;
			break ;
		case 'sphere' :
			fixedDirection = true ;
			emitter = particleSystem.createSphereEmitter() ;
			emitter.radius = pData.shape.maxRadius ;
			emitter.radiusRange = 1 - ( pData.shape.minRadius / pData.shape.maxRadius ) ;
			break ;
	}

	particleSystem.emitRate = pData.emitRate ;
	particleSystem.minLifeTime = pData.duration.min ;
	particleSystem.maxLifeTime = pData.duration.max ;
	//particleSystem.minEmitPower / particleSystem.maxEmitPower seems to multiply the speed vector

	particleSystem.blendMode = pData.blendMode ;

	//particleSystem.targetStopDuration = 0 ;	// Duration of the particle system

	// Particle movement
	if ( ! fixedDirection ) {
		particleSystem.direction1 = new BABYLON.Vector3( pData.speed.x , + pData.speed.y , + pData.speed.z ) ;
		particleSystem.direction2 = 
			pData.altSpeed ? new BABYLON.Vector3( pData.altSpeed.x , pData.altSpeed.y , pData.altSpeed.z ) :
			new BABYLON.Vector3( pData.speed.x , + pData.speed.y , + pData.speed.z ) ;
	}

	particleSystem.minEmitPower = pData.speed.xyzmin ;
	particleSystem.maxEmitPower = pData.speed.xyzmax ;
	particleSystem.minInitialRotation = pData.rotation.min ;
	particleSystem.maxInitialRotation = pData.rotation.max ;
	particleSystem.minAngularSpeed = pData.rotationSpeed.min ;
	particleSystem.maxAngularSpeed = pData.rotationSpeed.max ;
	particleSystem.gravity = new BABYLON.Vector3( pData.acceleration.x , pData.acceleration.y , pData.acceleration.z ) ;

	// Sprite scaling
	particleSystem.minSize = pData.size.xymin ;
	particleSystem.maxSize = pData.size.xymax ;
	particleSystem.minScaleX = pData.size.xmin ;
	particleSystem.maxScaleX = pData.size.xmax ;
	particleSystem.minScaleY = pData.size.ymin ;
	particleSystem.maxScaleY = pData.size.ymax ;

	// Color tinting
	particleSystem.color1 = new BABYLON.Color4( pData.color.r , pData.color.g , pData.color.b , pData.color.a ) ;
	particleSystem.color2 =
		pData.altColor ? new BABYLON.Color4( pData.altColor.r , pData.altColor.g , pData.altColor.b , pData.altColor.a ) :
		new BABYLON.Color4( pData.color.r , pData.color.g , pData.color.b , pData.color.a ) ;
	particleSystem.colorDead =
		pData.endColor ? new BABYLON.Color4( pData.endColor.r , pData.endColor.g , pData.endColor.b , pData.endColor.a ) :
		new BABYLON.Color4( pData.color.r , pData.color.g , pData.color.b , pData.color.a ) ;

	switch ( pData.autoFacing ) {
		case 'none' :
			particleSystem.isBillboardBased = false ;
			break ;
		case 'y' :
			particleSystem.isBillboardBased = true ;
			particleSystem.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_Y ;
			break ;
		case 'all' :
		default :
			particleSystem.isBillboardBased = true ;
			particleSystem.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_ALL ;
			break ;
	}

	particleSystem.start() ;
} ;



GEntityParticleSystem.prototype.updateMaterial = function() {
	this.updateMaterialNeeded = false ;
	return ;
} ;



GEntityParticleSystem.prototype.updateMesh = function() {
	this.updateMeshNeeded = false ;
	return ;
} ;



GEntityParticleSystem.prototype.updateOrigin = function( newOrigin , isClientMod = false ) {
} ;



GEntityParticleSystem.prototype.updatePosition = function( data , volatile = false ) {
	//console.warn( "3D GEntityParticleSystem.updatePosition()" , data ) ;
	var particleSystem = this.babylon.particleSystem ,
		scene = this.gScene.babylon.scene ;

	if ( ! particleSystem || this.special.particleSystem.attachToCamera ) { return ; }

	var x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ,
		z = data.position.z !== undefined ? data.position.z : this.position.z ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
		this.position.z = z ;
	}

	if ( data.transition ) {
		//console.warn( "mesh:" , mesh ) ;
		// Animation using easing

		data.transition.createAnimation(
			scene ,
			particleSystem.emitter ,
			'position' ,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
			new BABYLON.Vector3( x , y , z )
		) ;
	}
	else {
		particleSystem.emitter.set( x , y , z ) ;
	}
} ;



GEntityParticleSystem.prototype.updateRotation = function( data , volatile = false ) {
} ;



GEntityParticleSystem.prototype.updateSize = function( size , volatile = false , isClientMod = false ) {
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],10:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityPointLight( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	this.updateMeshNeeded = this.updateMaterialNeeded = false ;
}

GEntityPointLight.prototype = Object.create( GEntity.prototype ) ;
GEntityPointLight.prototype.constructor = GEntityPointLight ;

module.exports = GEntityPointLight ;



GEntityPointLight.prototype.isLocalLight = true ;	// It is a local light



GEntityPointLight.prototype.updatePosition = function( data , volatile = false ) {
	//console.warn( "3D GEntityPointLight.updatePosition()" , data ) ;
	var light = this.babylon.light ,
		scene = this.gScene.babylon.scene ;

	if ( ! light ) { return ; }

	var x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ,
		z = data.position.z !== undefined ? data.position.z : this.position.z ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
		this.position.z = z ;
	}

	if ( data.transition ) {
		//console.warn( "light:" , light ) ;
		// Animation using easing

		data.transition.createAnimation(
			scene ,
			light ,
			'position' ,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ,
			new BABYLON.Vector3( x , y , z )
		) ;
	}
	else {
		light.position.set( x , y , z ) ;
	}
} ;



// Re-use base GEntity .updateLight()
//GEntityPointLight.prototype.updateLight = function( data , volatile = false )

GEntityPointLight.prototype.updateMaterialParams = function() {} ;



GEntityPointLight.prototype.createLight = function() {
	var scene = this.gScene.babylon.scene ;
	if ( this.babylon.light ) { console.warn( "GEntityPointLight.createLight(): light is already existing" ) ; return ; }

	if ( ! this.special.light ) {
		this.special.light = {
			diffuse: new BABYLON.Color3( 1 , 1 , 1 ) ,
			specular: new BABYLON.Color3( 0.5 , 0.5 , 0.5 ) ,
			intensity: 1
		} ;
	}

	this.babylon.light = new BABYLON.PointLight(
		"pointLight" ,
		new BABYLON.Vector3( this.position.x , this.position.y , this.position.z ) ,
		scene
	) ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;

	if ( this.isLocalLight ) { this.registerLocalLight() ; }
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],11:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityShadow( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityShadow.prototype = Object.create( GEntity.prototype ) ;
GEntityShadow.prototype.constructor = GEntityShadow ;

module.exports = GEntityShadow ;



// Update the gEntity's material/texture
GEntityShadow.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;

	material.diffuseColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.diffuseColor = new BABYLON.Color3( 0.5 , 0.5 , 0.5 ) ;
	//material.diffuseTexture.hasAlpha = true ;
	//material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	material.disableLighting = true ;
	//material.alpha = 0.5 ;

	material.opacityTexture = new BABYLON.Texture( '/textures/shadow.png' , scene ) ;
	material.opacityTexture.wrapU = material.opacityTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	// /!\ TEMP! Easier to debug!
	//material.backFaceCulling = false ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityShadow.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'shadow' , undefined , scene ) ;	//, true ) ;

	// Make the plane parallel to the ground, and apply (“bake”) to the mesh
	mesh.rotation.x = Math.PI / 2 ;
	//mesh.position.x = 0.5 ;
	//mesh.position.z = 0.5 ;
	mesh.bakeCurrentTransformIntoVertices() ;

	mesh.scaling.x = this.size.x ;
	//mesh.scaling.y = this.size.y ;
	mesh.scaling.z = this.size.z ;

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],12:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntitySpotLight( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	this.updateMeshNeeded = this.updateMaterialNeeded = false ;
	console.error( "Not supported ATM!" ) ;
}

GEntitySpotLight.prototype = Object.create( GEntity.prototype ) ;
GEntitySpotLight.prototype.constructor = GEntitySpotLight ;

module.exports = GEntitySpotLight ;

/*
	TODO!
*/


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],13:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntitySprite( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.autoFacing = this.autoFacing.bind( this ) ;
	//this.babylon.billboardOrigin = new BABYLON.Vector3( 0 , 0 , 0 ) ;
}

GEntitySprite.prototype = Object.create( GEntity.prototype ) ;
GEntitySprite.prototype.constructor = GEntitySprite ;

module.exports = GEntitySprite ;



GEntitySprite.prototype.updateSpecialStage1 = function( data ) {
	GEntity.prototype.updateSpecialStage1.call( this , data ) ;

	if (
		data.special.spriteAutoFacing !== undefined
		&& ( data.special.spriteAutoFacing === false || vectorUtils.degToSector[ data.special.spriteAutoFacing ] )
		&& data.special.spriteAutoFacing !== this.special.spriteAutoFacing
	) {
		this.special.spriteAutoFacing = data.special.spriteAutoFacing ;

		//console.warn( "@@@@@@@@@@ data.special.spriteAutoFacing" , this.special.spriteAutoFacing ) ;
		if ( this.special.spriteAutoFacing ) {
			this.gScene.on( 'render' , this.autoFacing ) ;
		}
		else {
			this.gScene.off( 'render' , this.autoFacing ) ;
		}
	}
} ;



GEntitySprite.prototype.updateFacing = function( facing ) {
	this.facing = facing ;
	if ( this.special.spriteAutoFacing ) { this.autoFacing() ; }
} ;



// Update the gEntity's material/texture
GEntitySprite.prototype.updateMaterial = async function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntitySprite.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var diffuseUrl = ( this.frameObject.maps && ( this.frameObject.maps.diffuse || this.frameObject.maps.albedo ) ) || this.frameObject.url ;

	//material.diffuseTexture = new BABYLON.Texture( this.dom.cleanUrl( diffuseUrl ) , scene ) ;
	material.diffuseTexture = this.getTexture( diffuseUrl ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	// Normal/Bump
	var bumpUrl = this.frameObject.maps && ( this.frameObject.maps.normal || this.frameObject.maps.bump ) ;
	if ( bumpUrl ) {
		//material.bumpTexture = new BABYLON.Texture( this.dom.cleanUrl( bumpUrl ) , scene ) ;
		material.bumpTexture = this.getTexture( bumpUrl ) ;
		material.bumpTexture.wrapU = material.bumpTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

		// BABYLONJS use DirectX normalmap, but most software export OpenGL normalmap
		material.invertNormalMapX = true ;
		material.invertNormalMapY = true ;
	}

	// Specular
	var specularUrl = this.frameObject.maps && this.frameObject.maps.specular ;
	if ( specularUrl ) {
		//material.specularTexture = new BABYLON.Texture( this.dom.cleanUrl( specularUrl ) , scene ) ;
		material.specularTexture = this.getTexture( specularUrl ) ;
		material.specularTexture.wrapU = material.specularTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;
		//material.specularPower = 1 ;
		material.useGlossinessFromSpecularMapAlpha = true ;
	}
	else {
		//material.specularPower = 0 ;	// This is the sharpness of the highlight
		material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	}

	/*
		Also:
			.ambientTexture is for ambient/occlusion
			.emissiveTexture
			.lightmapTexture
			.reflectionTexture
			.refractionTexture

	*/

	// X-flip and Y-Flip
	var xFlip = ! this.frameObject.xFlip !== ! this.clientMods.xFlip ,
		yFlip = this.frameObject.yFlip ;	// this.clientMods.yFlip does not exist (xFlip is for autofacing, which only change azimuth)

	this.flipTexture( material.diffuseTexture , xFlip , yFlip ) ;
	if ( material.bumpTexture ) { this.flipTexture( material.bumpTexture , xFlip , yFlip ) ; }
	if ( material.specularTexture ) { this.flipTexture( material.specularTexture , xFlip , yFlip ) ; }

	// Override this.origin, if necessary
	if ( this.frameObject.origin ) {
		let origin ;

		if ( ! xFlip && ! yFlip ) {
			origin = this.frameObject.origin ;
		}
		else {
			origin = {
				x: ( xFlip ? -this.frameObject.origin.x : this.frameObject.origin.x ) || 0 ,
				y: ( yFlip ? -this.frameObject.origin.y : this.frameObject.origin.y ) || 0 ,
				z: this.frameObject.origin.z || 0
			} ;
		}

		this.updateOrigin( origin , true ) ;
	}

	// Multiply with this.size, if necessary
	if ( this.texturePackObject.pixelDensity ) {
		this.updateSizeFromPixelDensity( material.diffuseTexture , this.texturePackObject.pixelDensity ) ;
	}
	else if ( this.frameObject.relSize ) {
		this.updateSize( this.frameObject.relSize , false , true ) ;
	}

	// /!\ TEMP! Easier to debug!
	material.backFaceCulling = false ;

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntitySprite.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'sprite' , undefined , scene ) ;	//, true ) ;

	//mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
	mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_X | BABYLON.AbstractMesh.BILLBOARDMODE_Y ;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;

	// Billboard mode is not sensible to pivot (as of v4.2.0-alpha31), this is a workaround for that, see:
	// https://forum.babylonjs.com/t/sprite-planting-i-e-sprite-origin-at-the-bottom/13337/8
	// Alternative is to mesh.bakeTransformIntoVertices(), done by this.updateOrigin()
	// Otherwise if/when 'usePivotForBillboardMode' option is accepted, use simply mesh.setPivot*()
	/*
	//this.babylon.billboardOrigin.y = -0.5 ;
	mesh.onAfterWorldMatrixUpdateObservable.add( () => {
		var pivot = this.babylon.billboardOrigin ,
			matrix = BABYLON.TmpVectors.Matrix[ 0 ] ,
			worldMatrix = mesh.getWorldMatrix() ;

		// Apply pivot point
		matrix.setRowFromFloats( 0 , 1 , 0 , 0 , 0 ) ;
		matrix.setRowFromFloats( 1 , 0 , 1 , 0 , 0 ) ;
		matrix.setRowFromFloats( 2 , 0 , 0 , 1 , 0 ) ;
		matrix.setRowFromFloats( 3 , -pivot.x , -pivot.y , -pivot.z , 1 ) ;
		matrix.multiplyToRef( worldMatrix , worldMatrix ) ;
	} ) ;
	*/

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



GEntitySprite.prototype.updateRotation = function( data , volatile = false ) {
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	var x = data.rotation.x !== undefined ? data.rotation.x : this.rotation.x ,
		y = data.rotation.y !== undefined ? data.rotation.y : this.rotation.y ,
		z = data.rotation.z !== undefined ? data.rotation.z : this.rotation.z ;

	if ( ! volatile ) {
		this.rotation.x = x ;
		this.rotation.y = y ;
		this.rotation.z = z ;
	}

	mesh.rotation.z = z ;
} ;



GEntitySprite.prototype.autoFacing = function( changes = null ) {
	//console.warn( "@@@@@@@@@@ autoFacing()" , changes ) ;
	if ( changes ) {
		if ( ! changes.camera && ! this.parametric ) { return ; }
	}
	//console.warn( "@@@@@@@@@@ autoFacing() GO!" , changes && changes.camera ) ;

	// IMPORTANT: use actual babylon.mesh's position, not gEntity's position
	// This is because parametric animation only exists in babylon.mesh,
	// while gEntity continue tracking the server-side position.
	var angle = vectorUtils.facingAngleDeg(
		this.gScene.globalCamera.babylon.camera.position ,
		this.babylon.mesh.position ,
		//this.direction
		this.facing
	) ;

	var sector = vectorUtils.degToSector[ this.special.spriteAutoFacing ]( angle ) ;

	//console.warn( "@@@@@@@@@@ autoFacing() angle" , angle ) ;
	if ( this.clientMods.variant === sector ) { return ; }
	//console.warn( "@@@@@@@@@@ autoFacing() new sector" , sector ) ;

	this.clientMods.variant = sector ;
	this.clientMods.xFlipVariant = vectorUtils.xFlipSector[ sector ] ;
	this.refreshMaterial() ;
} ;


},{"./GEntity.js":2,"./GTransition.js":16,"./vectorUtils.js":20,"seventh":42}],14:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const GEntity = require( './GEntity.js' ) ;
const GEntityFloatingText = require( './GEntityFloatingText.js' ) ;

//const Promise = require( 'seventh' ) ;



function GEntityUiFloatingText( dom , gScene , data ) {
	GEntityFloatingText.call( this , dom , gScene , data ) ;

	this.special.content.textSize = 0.05 ;

	this.iconOffset = 0 ;
	this.safeIconOffset = false ;	// true when iconOffset is up to date
	this.blinkSafe = false ;
}

GEntityUiFloatingText.prototype = Object.create( GEntityFloatingText.prototype ) ;
GEntityUiFloatingText.prototype.constructor = GEntityUiFloatingText ;

module.exports = GEntityUiFloatingText ;



GEntityUiFloatingText.prototype.destroy = function() {
	if ( this.babylon.textBlock ) { this.babylon.textBlock.dispose() ; }
	if ( this.babylon.icon ) { this.babylon.icon.dispose() ; }

	GEntity.prototype.destroy.call( this ) ;
} ;



// Update the gEntity's material/texture
GEntityUiFloatingText.prototype.updateMaterial = function() {
	var ui , textBlock ;

	console.warn( "3D GEntityUiFloatingText.updateMaterial()" ) ;

	if ( this.gScene.babylon.ui ) {
		ui = this.gScene.babylon.ui ;
	}
	else {
		this.gScene.babylon.ui = ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI( 'ui' ) ;
	}

	if ( this.babylon.textBlock ) {
		textBlock = this.babylon.textBlock ;
	}
	else {
		this.babylon.textBlock = textBlock = new BABYLON.GUI.TextBlock() ;
		textBlock.text = this.special.content.text ;
		textBlock.color = this.special.content.textColor ;
		textBlock.alpha = this.opacity ;
		textBlock.resizeToFit = true ;
		ui.addControl( textBlock ) ;

		// SHOULD BE DONE AFTER .addControl()
		if ( this.parent ) {
			textBlock.linkWithMesh( this.parent.babylon.mesh ) ;

			if ( ! this.blinkSafe ) {
				textBlock.alpha = 0 ;
				setTimeout( () => {
					this.blinkSafe = true ;
					textBlock.alpha = this.opacity ;
				} , 20 ) ;
			}
		}
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityUiFloatingText.prototype.updateOpacity = function( opacity , volatile = false ) {
	if ( ! this.blinkSafe ) {
		setTimeout( () => {
			this.blinkSafe = true ;
			this.updateOpacity( opacity , volatile ) ;
		} , 20 ) ;
		return ;
	}

	GEntityFloatingText.prototype.updateOpacity.call( this , opacity , volatile ) ;
} ;



// Because font does not use 100% of height all the time...
const ICON_HEIGHT_RATIO = 0.8 ;

GEntityUiFloatingText.prototype.updateContent = function( content ) {
	var ui = this.gScene.babylon.ui ,
		uiSize = ui.getSize() ,
		textBlock = this.babylon.textBlock ;

	if ( ! textBlock ) { return ; }

	if ( content.text !== undefined ) {
		this.safeIconOffset = false ;
		textBlock.text = this.special.content.text = '' + content.text ;
	}

	if ( typeof content.textSize === 'number' ) {
		this.safeIconOffset = false ;
		this.special.content.textSize = content.textSize ;
		textBlock.fontSizeInPixels = Math.round( content.textSize * uiSize.height ) ;
	}

	if ( typeof content.textColor === 'string' ) { textBlock.color = this.special.content.textColor = content.textColor ; }
	if ( typeof content.outlineColor === 'string' ) { textBlock.outlineColor = this.special.content.outlineColor = content.outlineColor ; }

	if ( typeof content.outlineWidth === 'number' ) {
		this.special.content.outlineWidth = content.outlineWidth ;
		textBlock.outlineWidth = Math.round( content.outlineWidth * uiSize.height ) ;
	}

	if ( typeof content.shadowColor === 'string' ) { textBlock.shadowColor = this.special.content.shadowColor = content.shadowColor ; }

	if ( typeof content.shadowBlur === 'number' ) {
		this.special.content.shadowBlur = content.shadowBlur ;
		textBlock.shadowBlur = Math.round( content.shadowBlur * uiSize.height ) ;
	}

	if ( content.icon ) { this.updateContentIcon( content ) ; }
} ;



GEntityUiFloatingText.prototype.updateContentIcon = function( content ) {
	var icon ,
		ui = this.gScene.babylon.ui ,
		textBlock = this.babylon.textBlock ;

	// /!\ Use a texture instead of a direct URL? So this could be preloaded?
	if ( this.babylon.icon ) {
		icon = this.babylon.icon ;
		icon.source = this.dom.cleanUrl( content.icon ) ;
		icon.width = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
		icon.height = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
	}
	else {
		this.babylon.icon = icon = new BABYLON.GUI.Image( 'icon' , this.dom.cleanUrl( content.icon ) ) ;
		icon.widthInPixels = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
		icon.heightInPixels = textBlock.fontSizeInPixels * ICON_HEIGHT_RATIO ;
		ui.addControl( icon ) ;

		// SHOULD BE DONE AFTER .addControl()
		if ( this.parent ) {
			icon.linkWithMesh( this.parent.babylon.mesh ) ;

			if ( ! this.blinkSafe ) {
				icon.alpha = 0 ;
				setTimeout( () => {
					this.blinkSafe = true ;
					icon.alpha = this.opacity ;
				} , 20 ) ;
			}
		}
	}

	this.updateContentIconOffset( () => {
		if ( this.parent ) {
			icon.linkOffsetXInPixels = textBlock.linkOffsetXInPixels - this.iconOffset ;
		}
		else {
			icon.leftInPixels = textBlock.leftInPixels - this.iconOffset ;
		}
	} ) ;
} ;



GEntityUiFloatingText.prototype.updateContentIconOffset = function( fn = null , retried = false ) {
	var icon = this.babylon.icon ,
		textBlock = this.babylon.textBlock ;

	//console.warn( "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& Before" , this.safeIconOffset , textBlock._width.isPixel , retried , this.iconOffset ) ;
	if ( retried ) { this.safeIconOffset = true ; }

	if ( ! this.safeIconOffset || ( ! textBlock._width.isPixel && ! retried ) ) {
		setTimeout( () => this.updateContentIconOffset( fn , true ) , 20 ) ;
		return ;
	}

	this.iconOffset = Math.round(
		icon.widthInPixels / 2 + textBlock.fontSizeInPixels / 4 +
		( textBlock._width.isPixel ? textBlock.widthInPixels / 2 : textBlock.fontSizeInPixels )
	) ;
	//console.warn( "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& After" , this.safeIconOffset , textBlock._width.isPixel , retried , this.iconOffset ) ;

	if ( fn ) { fn() ; }
} ;



GEntityUiFloatingText.prototype.updateMesh = function() {
	this.updateMeshNeeded = false ;
	return ;
} ;



GEntityUiFloatingText.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special && data.special.content ) {
		this.updateContent( data.special.content ) ;
	}
} ;



GEntityUiFloatingText.prototype.updatePosition = function( data , volatile = false ) {
	var textBlock = this.babylon.textBlock ,
		icon = this.babylon.icon ;

	if ( icon && ! this.safeIconOffset ) {
		this.updateContentIconOffset( () => this.updatePosition( data , volatile ) ) ;
		return ;
	}

	var ui = this.gScene.babylon.ui ,
		uiSize = ui.getSize() ,
		scene = this.gScene.babylon.scene ;

	var iconX ,
		x = data.position.x !== undefined ? data.position.x : this.position.x ,
		y = data.position.y !== undefined ? data.position.y : this.position.y ;

	if ( ! volatile ) {
		this.position.x = x ;
		this.position.y = y ;
	}

	x = -x * uiSize.width / 2 ;
	y = -y * uiSize.height / 2 ;
	iconX = x - this.iconOffset ;
	//console.warn( "######################################" , this.iconOffset , x , iconX ) ;

	if ( this.parent ) {
		if ( data.transition ) {
			data.transition.createAnimation( scene , textBlock , 'linkOffsetXInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , x ) ;
			data.transition.createAnimation( scene , textBlock , 'linkOffsetYInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;

			if ( icon ) {
				data.transition.createAnimation( scene , icon , 'linkOffsetXInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , iconX ) ;
				data.transition.createAnimation( scene , icon , 'linkOffsetYInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;
			}
		}
		else {
			textBlock.linkOffsetXInPixels = x ;
			textBlock.linkOffsetYInPixels = y ;

			if ( icon ) {
				icon.linkOffsetXInPixels = iconX ;
				icon.linkOffsetYInPixels = y ;
			}
		}
	}
	else if ( data.transition ) {
		data.transition.createAnimation( scene , textBlock , 'leftInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , x ) ;
		data.transition.createAnimation( scene , textBlock , 'topInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;

		if ( icon ) {
			data.transition.createAnimation( scene , icon , 'leftInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , iconX ) ;
			data.transition.createAnimation( scene , icon , 'topInPixels' , BABYLON.Animation.ANIMATIONTYPE_FLOAT , y ) ;
		}
	}
	else {
		textBlock.leftInPixels = x ;
		textBlock.topInPixels = y ;

		if ( icon ) {
			icon.leftInPixels = iconX ;
			icon.topInPixels = y ;
		}
	}
} ;


},{"./GEntity.js":2,"./GEntityFloatingText.js":6}],15:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const Camera = require( './Camera.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
function GScene( dom , data ) {
	this.dom = dom ;    // Dom instance, immutable
	//this.id = data.id ;		// immutable
	this.engineId = data.engineId ;	// immutable
	this.rightHanded = data.rightHanded !== undefined ? !! data.rightHanded : true ;    // immutable

	this.active = false ;
	this.paused = false ;
	this.persistent = false ;
	this.theme = 'default' ;
	this.special = {} ;
	this.engine = {} ;
	this.texturePacks = {} ;
	this.gEntityLocations = {} ;
	this.gEntities = {} ;	// GEntities by name
	this.parametricGEntities = new Set() ;	// Only GEntities having parametric animation
	this.noLocalLightingGEntities = new Set() ;	// GEntities without local lighting
	this.localLightGEntities = new Set() ;	// GEntities that are local lights
	this.animationFunctions = new Set() ;	// Animations for things that are not supported by Babylonjs, like contrast/exposure animation

	this.globalCamera = null ;
	this.roleCamera = null ;	// For multiplayer, not implemented yet

	this.$gscene = document.createElement( 'canvas' ) ;
	// At creation, the visibility is turned off, the initial update will turn it on again
	this.$gscene.classList.add( 'gscene' ) ;
	this.$gscene.style.visibility = 'hidden' ;
	this.dom.$gfx.append( this.$gscene ) ;

	this.resizeObserver = null ;	// used to detect when the canvas element is resized

	// What have changed before the last rendered scene
	this.changes = {
		camera: false
	} ;

	// Babylon stuffs
	this.babylon = {
		engine: null ,
		scene: null ,
		ui: null
	} ;

	this.initScene() ;
}

GScene.prototype = Object.create( Ngev.prototype ) ;
GScene.prototype.constructor = GScene ;

module.exports = GScene ;



GScene.prototype.initScene = function() {
	// Instanciate Babylon engine
	var engine = this.babylon.engine = new BABYLON.Engine( this.$gscene , true ) ;

	// Create the scene space
	var scene = this.babylon.scene = new BABYLON.Scene( engine ) ;

	// Important, because by default the coordinate system is like DirectX (left-handed) not like math and OpenGL (right-handed)
	// /!\ THERE ARE BUGS WITH SPRITES AND RIGHT-HANDED SYSTEM /!\
	//scene.useRightHandedSystem = true ;

	// Optimizations
	scene.autoClear = false ;		// Don't clear the color buffer between frame (skybox expected!)
	scene.autoClearDepthAndStencil = false ;	// Same with depth and stencil buffer

	// Add a camera to the scene and attach it to the canvas
	this.globalCamera = new Camera( this ) ;

	// Register a render loop to repeatedly render the scene
	engine.runRenderLoop( () => {
		var gEntity , fn ,
			t = Date.now() / 1000 ;

		if ( this.parametricGEntities.size ) {
			for ( gEntity of this.parametricGEntities ) {
				gEntity.parametricUpdate( t ) ;
			}
		}

		if ( this.animationFunctions.size ) {
			// Note that the fn *IS RESPONSIBLE* for auto-deleting itself from this.animationFunctions once the job is finished
			for ( fn of this.animationFunctions ) { fn( t ) ; }
		}

		this.emitIfListener( 'render' , this.changes ) ;
		this.changes.camera = false ;

		scene.render() ;
	} ) ;

	//setTimeout( () => new BABYLON.ParticleHelper.CreateAsync( "fire" , scene ).then( pSet => pSet.start() ) , 3000 ) ;

	// ResizeObserver is used to detect when the canvas element is resized, to avoid image streching
	this.resizeObserver = new ResizeObserver( () => engine.resize() ) ;
	this.resizeObserver.observe( this.$gscene ) ;
} ;



// !THIS SHOULD TRACK SERVER-SIDE GScene! spellcast/lib/gfx/GScene.js
GScene.prototype.update = function( data , awaiting = false , initial = false ) {
	console.warn( "3D GScene.update()" , data ) ;
	var key ;

	if ( data.transition ) {
		if ( initial ) { delete data.transition ; }
		else { data.transition = new GTransition( data.transition ) ; }
	}

	if ( data.active !== undefined ) {
		this.active = !! data.active ;
		this.$gscene.style.visibility = this.active ? 'visible' : 'hidden' ;
	}

	if ( data.paused !== undefined ) { this.paused = !! data.paused ; }
	if ( data.persistent !== undefined ) { this.persistent = !! data.persistent ; }
	//if ( data.roles !== undefined ) { this.roles = data.roles ; }
	if ( data.theme !== undefined ) { this.theme = data.theme || 'default' ; }

	if ( data.special && typeof data.special === 'object' ) {
		if ( data.special.ambient ) { this.updateAmbient( data ) ; }

		// Post-processing, see:
		// https://doc.babylonjs.com/divingDeeper/postProcesses/usePostProcesses
		if ( typeof data.special.contrast === 'number' ) { this.updateContrast( data ) ; }
		if ( typeof data.special.exposure === 'number' ) { this.updateExposure( data ) ; }
		if ( data.special.colorGrading ) { this.updateColorGrading( data ) ; }
		if ( data.special.colorCurves ) { this.updateColorCurves( data ) ; }
		if ( data.special.vignette ) { this.updateVignette( data ) ; }
	}

	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.globalCamera !== undefined ) { this.globalCamera.update( data.globalCamera ) ; }

	return ( awaiting && data.transition && data.transition.promise ) || Promise.resolved ;
} ;



GScene.prototype.updateAmbient = function( data ) {
	console.warn( ".updateAmbient()" , this.special.ambient ) ;
	var scene = this.babylon.scene ;

	if ( ! data.special.ambient || typeof data.special.ambient !== 'object' ) { return ; }

	if ( ! this.special.ambient ) { this.special.ambient = new BABYLON.Color3( 0 , 0 , 0 ) ; }
	Object.assign( this.special.ambient , data.special.ambient ) ;

	if ( data.transition ) {
		data.transition.createAnimation(
			scene ,
			scene ,
			'ambientColor' ,
			BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
			new BABYLON.Color3( this.special.ambient.r , this.special.ambient.g , this.special.ambient.b )
		) ;
	}
	else {
		scene.ambientColor.set( this.special.ambient.r , this.special.ambient.g , this.special.ambient.b ) ;
	}
} ;



GScene.prototype.updateContrast = function( data ) {
	console.warn( ".updateContrast()" , this.special.contrast ) ;
	var scene = this.babylon.scene ;

	this.special.contrast = data.special.contrast ;

	if ( data.transition ) {
		data.transition.createAnimationFn(
			this ,
			scene.imageProcessingConfiguration ,
			'contrast' ,
			BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
			this.special.contrast
		) ;
	}
	else {
		scene.imageProcessingConfiguration.contrast = this.special.contrast ;
	}
} ;



GScene.prototype.updateExposure = function( data ) {
	console.warn( ".updateExposure()" , this.special.exposure ) ;
	var scene = this.babylon.scene ;

	this.special.exposure = data.special.exposure ;

	if ( data.transition ) {
		data.transition.createAnimationFn(
			this ,
			scene.imageProcessingConfiguration ,
			'exposure' ,
			BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
			this.special.exposure
		) ;
	}
	else {
		scene.imageProcessingConfiguration.exposure = this.special.exposure ;
	}
} ;



const CURVE_PROPERTIES = new Set( [
	'globalHue' , 'globalDensity' , 'globalSaturation' ,
	'highlightsHue' , 'highlightsDensity' , 'highlightsSaturation' ,
	'shadowsHue' , 'shadowsDensity' , 'shadowsSaturation'
] ) ;

GScene.prototype.updateColorCurves = function( data ) {
	console.warn( ".updateColorCurves()" , this.special.colorCurves ) ;
	var key ,
		colorCurves = data.special.colorCurves ,
		scene = this.babylon.scene ;

	if ( ! colorCurves ) {
		if ( this.special.colorCurves ) { this.special.colorCurves = null ; }
		scene.imageProcessingConfiguration.colorCurvesEnabled = false ;
		return ;
	}

	if ( typeof colorCurves !== 'object' ) { return ; }

	scene.imageProcessingConfiguration.colorCurvesEnabled = true ;
	if ( ! this.special.colorCurves ) { this.special.colorCurves = {} ; }
	if ( ! scene.imageProcessingConfiguration.colorCurves ) {
		scene.imageProcessingConfiguration.colorCurves = {
			globalHue: 0 ,
			globalDensity: 0 ,
			globalSaturation: 0 ,
			highlightsHue: 0 ,
			highlightsDensity: 0 ,
			highlightsSaturation: 0 ,
			shadowsHue: 0 ,
			shadowsDensity: 0 ,
			shadowsSaturation: 0
		} ;
	}

	for ( key in colorCurves ) {
		if ( ! CURVE_PROPERTIES.has( key ) && typeof colorCurves[ key ] !== 'number' ) { continue ; }
		this.special.colorCurves[ key ] = colorCurves[ key ] ;

		if ( data.transition ) {
			data.transition.createAnimationFn(
				this ,
				scene.imageProcessingConfiguration.colorCurves ,
				key ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.colorCurves[ key ]
			) ;
		}
		else {
			scene.imageProcessingConfiguration.colorCurves[ key ] = this.special.colorCurves[ key ] ;
		}
	}
} ;



const VIGNETTE_FLOAT_PROPERTIES = {
	stretch: 'vignetteStretch' ,
	centerX: 'vignetteCentreX' ,
	centerY: 'vignetteCentreY' ,
	weight: 'vignetteWeight'
	//, color: 'vignetteColor'
	//, blendMode: 'vignetteBlendMode'
} ;

GScene.prototype.updateVignette = function( data ) {
	console.warn( ".updateVignette()" , this.special.vignette ) ;
	var key , targetKey ,
		vignette = data.special.vignette ,
		scene = this.babylon.scene ;

	if ( ! vignette ) {
		if ( this.special.vignette ) { this.special.vignette = null ; }
		scene.imageProcessingConfiguration.vignetteEnabled = false ;
		return ;
	}

	if ( typeof vignette !== 'object' ) { return ; }

	scene.imageProcessingConfiguration.vignetteEnabled = true ;
	if ( ! this.special.vignette ) { this.special.vignette = {} ; }
	if ( ! scene.imageProcessingConfiguration.vignette ) {
		/*
		scene.imageProcessingConfiguration.vignetteStretch = 0 ;
		scene.imageProcessingConfiguration.vignetteCentreX = 0 ;
		scene.imageProcessingConfiguration.vignetteCentreY = 0 ;
		scene.imageProcessingConfiguration.vignetteWeight = 1.5 ;
		scene.imageProcessingConfiguration.vignetteColor = new BABYLON.Color4( 1 , 1 , 1 , 0.5 ) ;
		scene.imageProcessingConfiguration.vignetteBlendMode = BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY ;
		*/
	}

	for ( key in vignette ) {
		targetKey = VIGNETTE_FLOAT_PROPERTIES[ key ] ;
		if ( ! targetKey ) { continue ; }
		this.special.vignette[ key ] = vignette[ key ] ;

		if ( data.transition ) {
			data.transition.createAnimationFn(
				this ,
				scene.imageProcessingConfiguration ,
				targetKey ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.vignette[ key ]
			) ;
		}
		else {
			scene.imageProcessingConfiguration[ targetKey ] = this.special.vignette[ key ] ;
		}
	}

	if ( vignette.color ) {
		this.special.vignette.color = vignette.color ;

		if ( data.transition ) {
			data.transition.createAnimationFn(
				this ,
				scene.imageProcessingConfiguration ,
				'vignetteColor' ,
				BABYLON.Animation.ANIMATIONTYPE_COLOR3 ,
				new BABYLON.Color3( vignette.color.r , vignette.color.g , vignette.color.b )
			) ;
		}
		else {
			scene.imageProcessingConfiguration.vignetteColor.set( vignette.color.r , vignette.color.g , vignette.color.b ) ;
		}
	}

	if ( vignette.blendMode ) {
		switch ( vignette.blendMode ) {
			case 'multiply' :
				this.special.vignette.blendMode = 0 ;	//BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY ;
				break ;

			case 'opaque' :
			default :
				this.special.vignette.blendMode = 1 ;	//BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_OPAQUE ;
				break ;
		}

		scene.imageProcessingConfiguration.vignetteBlendMode = this.special.vignette.blendMode ;
	}
} ;



GScene.prototype.updateColorGrading = function( data ) {
	console.warn( ".updateColorGrading()" , this.special.colorGrading ) ;
	var scene = this.babylon.scene ,
		colorGrading = data.special.colorGrading ,
		url , oldLevel , setLevel = false ,
		colorGradingTexture ;

	if ( ! colorGrading ) {
		if ( this.special.colorGrading ) {
			this.special.colorGrading = null ;
		}

		scene.imageProcessingConfiguration.colorGradingEnabled = false ;
		if ( scene.imageProcessingConfiguration.colorGradingTexture ) {
			scene.imageProcessingConfiguration.colorGradingTexture.dispose() ;
		}

		return ;
	}

	if ( typeof colorGrading !== 'object' ) { return ; }

	if ( colorGrading.url && typeof colorGrading.url === 'string' ) { url = this.dom.cleanUrl( colorGrading.url ) ; }

	if ( ! this.special.colorGrading ) {
		// URL is mandatory if there is nothing yet
		if ( ! url ) { return ; }

		this.special.colorGrading = {
			url ,
			level: typeof colorGrading.level === 'number' ? colorGrading.level : 1
		} ;

		colorGradingTexture = new BABYLON.Texture( this.special.colorGrading.url , scene , true , false ) ;
		colorGradingTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE ;
		colorGradingTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

		scene.imageProcessingConfiguration.colorGradingEnabled = true ;
		scene.imageProcessingConfiguration.colorGradingTexture = colorGradingTexture ;
		scene.imageProcessingConfiguration.colorGradingWithGreenDepth = false ;
		oldLevel = 0 ;
		setLevel = true ;
	}
	else {
		if ( url && url !== this.special.colorGrading.url ) {
			this.special.colorGrading.url = url ;

			colorGradingTexture = new BABYLON.Texture( this.special.colorGrading.url , scene , true , false ) ;
			colorGradingTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE ;
			colorGradingTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

			scene.imageProcessingConfiguration.colorGradingTexture = colorGradingTexture ;
		}
		else {
			colorGradingTexture = scene.imageProcessingConfiguration.colorGradingTexture ;
		}

		if ( typeof colorGrading.level === 'number' ) {
			oldLevel = this.special.colorGrading.level ;
			setLevel = true ;
			this.special.colorGrading.level = colorGrading.level ;
		}
	}

	if ( setLevel ) {
		console.warn( "level" , oldLevel , this.special.colorGrading.level , data.transition ) ;
		if ( data.transition ) {
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				colorGradingTexture ,
				'level' ,
				BABYLON.Animation.ANIMATIONTYPE_FLOAT ,
				this.special.colorGrading.level ,
				oldLevel
			) ;
		}
		else {
			colorGradingTexture.level = this.special.colorGrading.level ;
		}
	}
} ;



GScene.prototype.updateLightExcludedMeshes = function() {
	var light ,
		excludedMeshes = [ ... this.noLocalLightingGEntities ].map( e => e.babylon.mesh ) ;

	for ( light of this.localLightGEntities ) {
		light.babylon.light.excludedMeshes = excludedMeshes ;
	}
} ;



GScene.prototype.hasGEntity = function( gEntityId ) { return gEntityId in this.gEntities ; } ;
GScene.prototype.getGEntity = function( gEntityId ) { return this.gEntities[ gEntityId ] ; } ;
GScene.prototype.addGEntity = function( gEntityId , gEntity ) { this.gEntities[ gEntityId ] = gEntity ; } ;

GScene.prototype.removeGEntity = function( gEntityId ) {
	var gEntity = this.gEntities[ gEntityId ] ;
	if ( ! gEntity ) { return false ; }

	delete this.gEntities[ gEntityId ] ;
	return true ;
} ;


},{"./Camera.js":1,"./GTransition.js":16,"nextgen-events/lib/browser.js":30,"seventh":42}],16:[function(require,module,exports){
/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const Promise = require( 'seventh' ) ;
const arrayKit = require( 'array-kit' ) ;



/*
	duration: transition duration in s
	easing: the easing function used
*/
// !THIS SHOULD TRACK SERVER-SIDE GTransition! spellcast/lib/gfx/GTransition.js
function GTransition( data ) {
	this.duration = 0.2 ;
	this.easing = 'linear' ;
	this.running = 0 ;
	this.promise = null ;

	if ( data ) { this.update( data ) ; }
}

module.exports = GTransition ;



GTransition.prototype.update = function( data ) {
	if ( ! data || typeof data !== 'object' ) { return ; }

	if ( data.duration !== undefined ) { this.duration = + data.duration || 0 ; }
	if ( data.easing !== undefined ) { this.easing = data.easing || 'linear' ; }

	return this ;
} ;



GTransition.prototype.toString = function( property ) {
	return property + ' ' + this.duration + 's' + ( ' ' + this.easing || '' ) ;
} ;



// All of Babylon built-in easing functions
const EASING_FUNCTION = {
	circle: BABYLON.CircleEase ,
	back: BABYLON.BackEase ,
	bounce: BABYLON.BounceEase ,
	cubic: BABYLON.CubicEase ,
	elastic: BABYLON.ElasticEase ,
	exponential: BABYLON.ExponentialEase ,
	power: BABYLON.PowerEase ,
	quadratic: BABYLON.QuadraticEase ,
	quartic: BABYLON.QuarticEase ,
	quintic: BABYLON.QuinticEase ,
	sine: BABYLON.SineEase ,
	bezier: BABYLON.BezierCurveEase
} ;



GTransition.prototype.createAnimation = function( scene , entity , property , animationType , newValue , oldValue = null ) {
	var easingFunction , animation , animationKeys ,
		animationFps = 30 ,
		frameCount = Math.round( this.duration * animationFps ) ;

	animation = new BABYLON.Animation(
		'transition' ,
		property ,
		animationFps ,
		animationType ,
		BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT ,	// loop mode
		false	// enable blending: no, it produce bad animation (it doesn't end where it should)
	) ;

	if ( oldValue === null ) {
		oldValue = entity[ property ] ;

		if ( oldValue && typeof oldValue === 'object' && oldValue.clone ) {
			// Prevent bug for camera target: https://forum.babylonjs.com/t/best-camera-for-cinematics/13281/3
			oldValue = oldValue.clone() ;
		}
	}

	animationKeys = [
		{ frame: 0 , value: oldValue } ,
		{ frame: frameCount , value: newValue }
	] ;

	animation.setKeys( animationKeys ) ;

	if ( this.easing && EASING_FUNCTION[ this.easing ] ) {
		// For each easing function, you can choose beetween EASEIN (default), EASEOUT, EASEINOUT
		easingFunction = new EASING_FUNCTION[ this.easing ]() ;
		easingFunction.setEasingMode( BABYLON.EasingFunction.EASINGMODE_EASEINOUT ) ;
		animation.setEasingFunction( easingFunction ) ;
	}

	// Adding animation to the animations collection
	entity.animations.push( animation ) ;

	if ( ! this.promise ) {
		this.promise = new Promise() ;
		// Prevent from bug or side-effect where the animation event would be lost? (e.g. animation aborted?)
		// The promise is resolved in the "onAnimationEnd" callback, this one is a fallback.
		this.promise.resolveTimeout( 1000 * this.duration + 20 ) ;
	}

	// Finally, launch animation, from key 0 to last-key
	this.running ++ ;
	scene.beginAnimation(
		entity ,
		0 ,	// starting frame
		frameCount ,	// ending frame
		false ,	// loop
		1 ,	// speed ratio
		() => {
			// onAnimationEnd callback
			this.running -- ;
			scene.removeAnimation( animation ) ;
			arrayKit.deleteValue( entity.animations , animation ) ;
			if ( this.running <= 0 ) { this.promise.resolve() ; }
		} ,
		undefined ,
		false	// stop current running animations?
	) ;
} ;

const INTERPOLATE = [] ;
// Re-use Babylon interpolation
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_COLOR3 ] = BABYLON.Animation.prototype.color3InterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_COLOR4 ] = BABYLON.Animation.prototype.color4InterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_FLOAT ] = ( start , end , gradient ) => start + gradient * ( end - start ) ;
//INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_FLOAT ] = BABYLON.Animation.prototype.floatInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_MATRIX ] = BABYLON.Animation.prototype.matrixInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_QUATERNION ] = BABYLON.Animation.prototype.quaternionInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_SIZE ] = BABYLON.Animation.prototype.sizeInterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_VECTOR2 ] = BABYLON.Animation.prototype.vector2InterpolateFunction ;
INTERPOLATE[ BABYLON.Animation.ANIMATIONTYPE_VECTOR3 ] = BABYLON.Animation.prototype.vector3InterpolateFunction ;

// This is used when .createAnimation() won't work because the property is not animatable in Babylon.
// It returns a unique function to be used inside the render loop, which return true when its jobs is done and can be deleted.
GTransition.prototype.createAnimationFn = function( gScene , entity , property , animationType , newValue , oldValue = null ) {
	//if ( animationType !== BABYLON.Animation.ANIMATIONTYPE_FLOAT ) { throw new Error( ".createAnimationFn(): Only ANIMATIONTYPE_FLOAT is supported ATM" ) ; }

	if ( oldValue === null ) {
		oldValue = entity[ property ] ;
		if ( oldValue && typeof oldValue === 'object' && oldValue.clone ) { oldValue = oldValue.clone() ; }
	}

	var startTime = Date.now() / 1000 ;

	if ( ! this.promise ) {
		this.promise = new Promise() ;
		// Prevent from bug or side-effect where the animation event would be lost? (e.g. animation aborted?)
		this.promise.resolveTimeout( 1000 * this.duration + 20 ) ;
	}

	this.running ++ ;

	var fn = ( t ) => {
		var rt ,
			dt = t - startTime ;

		// Whatever happen, rt should not "leak" outside its duration
		if ( dt >= this.duration ) {
			rt = 1 ;
			this.running -- ;
			gScene.animationFunctions.delete( fn ) ;
			if ( this.running <= 0 ) { this.promise.resolve() ; }
		}
		else {
			rt = dt / this.duration ;
		}

		//entity[ property ] = oldValue + rt * ( newValue - oldValue ) ;
		entity[ property ] = INTERPOLATE[ animationType ]( oldValue , newValue , rt ) ;
	} ;

	// Add it to the gScene
	gScene.animationFunctions.add( fn ) ;

	return fn ;
} ;


},{"array-kit":21,"seventh":42}],17:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const extension = require( './browser-extension.js' ) ;
const operators = extension.host.exports.expressionOperators ;



// !CHANGE HERE MUST BE REFLECTED IN SERVER's Parametric! E.g.: spellcast-ext-web-client/lib/Parametric.js
function Parametric( data ) {
	this.var = {} ;
	this.formula = {} ;
	this.ctx = {
		t: 0 ,
		rt: 0 ,		// relative t, relative to stopAt (rt=1 if t=stopAt)
		tOffset: -Date.now() / 1000
	} ;
	this.computed = {} ;
	this.stopAt = Infinity ;
	this.cleanStop = false ;

	this.update( data ) ;
}

module.exports = Parametric ;



function emptyObject( object ) {
	var key ;
	for ( key in object ) {
		delete object[ key ] ;
	}
}



// !CHANGE HERE MUST BE REFLECTED IN SERVER's Parametric! E.g.: spellcast-ext-web-client/lib/Parametric.js
Parametric.prototype.update = function( data ) {
	if ( data.reset ) {
		emptyObject( this.var ) ;
		emptyObject( this.formula ) ;
		emptyObject( this.ctx ) ;
		emptyObject( this.computed ) ;
		this.ctx.t = this.ctx.rt = 0 ;
		this.ctx.tOffset = -Date.now() / 1000 ;
	}
	else if ( data.resetT ) {
		this.ctx.tOffset = -Date.now() / 1000 ;
	}

	if ( typeof data.stopAt === 'number' ) {
		this.stopAt = data.stopAt ;
	}

	if ( data.var ) {
		this.recursiveUpdate( this.var , data.var ) ;
	}

	if ( data.formula ) {
		this.recursiveUpdate( this.formula , data.formula , this.computed ) ;
	}
} ;



Parametric.prototype.recursiveUpdate = function( self , data , computed ) {
	var key , value ;

	for ( key in data ) {
		value = data[ key ] ;

		if ( value === null ) {
			// We destroy that parametric formula along with any computed value
			delete self[ key ] ;
			if ( computed && typeof computed[ key ] === 'object' ) { delete computed[ key ] ; }
		}
		else if ( typeof value === 'boolean' || typeof value === 'number' ) {
			self[ key ] = value ;
		}
		else if ( typeof value === 'string' ) {
			self[ key ] = new Function( 'op' , 'ctx' , 'return ( ' + value + ' ) ;' ) ;
			//self[ key ] = new Function( 'ctx' , 'return ( ' + value + ' ) ;' ) ;
		}
		else if ( typeof value === 'object' ) {
			self[ key ] = {} ;	// Don't share with eventData
			this.recursiveUpdate(
				self[ key ] ,
				value ,
				computed && typeof computed[ key ] === 'object' ? computed[ key ] : null
			) ;
		}

		console.warn( "########## k/v/V" , key , value , self[ key ] ) ;
	}
} ;



Parametric.prototype.compute = function( absoluteT , base ) {
	this.ctx.t = absoluteT + this.ctx.tOffset ;

	if ( this.ctx.t > this.stopAt ) {
		if ( this.cleanStop ) { return null ; }
		this.ctx.t = this.stopAt ;
		this.cleanStop = true ;
	}
	else if ( this.ctx.t === this.stopAt ) {
		this.cleanStop = true ;
	}

	this.ctx.rt = this.ctx.t / this.stopAt ;

	// /!\ RESET COMPUTED?
	this.recursiveCompute( this.var , this.ctx ) ;
	this.recursiveCompute( this.formula , this.computed , base ) ;

	return this.computed ;
} ;



Parametric.prototype.recursiveCompute = function( self , computed , base ) {
	var key , value , baseValue ;

	for ( key in self ) {
		value = self[ key ] ;
		baseValue = base && typeof base === 'object' ? base[ key ] : undefined ;

		if ( typeof value === 'boolean' || typeof value === 'number' ) {
			computed[ key ] = value ;
		}
		else if ( typeof value === 'function' ) {
			this.ctx.base = baseValue ;
			computed[ key ] = value( operators , this.ctx ) ;
			//computed[ key ] = value( this.ctx ) ;
		}
		else if ( value && typeof value === 'object' ) {
			computed[ key ] = {} ;	// Don't share with eventData
			this.recursiveCompute( value , computed[ key ] , baseValue ) ;
		}

		//console.warn( "!!!!!!!!!!!!!!!!! k/v/V" , key , value , computed[ key ] ) ;
	}
} ;


},{"./browser-extension.js":18}],18:[function(require,module,exports){
/*
	3D Ground With Sprites

	Copyright (c) 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const BrowserExm = require( 'exm/lib/BrowserExm.js' ) ;
const path = require( 'path' ) ;



const extension = BrowserExm.registerExtension( {
	module ,
	ns: 'spellcast.web-client' ,
	id: '3dgws' ,
	exports: {} ,
	hooks: {
		init: async () => {
			console.warn( "Extension 3DGWS: starting init" ) ;
			await import( extension.dirPath + '/babylonjs.js' ) ;
			await import( extension.dirPath + '/babylonjs.gui.js' ) ;
			extension.host.api.addEngine( '3dgws' , require( './engine.js' ) ) ;
			console.warn( "Extension 3DGWS fully loaded" ) ;
		}
	}
} ) ;

module.exports = extension ;


},{"./engine.js":19,"exm/lib/BrowserExm.js":27,"path":32}],19:[function(require,module,exports){
/*
	3D Ground With Sprites

	Copyright (c) 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const engine = {} ;
module.exports = engine ;

engine.GScene = require( './GScene.js' ) ;
engine.Camera = require( './Camera.js' ) ;
engine.GEntity = require( './GEntity.js' ) ;
engine.perUsageGEntity = {
	hemisphericLight: require( './GEntityHemisphericLight.js' ) ,
	directionalLight: require( './GEntityDirectionalLight.js' ) ,
	pointLight: require( './GEntityPointLight.js' ) ,
	spotLight: require( './GEntitySpotLight.js' ) ,
	background: require( './GEntityBackground.js' ) ,
	sprite: require( './GEntitySprite.js' ) ,
	shadow: require( './GEntityShadow.js' ) ,
	particleSystem: require( './GEntityParticleSystem.js' ) ,
	floatingText: require( './GEntityFloatingText.js' ) ,
	uiFloatingText: require( './GEntityUiFloatingText.js' ) ,
	basicShape: require( './GEntityBasicShape.js' ) ,
	ground: require( './GEntityGround.js' )
} ;


},{"./Camera.js":1,"./GEntity.js":2,"./GEntityBackground.js":3,"./GEntityBasicShape.js":4,"./GEntityDirectionalLight.js":5,"./GEntityFloatingText.js":6,"./GEntityGround.js":7,"./GEntityHemisphericLight.js":8,"./GEntityParticleSystem.js":9,"./GEntityPointLight.js":10,"./GEntityShadow.js":11,"./GEntitySpotLight.js":12,"./GEntitySprite.js":13,"./GEntityUiFloatingText.js":14,"./GScene.js":15}],20:[function(require,module,exports){
/*
	3D Ground With Sprites

	Copyright (c) 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const utils = {} ;
module.exports = utils ;



// Angle between two vectors projected on the ground plane, return ]-180;+180]
utils.flatVectorsAngleDeg = ( base , vector ) => utils.normalizeAngleDeg(
	( Math.atan2( -vector.x , vector.z ) - Math.atan2( -base.x , base.z ) ) * utils.RAD_TO_DEG
) ;



// The facing angle of an object relative to the camera, return ]-180;+180]
/*
utils.facingAngleDeg = ( cameraPosition , objectPosition , objectDirection ) => utils.normalizeAngleDeg(
	(
		Math.atan2( - objectDirection.x , objectDirection.z )
		- Math.atan2( - ( objectPosition.x - cameraPosition.x ) , objectPosition.z - cameraPosition.z )
	) * utils.RAD_TO_DEG
) ;
*/
utils.facingAngleDeg = ( cameraPosition , objectPosition , facing ) => utils.normalizeAngleDeg(
	facing
	- Math.atan2( -( objectPosition.x - cameraPosition.x ) , objectPosition.z - cameraPosition.z ) * utils.RAD_TO_DEG
) ;



utils.degToSector = {} ;
utils.degToSector['ns'] = angle => angle <= 90 || angle >= 270 ? 'n' : 's' ;
utils.degToSector['we'] = angle => angle <= 180 ? 'w' : 'e' ;

const SECTOR_8 = [ 'n' , 'nw' , 'w' , 'sw' , 's' , 'se' , 'e' , 'ne' , 'n' ] ;
utils.degToSector['8'] = angle => SECTOR_8[ Math.floor( ( angle + 22.5 ) / 45 ) ] ;

const SECTOR_4 = [ 'n' , 'w' , 's' , 'e' , 'n' ] ;
utils.degToSector['4'] = angle => SECTOR_4[ Math.floor( ( angle + 45 ) / 90 ) ] ;

const SECTOR_4_DIAG = [ 'nw' , 'sw' , 'se' , 'ne' ] ;
utils.degToSector['4-diag'] = angle => SECTOR_4_DIAG[ Math.floor( angle / 90 ) ] ;

utils.xFlipSector = {
	n: 'n' , ne: 'nw' , e: 'w' , se: 'sw' , s: 's' , sw: 'se' , w: 'e' , nw: 'ne'
} ;



utils.cameraRotationFromOriginAndTarget = ( origin , target , rz = 0 ) => {
	var x = target.x - origin.x ,
		y = target.y - origin.y ,
		z = target.z - origin.z ,
		// usually atan2( y , x ), but since it's Y-up, z is used instead of y, and since (0,0,0) rotation for camera
		// means looking toward +z, we need a Pi/2 compensation, and it looks like sign is reverted (leftHanded?),
		// so after all, x and z get switched
		ry = Math.atan2( x , z ) ,
		// rx is reversed too
		rx = -utils.epsilonAsin( y / Math.hypot( x , y , z ) ) ;

	console.warn( "[!] .rotationFromOriginAndTarget()" , origin , target , x , y , z , ry ) ;
	return new BABYLON.Vector3( rx , ry , rz ) ;
} ;



// Orbital camera alpha and beta angles
utils.toCameraAlpha = yaw => -utils.PI_2 - yaw * utils.DEG_TO_RAD ;
utils.toCameraBeta = pitch => utils.PI_2 - pitch * utils.DEG_TO_RAD ;



// Extracted from the math-kit module:

utils.RAD_TO_DEG = 180 / Math.PI ;
utils.DEG_TO_RAD = Math.PI / 180 ;
utils.PI_2 = Math.PI / 2 ;



// Return an angle between [0;360[
utils.normalizeAngleDeg = a => a >= 0 ? a % 360 : 360 + a % 360 ;



// Fixed (absolute) epsilon (not relative to the exposant, because it's faster to compute)
// EPSILON and INVERSE_EPSILON are private
var EPSILON = 0.0000000001 ;
var INVERSE_EPSILON = Math.round( 1 / EPSILON ) ;
utils.setEpsilon = e => { EPSILON = e ; INVERSE_EPSILON = Math.round( 1 / e ) ; } ;
utils.getEpsilon = () => EPSILON ;



// Math.acos() return NaN if input is 1.0000000000000001 due to rounding, this try to fix that
utils.epsilonAcos = utils.eacos = v => {
	if ( v >= -1 && v <= 1 ) { return Math.acos( v ) ; }

	if ( v > 0 ) {
		if ( v < 1 + EPSILON ) { return 0 ; }
	}
	else if ( v > -1 - EPSILON ) { return Math.PI ; }

	return NaN ;
} ;



// Same for arc sinus
utils.epsilonAsin = utils.easin = v => {
	if ( v >= -1 && v <= 1 ) { return Math.asin( v ) ; }

	if ( v > 0 ) {
		if ( v < 1 + EPSILON ) { return Math.PI / 2 ; }
	}
	else if ( v > -1 - EPSILON ) { return Math.PI / 2 ; }

	return NaN ;
} ;


},{}],21:[function(require,module,exports){
/*
	Array Kit

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const arrayKit = {
	range: require( './range.js' ) ,
	sample: require( './sample.js' ) ,
	inPlaceFilter: require( './inPlaceFilter.js' ) ,
	delete: require( './delete.js' ) ,
	deleteValue: require( './deleteValue.js' )
} ;

module.exports = arrayKit ;

arrayKit.shuffle = array => arrayKit.sample( array , array.length , true ) ;


},{"./delete.js":22,"./deleteValue.js":23,"./inPlaceFilter.js":24,"./range.js":25,"./sample.js":26}],22:[function(require,module,exports){
/*
	Array Kit

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	Delete an element of the array in-place, and move remaining elements one index to the left.
	Faster than splice, since it does not return an array.

	* src `Array` the source array
	* index the index to delete
*/
module.exports = ( src , index ) => {
	if ( index >= src.length ) { return ; }

	var iMax = src.length - 2 ;

	while ( index <= iMax ) {
		src[ index ] = src[ index + 1 ] ;
		index ++ ;
	}

	src.length -- ;
} ;


},{}],23:[function(require,module,exports){
/*
	Array Kit

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



// This is a copy of .inPlaceFilter() with a hard-coded function.

/*
	Delete all occurencies of a value, in-place.

	* src `Array` the source array
	* value: the value to delete
*/
module.exports = ( src , value ) => {
	var currentValue , deletedCount ,
		i = 0 ,
		j = 0 ;

	while ( i < src.length ) {
		currentValue = src[ i ] ;

		// The left-part is for checking NaN (because NaN !== NaN),
		// checking value is fast and avoid unecessary call to Number.isNaN() which is a function call.
		if ( value !== currentValue && ( value || ! Number.isNaN( value ) || ! Number.isNaN( currentValue ) ) ) {
			src[ j ] = currentValue ;
			j ++ ;
		}

		i ++ ;
	}

	deletedCount = src.length - j ;
	src.length = j ;

	return deletedCount ;
} ;


},{}],24:[function(require,module,exports){
/*
	Array Kit

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	Like array#filter(), but modify the array in-place.

	* src `Array` the source array
	* fn `Function( element , [index] , [array] )`, the condition function used on all element of the array, where:
		* element the current element
		* index the index of the current element
		* the array
	* thisArg: what is used as `this` inside the callback function
	* forceKey: for that key instead of the index of the current element (useful for other libs)
*/
module.exports = ( src , fn , thisArg , forceKey ) => {
	var hasForcedKey = arguments.length >= 4 ,
		value ,
		i = 0 ,
		j = 0 ;

	while ( i < src.length ) {
		value = src[ i ] ;

		if ( fn.call( thisArg , value , hasForcedKey ? forceKey : i , src ) ) {
			src[ j ] = value ;
			j ++ ;
		}

		i ++ ;
	}

	src.length = j ;

	return src ;
} ;


},{}],25:[function(require,module,exports){
/*
	Array Kit

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	Create an array.

	.range( [start] , end , [step] ), where:

	* start `number` (default: 0) the value of the first item
	* end `number` the values end at this number (excluded)
	* step `number` (default: 1) the value of the increment
*/
module.exports = function( start , end , step ) {
	if ( ! arguments.length ) { return [] ; }

	if ( arguments.length === 1 ) {
		end = start ;
		start = 0 ;
	}

	if ( ! step ) { step = start <= end ? 1 : -1 ; }

	if ( ( step > 0 && start >= end ) || ( step < 0 && start <= end ) ) {
		return [] ;
	}

	var i = 0 , v = start , output = [] ;

	if ( step > 0 ) {
		for ( ; v < end ; i ++ , v += step ) { output[ i ] = v ; }
	}
	else {
		for ( ; v > end ; i ++ , v += step ) { output[ i ] = v ; }
	}

	return output ;
} ;


},{}],26:[function(require,module,exports){
/*
	Array Kit

	Copyright (c) 2014 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	.sample( array , count , inPlace ): Return a new array with random element from the first one.

	* array: the source array
	* count: the number of element to keep
	* inPlace: boolean, true if the array should be shuffled in-place
*/
module.exports = ( array , count = Infinity , inPlace = false ) => {
	var currentIndex , randomIndex , temp ,
		sample = inPlace ? array : [ ... array ] ;

	count = Math.max( Math.min( count , array.length ) , 0 ) ;

	for ( currentIndex = 0 ; currentIndex < count ; currentIndex ++ ) {
		randomIndex = currentIndex + Math.floor( ( sample.length - currentIndex ) * Math.random() ) ;
		temp = sample[ currentIndex ] ;
		sample[ currentIndex ] = sample[ randomIndex ] ;
		sample[ randomIndex ] = temp ;
	}

	sample.length = count ;

	return sample ;
} ;


},{}],27:[function(require,module,exports){
(function (global){
/*
	EXM

	Copyright (c) 2020 - 2021 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



function Exm( options = {} ) {
	if ( ! options.ns ) { throw new Error( "EXM: namespace ('ns') is required!" ) ; }

	this.ns = options.ns ;
	this.extensionPath = options.extensionPath || '/ext' ;
	this.suffix = options.suffix || '/extension.js' ;

	this.api = options.api || {} ;
	this.exports = options.exports || {} ;

	this.extensions = new Map() ;
}

module.exports = Exm ;

Exm.prototype.__prototypeUID__ = 'exm/browser/Exm' ;
Exm.prototype.__prototypeVersion__ = '0.5' ;



Exm.registerNs = function( options = {} ) {
	if ( ! options.ns || typeof options.ns !== 'string' ) { throw new Error( "EXM: namespace ('ns' property) is required!" ) ; }
	if ( global.EXM.ns[ options.ns ] ) { throw new Error( "EXM: namespace '" + options.ns + "' is already registered!" ) ; }

	var exm = new Exm( options ) ;
	global.EXM.ns[ options.ns ] = exm ;
	return exm ;
} ;



Exm.prototype.requireExtension = async function( extName ) {
	if ( this.extensions.has( extName ) ) { return this.extensions.get( extName ) ; }

	var module_ ,
		extUid = this.ns + '.' + extName ,
		extModuleDir = this.extensionPath + '/' + extUid ,
		extModulePath = extModuleDir + this.suffix ;

	try {
		console.warn( "Trying EXM extension: " , extModulePath ) ;
		module_ = await import( extModulePath ) ;
	}
	catch ( error ) {
		throw new Error( "Required extension '" + extName + "' not found." ) ;
	}


	if ( ! module_ || typeof module_ !== 'object' ) {
		throw new Error( "EXM: this is not an EXM Extension (not an object)" ) ;
	}

	if ( module_.extension ) {
		// This is an ES6 module extension, the extension instance is exported as 'extension'
		module_ = module_.extension ;
	}
	else {
		// This is not an ES6 module (e.g. a CommonJS module), so import() somewhat failed except for side-effect.
		// And since Extension save itself on the global scope as a workaround, we will use that.
		module_ = global.EXM.extensions[ extUid ] ;
		if ( ! module_ || typeof module_ !== 'object' ) {
			throw new Error( "EXM: this is not an EXM Extension (not an ES6 module extension and not registered)" ) ;
		}
	}

	if ( ( module_.__prototypeUID__ !== 'exm/Extension' && module_.__prototypeUID__ !== 'exm/browser/Extension' ) ) {
		throw new Error( "EXM: this is not an EXM Extension (no prototype UID found)" ) ;
	}

	if ( module_.id !== extName ) {
		throw new Error( "EXM: Extension ID mismatch (wanted '" + extName + "' but got " + module_.id + "'." ) ;
	}

	try {
		await module_.init( this , extModulePath , extModuleDir ) ;
		console.log( "Extension '" + module_.id + "'" + ( module_.version ? " (v" + module_.version + ") " : '' ) + "is loaded." ) ;
	}
	catch ( error ) {
		let error_ = new Error( "EXM: Failed to init extension '" + extName + "': " + error ) ;
		error_.from = error ;
		throw error ;
	}

	this.extensions.set( extName , module_ ) ;
	return module_ ;
} ;



Exm.Extension = function( options = {} ) {
	this.isInit = false ;
	this.id = options.id ;	// this is the id of the extension
	this.ns = options.ns ;	// this is the namespace of the host
	this.uid = options.ns + '.' + options.id ;
	this.version = options.version || null ;
	this.host = null ;	// the host Exm
	this.path = null ;
	this.dirPath = null ;
	this.fromModule = options.module ;
	this.hooks = options.hooks || {} ;
	this.api = options.api || {} ;
	this.exports = options.exports || {} ;
} ;

Exm.Extension.prototype.__prototypeUID__ = 'exm/browser/Extension' ;
Exm.Extension.prototype.__prototypeVersion__ = Exm.prototype.__prototypeVersion__ ;



Exm.registerExtension = Exm.Extension.register = function( options = {} ) {
	if ( ! options.id || typeof options.id !== 'string' ) { throw new Error( "EXM Extension: ID ('id' property) is required!" ) ; }
	if ( ! options.ns || typeof options.ns !== 'string' ) { throw new Error( "EXM Extension: namespace ('ns' property) is required!" ) ; }

	var extension = new Exm.Extension( options ) ;

	if ( global.EXM.extensions[ extension.uid ] ) {
		throw new Error( "EXM Extension: ID '" + extension.id + "' is already registered for namespace '" + extension.ns + "'!" ) ;
	}

	global.EXM.extensions[ extension.uid ] = extension ;
	return extension ;
} ;



Exm.Extension.prototype.init = async function( host , path_ , dirPath ) {
	if ( this.isInit ) { return ; }

	if ( host.ns !== this.ns ) { throw new Error( "EXM Extension's namespace mismatches the Host!" ) ; }
	if ( path_ ) { this.path = path_ ; }
	if ( dirPath ) { this.dirPath = dirPath ; }
	this.host = host ;

	if ( typeof this.hooks.init === 'function' ) { await this.hooks.init() ; }

	this.isInit = true ;
} ;



// Should be done at the end, when the whole file is loaded

// Global storage is necessary
if ( ! global.EXM ) {
	global.EXM = {
		master: null ,
		ns: {} ,
		extensions: {}
	} ;
}


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],28:[function(require,module,exports){
(function (process,global,setImmediate){
/*
	Next-Gen Events

	Copyright (c) 2015 - 2019 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



// Some features needs a portable nextTick
const nextTick = process.browser ? window.setImmediate : process.nextTick ;



if ( ! global.__NEXTGEN_EVENTS__ ) {
	global.__NEXTGEN_EVENTS__ = {
		recursions: 0
	} ;
}

var globalData = global.__NEXTGEN_EVENTS__ ;



function NextGenEvents() {}
module.exports = NextGenEvents ;
NextGenEvents.prototype.__prototypeUID__ = 'nextgen-events/NextGenEvents' ;
NextGenEvents.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



/* Basic features, more or less compatible with Node.js */



NextGenEvents.SYNC = -Infinity ;
NextGenEvents.DESYNC = -1 ;

NextGenEvents.defaultMaxListeners = Infinity ;



// Not part of the prototype, because it should not pollute userland's prototype.
// It has an eventEmitter as 'this' anyway (always called using call()).
NextGenEvents.init = function() {
	Object.defineProperty( this , '__ngev' , {
		configurable: true ,
		value: new NextGenEvents.Internal()
	} ) ;
} ;



NextGenEvents.Internal = function( from ) {
	this.nice = NextGenEvents.SYNC ;
	this.interruptible = false ;
	this.contexts = {} ;
	this.desync = setImmediate ;
	this.depth = 0 ;

	// States by events
	this.states = {} ;

	// State groups by events
	this.stateGroups = {} ;

	// Listeners by events
	this.listeners = {
		// Special events
		error: [] ,
		interrupt: [] ,
		newListener: [] ,
		removeListener: []
	} ;

	this.hasListenerPriority = false ;
	this.maxListeners = NextGenEvents.defaultMaxListeners ;

	if ( from ) {
		this.nice = from.nice ;
		this.interruptible = from.interruptible ;
		Object.assign( this.states , from.states ) ,
		Object.assign( this.stateGroups , from.stateGroups ) ,

		Object.keys( from.listeners ).forEach( eventName => {
			this.listeners[ eventName ] = from.listeners[ eventName ].slice() ;
		} ) ;

		// Copy all contexts
		Object.keys( from.contexts ).forEach( contextName => {
			var context = from.contexts[ contextName ] ;
			this.contexts[ contextName ] = {
				nice: context.nice ,
				ready: true ,
				status: context.status ,
				serial: context.serial ,
				scopes: {}
			} ;
		} ) ;
	}
} ;



NextGenEvents.initFrom = function( from ) {
	if ( ! from.__ngev ) { NextGenEvents.init.call( from ) ; }

	Object.defineProperty( this , '__ngev' , {
		configurable: true ,
		value: new NextGenEvents.Internal( from.__ngev )
	} ) ;
} ;



/*
	Merge listeners of duplicated event bus:
		* listeners that are present locally but not in all foreigner are removed (one of the foreigner has removed it)
		* listeners that are not present locally but present in at least one foreigner are copied

	Not sure if it will ever go public, it was a very specific use-case (Spellcast).
*/
NextGenEvents.mergeListeners = function( foreigners ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	// Backup the current listeners...
	var oldListeners = this.__ngev.listeners ;


	// Reset listeners...
	this.__ngev.listeners = {} ;

	Object.keys( oldListeners ).forEach( eventName => {
		this.__ngev.listeners[ eventName ] = [] ;
	} ) ;

	foreigners.forEach( foreigner => {
		if ( ! foreigner.__ngev ) { NextGenEvents.init.call( foreigner ) ; }

		Object.keys( foreigner.__ngev.listeners ).forEach( eventName => {
			if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
		} ) ;
	} ) ;


	// Now we can scan by eventName first
	Object.keys( this.__ngev.listeners ).forEach( eventName => {
		var i , iMax , blacklist = [] ;

		// First pass: find all removed listeners and add them to the blacklist
		if ( oldListeners[ eventName ] ) {
			oldListeners[ eventName ].forEach( listener => {
				for ( i = 0 , iMax = foreigners.length ; i < iMax ; i ++ ) {
					if (
						! foreigners[ i ].__ngev.listeners[ eventName ] ||
						foreigners[ i ].__ngev.listeners[ eventName ].indexOf( listener ) === -1
					) {
						blacklist.push( listener ) ;
						break ;
					}
				}
			} ) ;
		}

		// Second pass: add all listeners still not present and that are not blacklisted
		foreigners.forEach( foreigner => {

			foreigner.__ngev.listeners[ eventName ].forEach( listener => {
				if ( this.__ngev.listeners[ eventName ].indexOf( listener ) === -1 && blacklist.indexOf( listener ) === -1 ) {
					this.__ngev.listeners[ eventName ].push( listener ) ;
				}
			} ) ;
		} ) ;
	} ) ;
} ;



// Use it with .bind()
NextGenEvents.filterOutCallback = function( what , currentElement ) { return what !== currentElement ; } ;



// .addListener( eventName , [fn] , [options] )
NextGenEvents.prototype.addListener = function( eventName , fn , options ) {
	var listener , newListenerListeners ;

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	// Argument management
	if ( ! eventName || typeof eventName !== 'string' ) {
		throw new TypeError( ".addListener(): argument #0 should be a non-empty string" ) ;
	}

	if ( typeof fn === 'function' ) {
		listener = {} ;

		if ( ! options || typeof options !== 'object' ) { options = {} ; }
	}
	else if ( options === true && fn && typeof fn === 'object' ) {
		// We want to use the current object as the listener object (used by Spellcast's serializer)
		options = listener = fn ;
		fn = undefined ;
	}
	else {
		options = fn ;

		if ( ! options || typeof options !== 'object' ) {
			throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
		}

		fn = undefined ;
		listener = {} ;
	}


	listener.fn = fn || options.fn ;
	listener.id = options.id !== undefined ? options.id : listener.fn ;

	if ( options.unique ) {
		if ( this.__ngev.listeners[ eventName ].find( e => e.id === listener.id ) ) {
			// Not unique! Return now!
			return ;
		}
	}

	listener.once = !! options.once ;
	listener.async = !! options.async ;
	listener.eventObject = !! options.eventObject ;
	listener.nice = options.nice !== undefined ? Math.floor( options.nice ) : NextGenEvents.SYNC ;
	listener.priority = + options.priority || 0 ;
	listener.context = options.context && ( typeof options.context === 'string' || typeof options.context === 'object' ) ? options.context : null ;

	if ( typeof listener.fn !== 'function' ) {
		throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
	}

	// Implicit context creation
	if ( typeof listener.context === 'string' ) {
		listener.context = this.__ngev.contexts[ listener.context ] || this.addListenerContext( listener.context ) ;
	}

	// Note: 'newListener' and 'removeListener' event return an array of listener, but not the event name.
	// So the event's name can be retrieved in the listener itself.
	listener.event = eventName ;

	if ( this.__ngev.listeners.newListener.length ) {
		// Extra care should be taken with the 'newListener' event, we should avoid recursion
		// in the case that eventName === 'newListener', but inside a 'newListener' listener,
		// .listenerCount() should report correctly
		newListenerListeners = this.__ngev.listeners.newListener.slice() ;

		this.__ngev.listeners[ eventName ].push( listener ) ;

		// Return an array, because one day, .addListener() may support multiple event addition at once,
		// e.g.: .addListener( { request: onRequest, close: onClose, error: onError } ) ;
		NextGenEvents.emitEvent( {
			emitter: this ,
			name: 'newListener' ,
			args: [ [ listener ] ] ,
			listeners: newListenerListeners
		} ) ;

		if ( this.__ngev.states[ eventName ] ) { NextGenEvents.emitToOneListener( this.__ngev.states[ eventName ] , listener ) ; }

		return this ;
	}

	this.__ngev.listeners[ eventName ].push( listener ) ;

	if ( this.__ngev.hasListenerPriority ) {
		// order higher priority first
		this.__ngev.listeners[ eventName ].sort( ( a , b ) => b.priority - a.priority ) ;
	}

	if ( this.__ngev.listeners[ eventName ].length === this.__ngev.maxListeners + 1 ) {
		process.emitWarning(
			"Possible NextGenEvents memory leak detected. " + this.__ngev.listeners[ eventName ].length + ' ' +
			eventName + " listeners added. Use emitter.setMaxListeners() to increase limit" ,
			{ type: "MaxListenersExceededWarning" }
		) ;
	}

	if ( this.__ngev.states[ eventName ] ) { NextGenEvents.emitToOneListener( this.__ngev.states[ eventName ] , listener ) ; }

	return this ;
} ;

NextGenEvents.prototype.on = NextGenEvents.prototype.addListener ;



// Short-hand
// .once( eventName , [fn] , [options] )
NextGenEvents.prototype.once = function( eventName , fn , options ) {
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }

	return this.addListener( eventName , fn , options ) ;
} ;



// .waitFor( eventName )
// A Promise-returning .once() variant, only the first arg is returned
NextGenEvents.prototype.waitFor = function( eventName ) {
	return new Promise( resolve => {
		this.addListener( eventName , ( firstArg ) => resolve( firstArg ) , { once: true } ) ;
	} ) ;
} ;



// .waitForAll( eventName )
// A Promise-returning .once() variant, all args are returned as an array
NextGenEvents.prototype.waitForAll = function( eventName ) {
	return new Promise( resolve => {
		this.addListener( eventName , ( ... args ) => resolve( args ) , { once: true } ) ;
	} ) ;
} ;



NextGenEvents.prototype.removeListener = function( eventName , id ) {
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeListener(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	var listeners = this.__ngev.listeners[ eventName ] ;
	if ( ! listeners || ! listeners.length ) { return this ; }

	var i , removedListeners , removeCount = 0 ,
		length = listeners.length ,
		hasRemoveListener = this.__ngev.listeners.removeListener.length ;

	if ( hasRemoveListener ) { removedListeners = [] ; }

	// In-place remove (from the listener array)
	for ( i = 0 ; i < length ; i ++ ) {
		if ( listeners[ i ].id === id ) {
			removeCount ++ ;
			if ( hasRemoveListener ) { removedListeners.push( listeners[ i ] ) ; }
		}
		else if ( removeCount ) {
			listeners[ i - removeCount ] = listeners[ i ] ;
		}
	}

	// Adjust the length
	if ( removeCount ) { listeners.length -= removeCount ; }

	if ( hasRemoveListener && removedListeners.length ) {
		this.emit( 'removeListener' , removedListeners ) ;
	}

	return this ;
} ;

NextGenEvents.prototype.off = NextGenEvents.prototype.removeListener ;



NextGenEvents.prototype.removeAllListeners = function( eventName ) {
	var removedListeners ;

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	if ( eventName ) {
		// Remove all listeners for a particular event

		if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeAllListeners(): argument #0 should be undefined or a non-empty string" ) ; }

		if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

		removedListeners = this.__ngev.listeners[ eventName ] ;
		this.__ngev.listeners[ eventName ] = [] ;

		if ( removedListeners.length && this.__ngev.listeners.removeListener.length ) {
			this.emit( 'removeListener' , removedListeners ) ;
		}
	}
	else {
		// Remove all listeners for any events
		// 'removeListener' listeners cannot be triggered: they are already deleted
		this.__ngev.listeners = {
			// Special events
			error: [] ,
			interrupt: [] ,
			newListener: [] ,
			removeListener: []
		} ;
	}

	return this ;
} ;



NextGenEvents.listenerWrapper = function( listener , event , contextScope , serial , nice ) {
	var returnValue , listenerCallback ,
		eventMaster = event.master || event ,
		interruptible = !! event.master || event.emitter.__ngev.interruptible ;

	if ( eventMaster.interrupt ) { return ; }

	if ( listener.async ) {
		if ( contextScope ) {
			contextScope.ready = ! serial ;
		}

		if ( nice < 0 ) {
			if ( globalData.recursions >= -nice ) {
				event.emitter.__ngev.desync( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) ) ;
				return ;
			}
		}
		else {
			setTimeout( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) , nice ) ;
			return ;
		}

		listenerCallback = ( arg ) => {

			eventMaster.listenersDone ++ ;

			// Async interrupt
			if ( arg && interruptible && ! eventMaster.interrupt && event.name !== 'interrupt' ) {
				eventMaster.interrupt = arg ;

				if ( eventMaster.callback ) { NextGenEvents.emitCallback( event ) ; }

				event.emitter.emit( 'interrupt' , eventMaster.interrupt ) ;
			}
			else if ( eventMaster.listenersDone >= eventMaster.listeners.length && eventMaster.callback ) {
				NextGenEvents.emitCallback( event ) ;
			}

			// Process the queue if serialized
			if ( serial ) { NextGenEvents.processScopeQueue( contextScope , true , true ) ; }
		} ;

		if ( listener.eventObject ) { listener.fn( event , listenerCallback ) ; }
		else { returnValue = listener.fn( ... event.args , listenerCallback ) ; }
	}
	else {
		if ( nice < 0 ) {
			if ( globalData.recursions >= -nice ) {
				event.emitter.__ngev.desync( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) ) ;
				return ;
			}
		}
		else {
			setTimeout( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) , nice ) ;
			return ;
		}

		if ( listener.eventObject ) { listener.fn( event ) ; }
		else { returnValue = listener.fn( ... event.args ) ; }

		eventMaster.listenersDone ++ ;
	}

	// Interrupt if non-falsy return value, if the emitter is interruptible, not already interrupted (emit once),
	// and not within an 'interrupt' event.
	if ( returnValue && interruptible && ! eventMaster.interrupt && event.name !== 'interrupt' ) {
		eventMaster.interrupt = returnValue ;

		if ( eventMaster.callback ) { NextGenEvents.emitCallback( event ) ; }

		event.emitter.emit( 'interrupt' , eventMaster.interrupt ) ;
	}
	else if ( eventMaster.listenersDone >= eventMaster.listeners.length && eventMaster.callback ) {
		NextGenEvents.emitCallback( event ) ;
	}
} ;



// A unique event ID
var nextEventId = 0 ;



/*
	emit( [nice] , eventName , [arg1] , [arg2] , [...] , [emitCallback] )
*/
NextGenEvents.prototype.emit = function( ... args ) {
	var event = NextGenEvents.createEvent( this , ... args ) ;
	return NextGenEvents.emitEvent( event ) ;
} ;



// For performance, do not emit if there is no listener for that event,
// do not even return an Event object, do not throw if the event name is error,
// or whatever the .emit() process could do when there is no listener.
NextGenEvents.prototype.emitIfListener = function( ... args ) {
	var eventName = typeof args[ 0 ] === 'number' ? args[ 1 ] : args[ 0 ] ;
	if ( ! this.__ngev || ! this.__ngev.listeners[ eventName ] || ! this.__ngev.listeners[ eventName ].length ) { return null ; }
	var event = NextGenEvents.createEvent( this , ... args ) ;
	return NextGenEvents.emitEvent( event ) ;
} ;



NextGenEvents.prototype.waitForEmit = function( ... args ) {
	return new Promise( resolve => {
		this.emit( ... args , ( interrupt ) => resolve( interrupt ) ) ;
	} ) ;
} ;



// Create an event object
NextGenEvents.createEvent = function( emitter , ... args ) {
	var event = {
		emitter: emitter ,
		interrupt: null ,
		master: null ,	// For grouped-correlated events
		sync: true
	} ;

	// Arguments handling
	if ( typeof args[ 0 ] === 'number' ) {
		event.nice = Math.floor( args[ 0 ] ) ;
		event.name = args[ 1 ] ;

		if ( ! event.name || typeof event.name !== 'string' ) {
			throw new TypeError( ".emit(): when argument #0 is a number, argument #1 should be a non-empty string" ) ;
		}

		if ( typeof args[ args.length - 1 ] === 'function' ) {
			event.callback = args[ args.length - 1 ] ;
			event.args = args.slice( 2 , -1 ) ;
		}
		else {
			event.args = args.slice( 2 ) ;
		}
	}
	else {
		//event.nice = emitter.__ngev.nice ;
		event.name = args[ 0 ] ;

		if ( ! event.name || typeof event.name !== 'string' ) {
			throw new TypeError( ".emit(): argument #0 should be an number or a non-empty string" ) ;
		}

		if ( typeof args[ args.length - 1 ] === 'function' ) {
			event.callback = args[ args.length - 1 ] ;
			event.args = args.slice( 1 , -1 ) ;
		}
		else {
			event.args = args.slice( 1 ) ;
		}
	}

	return event ;
} ;



/*
	At this stage, 'event' should be an object having those properties:
		* emitter: the event emitter
		* name: the event name
		* args: array, the arguments of the event
		* nice: (optional) nice value
		* callback: (optional) a callback for emit
		* listeners: (optional) override the listeners array stored in __ngev
*/
NextGenEvents.emitEvent = function( event ) {
	// /!\ Any change here *MUST* be reflected to NextGenEvents.emitIntricatedEvents() /!\
	var self = event.emitter ,
		i , iMax , count = 0 , state , removedListeners ;

	if ( ! self.__ngev ) { NextGenEvents.init.call( self ) ; }

	state = self.__ngev.states[ event.name ] ;

	// This is a state event, register it now!
	if ( state !== undefined ) {
		if ( state && event.args.length === state.args.length &&
			event.args.every( ( arg , index ) => arg === state.args[ index ] ) ) {
			// The emitter is already in this exact state, skip it now!
			return ;
		}

		// Unset all states of that group
		self.__ngev.stateGroups[ event.name ].forEach( ( eventName ) => {
			self.__ngev.states[ eventName ] = null ;
		} ) ;

		self.__ngev.states[ event.name ] = event ;
	}

	if ( ! self.__ngev.listeners[ event.name ] ) { self.__ngev.listeners[ event.name ] = [] ; }

	event.id = nextEventId ++ ;
	event.listenersDone = 0 ;

	if ( event.nice === undefined || event.nice === null ) { event.nice = self.__ngev.nice ; }

	// Trouble arise when a listener is removed from another listener, while we are still in the loop.
	// So we have to COPY the listener array right now!
	if ( ! event.listeners ) { event.listeners = self.__ngev.listeners[ event.name ].slice() ; }

	// Increment globalData.recursions
	globalData.recursions ++ ;
	event.depth = self.__ngev.depth ++ ;
	removedListeners = [] ;

	try {
		// Emit the event to all listeners!
		for ( i = 0 , iMax = event.listeners.length ; i < iMax ; i ++ ) {
			count ++ ;
			NextGenEvents.emitToOneListener( event , event.listeners[ i ] , removedListeners ) ;
		}
	}
	catch ( error ) {
		// Catch error, just to decrement globalData.recursions, re-throw after that...
		globalData.recursions -- ;
		self.__ngev.depth -- ;
		throw error ;
	}

	// Decrement globalData.recursions
	globalData.recursions -- ;
	if ( ! event.callback ) { self.__ngev.depth -- ; }

	// Emit 'removeListener' after calling listeners
	if ( removedListeners.length && self.__ngev.listeners.removeListener.length ) {
		self.emit( 'removeListener' , removedListeners ) ;
	}


	// 'error' event is a special case: it should be listened for, or it will throw an error
	if ( ! count ) {
		if ( event.name === 'error' ) {
			if ( event.args[ 0 ] ) { throw event.args[ 0 ] ; }
			else { throw Error( "Uncaught, unspecified 'error' event." ) ; }
		}

		if ( event.callback ) { NextGenEvents.emitCallback( event ) ; }
	}

	// Leaving sync mode
	event.sync = false ;

	return event ;
} ;



/*
	Spellcast-specific:
	Send interruptible events with listener-priority across multiple emitters.
	If an event is interrupted, all event are interrupted too.
	It has limited feature-support: no state-event, no builtin-event (not even 'error').
*/
NextGenEvents.emitIntricatedEvents = function( array , callback ) {
	var i , iMax , count = 0 , removedListeners ;

	if ( ! Array.isArray( array ) ) {
		throw new TypeError( '.emitCorrelatedEvents() argument should be an array' ) ;
	}

	var listenerEventRows = [] ,
		context = {
			nice: NextGenEvents.DESYNC ,
			ready: true ,
			status: NextGenEvents.CONTEXT_ENABLED ,
			serial: true ,
			scopes: {}
		} ,
		master = {
			sync: false ,
			nice: NextGenEvents.DESYNC ,
			context ,
			interrupt: null ,
			listeners: listenerEventRows ,	// because we need eventMaster.listeners.length
			listenersDone: 0 ,
			depth: 0 ,
			callback
		} ;

	array.forEach( eventParams => {
		var event = NextGenEvents.createEvent( ... eventParams ) ;
		event.master = master ;

		if ( ! event.emitter.__ngev ) { NextGenEvents.init.call( event.emitter ) ; }

		if ( ! event.emitter.__ngev.listeners[ event.name ] ) { event.emitter.__ngev.listeners[ event.name ] = [] ; }
		event.listeners = event.emitter.__ngev.listeners[ event.name ].slice() ;

		event.id = nextEventId ++ ;
		//event.listenersDone = 0 ;
		//event.nice = master.nice ;

		event.listeners.forEach( listener => listenerEventRows.push( { event , listener } ) ) ;
	} ) ;


	// Sort listeners
	listenerEventRows.sort( ( a , b ) => b.listener.priority - a.listener.priority ) ;

	// Increment globalData.recursions
	globalData.recursions ++ ;

	removedListeners = [] ;

	try {
		// Emit the event to all listeners!
		for ( i = 0 , iMax = listenerEventRows.length ; i < iMax ; i ++ ) {
			count ++ ;
			NextGenEvents.emitToOneListener( listenerEventRows[ i ].event , listenerEventRows[ i ].listener , removedListeners ) ;
		}
	}
	catch ( error ) {
		// Catch error, just to decrement globalData.recursions, re-throw after that...
		globalData.recursions -- ;
		throw error ;
	}

	// Decrement globalData.recursions
	globalData.recursions -- ;

	if ( ! count && master.callback ) { NextGenEvents.emitCallback( event ) ; }

	// Leaving sync mode
	master.sync = false ;
} ;



// If removedListeners is not given, then one-time listener emit the 'removeListener' event,
// if given: that's the caller business to do it
NextGenEvents.emitToOneListener = function( event , listener , removedListeners ) {
	var self = event.emitter ,
		eventMaster = event.master || event ,
		context = event.master ? event.master.context : listener.context ,
		contextScope , serial , currentNice , emitRemoveListener = false ;

	if ( context ) {
		// If the listener context is disabled...
		if ( context.status === NextGenEvents.CONTEXT_DISABLED ) { return ; }

		// The nice value for this listener...
		currentNice = Math.max( eventMaster.nice , listener.nice , context.nice ) ;
		serial = context.serial ;
		contextScope = NextGenEvents.getContextScope( context , eventMaster.depth ) ;
	}
	else {
		currentNice = Math.max( eventMaster.nice , listener.nice ) ;
	}


	if ( listener.once ) {
		// We should remove the current listener RIGHT NOW because of recursive .emit() issues:
		// one listener may eventually fire this very same event synchronously during the current loop.
		self.__ngev.listeners[ event.name ] = self.__ngev.listeners[ event.name ].filter(
			NextGenEvents.filterOutCallback.bind( undefined , listener )
		) ;

		if ( removedListeners ) { removedListeners.push( listener ) ; }
		else { emitRemoveListener = true ; }
	}

	if ( context && ( context.status === NextGenEvents.CONTEXT_QUEUED || ! contextScope.ready ) ) {
		// Almost all works should be done by .emit(), and little few should be done by .processScopeQueue()
		contextScope.queue.push( { event: event , listener: listener , nice: currentNice } ) ;
	}
	else {
		NextGenEvents.listenerWrapper( listener , event , contextScope , serial , currentNice ) ;
	}

	// Emit 'removeListener' after calling the listener
	if ( emitRemoveListener && self.__ngev.listeners.removeListener.length ) {
		self.emit( 'removeListener' , [ listener ] ) ;
	}
} ;



NextGenEvents.emitCallback = function( event ) {
	var callback ;

	if ( event.master ) {
		callback = event.master.callback ;
		delete event.master.callback ;

		if ( event.master.sync ) {
			nextTick( () => callback( event.master.interrupt , event ) ) ;
		}
		else {
			callback( event.master.interrupt , event ) ;
		}

		return ;
	}

	callback = event.callback ;
	delete event.callback ;

	if ( event.sync && event.emitter.__ngev.nice !== NextGenEvents.SYNC ) {
		// Force desync if global nice value is not SYNC
		event.emitter.__ngev.desync( () => {
			event.emitter.__ngev.depth -- ;
			callback( event.interrupt , event ) ;
		} ) ;
	}
	else {
		event.emitter.__ngev.depth -- ;
		callback( event.interrupt , event ) ;
	}
} ;



NextGenEvents.prototype.listeners = function( eventName ) {
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listeners(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	// Do not return the array, shallow copy it
	return this.__ngev.listeners[ eventName ].slice() ;
} ;



NextGenEvents.listenerCount = function( emitter , eventName ) {
	if ( ! emitter || ! ( emitter instanceof NextGenEvents ) ) { throw new TypeError( ".listenerCount(): argument #0 should be an instance of NextGenEvents" ) ; }
	return emitter.listenerCount( eventName ) ;
} ;



NextGenEvents.prototype.listenerCount = function( eventName ) {
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listenerCount(): argument #1 should be a non-empty string" ) ; }
	if ( ! this.__ngev || ! this.__ngev.listeners[ eventName ] ) { return 0 ; }
	return this.__ngev.listeners[ eventName ].length ;
} ;



NextGenEvents.prototype.setNice = function( nice ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.nice = Math.floor( + nice || 0 ) ;
} ;



NextGenEvents.prototype.desyncUseNextTick = function( useNextTick ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.desync = useNextTick ? nextTick : setImmediate ;
} ;



NextGenEvents.prototype.setInterruptible = function( isInterruptible ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.interruptible = !! isInterruptible ;
} ;



NextGenEvents.prototype.setListenerPriority = function( hasListenerPriority ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.hasListenerPriority = !! hasListenerPriority ;
} ;



// Make two objects share the same event bus
NextGenEvents.share = function( source , target ) {
	if ( ! ( source instanceof NextGenEvents ) || ! ( target instanceof NextGenEvents ) ) {
		throw new TypeError( 'NextGenEvents.share() arguments should be instances of NextGenEvents' ) ;
	}

	if ( ! source.__ngev ) { NextGenEvents.init.call( source ) ; }

	Object.defineProperty( target , '__ngev' , {
		configurable: true ,
		value: source.__ngev
	} ) ;
} ;



NextGenEvents.reset = function( emitter ) {
	Object.defineProperty( emitter , '__ngev' , {
		configurable: true ,
		value: null
	} ) ;
} ;



NextGenEvents.prototype.getMaxListeners = function() {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return this.__ngev.maxListeners ;
} ;



NextGenEvents.prototype.setMaxListeners = function( n ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.maxListeners = typeof n === 'number' && ! Number.isNaN( n ) ? Math.floor( n ) : NextGenEvents.defaultMaxListeners ;
	return this ;
} ;



// Sometime useful as a no-op callback...
NextGenEvents.noop = () => undefined ;





/* Next Gen feature: states! */



// .defineStates( exclusiveState1 , [exclusiveState2] , [exclusiveState3] , ... )
NextGenEvents.prototype.defineStates = function( ... states ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	states.forEach( ( state ) => {
		this.__ngev.states[ state ] = null ;
		this.__ngev.stateGroups[ state ] = states ;
	} ) ;
} ;



NextGenEvents.prototype.hasState = function( state ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return !! this.__ngev.states[ state ] ;
} ;



NextGenEvents.prototype.getAllStates = function() {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return Object.keys( this.__ngev.states ).filter( e => this.__ngev.states[ e ] ) ;
} ;





/* Next Gen feature: groups! */



NextGenEvents.groupAddListener = function( emitters , eventName , fn , options ) {
	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	fn = fn || options.fn ;
	delete options.fn ;

	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;

	emitters.forEach( ( emitter ) => {
		emitter.addListener( eventName , fn.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;

NextGenEvents.groupOn = NextGenEvents.groupAddListener ;



// Once per emitter
NextGenEvents.groupOnce = function( emitters , eventName , fn , options ) {
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }

	return this.groupAddListener( emitters , eventName , fn , options ) ;
} ;



// A Promise-returning .groupOnce() variant, it returns an array with only the first arg for each emitter's event
NextGenEvents.groupWaitFor = function( emitters , eventName ) {
	return Promise.all( emitters.map( emitter => emitter.waitFor( eventName ) ) ) ;
} ;



// A Promise-returning .groupOnce() variant, it returns an array of array for each emitter's event
NextGenEvents.groupWaitForAll = function( emitters , eventName ) {
	return Promise.all( emitters.map( emitter => emitter.waitForAll( eventName ) ) ) ;
} ;



// Globally once, only one event could be emitted, by the first emitter to emit
NextGenEvents.groupOnceFirst = function( emitters , eventName , fn , options ) {
	var fnWrapper , triggered = false ;

	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	fn = fn || options.fn ;
	delete options.fn ;

	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;

	fnWrapper = ( ... args ) => {
		if ( triggered ) { return ; }
		triggered = true ;
		NextGenEvents.groupRemoveListener( emitters , eventName , options.id ) ;
		fn( ... args ) ;
	} ;

	emitters.forEach( ( emitter ) => {
		emitter.once( eventName , fnWrapper.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;



// A Promise-returning .groupOnceFirst() variant, only the first arg is returned
NextGenEvents.groupWaitForFirst = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceFirst( emitters , eventName , ( firstArg ) => resolve( firstArg ) ) ;
	} ) ;
} ;



// A Promise-returning .groupOnceFirst() variant, all args are returned as an array
NextGenEvents.groupWaitForFirstAll = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceFirst( emitters , eventName , ( ... args ) => resolve( args ) ) ;
	} ) ;
} ;



// Globally once, only one event could be emitted, by the last emitter to emit
NextGenEvents.groupOnceLast = function( emitters , eventName , fn , options ) {
	var fnWrapper , triggered = false , count = emitters.length ;

	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	fn = fn || options.fn ;
	delete options.fn ;

	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;

	fnWrapper = ( ... args ) => {
		if ( triggered ) { return ; }
		if ( -- count ) { return ; }

		// So this is the last emitter...

		triggered = true ;
		// No need to remove listeners: there are already removed anyway
		//NextGenEvents.groupRemoveListener( emitters , eventName , options.id ) ;
		fn( ... args ) ;
	} ;

	emitters.forEach( ( emitter ) => {
		emitter.once( eventName , fnWrapper.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;



// A Promise-returning .groupGlobalWaitFor() variant, only the first arg is returned
NextGenEvents.groupWaitForLast = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceLast( emitters , eventName , ( firstArg ) => resolve( firstArg ) ) ;
	} ) ;
} ;



// A Promise-returning .groupGlobalWaitFor() variant, all args are returned as an array
NextGenEvents.groupWaitForLastAll = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceLast( emitters , eventName , ( ... args ) => resolve( args ) ) ;
	} ) ;
} ;



NextGenEvents.groupRemoveListener = function( emitters , eventName , id ) {
	emitters.forEach( ( emitter ) => {
		emitter.removeListener( eventName , id ) ;
	} ) ;
} ;

NextGenEvents.groupOff = NextGenEvents.groupRemoveListener ;



NextGenEvents.groupRemoveAllListeners = function( emitters , eventName ) {
	emitters.forEach( ( emitter ) => {
		emitter.removeAllListeners( eventName ) ;
	} ) ;
} ;



NextGenEvents.groupEmit = function( emitters , ... args ) {
	var eventName , nice , argStart = 1 , argEnd , count = emitters.length ,
		callback , callbackWrapper , callbackTriggered = false ;

	if ( typeof args[ args.length - 1 ] === 'function' ) {
		argEnd = -1 ;
		callback = args[ args.length - 1 ] ;

		callbackWrapper = ( interruption ) => {
			if ( callbackTriggered ) { return ; }

			if ( interruption ) {
				callbackTriggered = true ;
				callback( interruption ) ;
			}
			else if ( ! -- count ) {
				callbackTriggered = true ;
				callback() ;
			}
		} ;
	}

	if ( typeof args[ 0 ] === 'number' ) {
		argStart = 2 ;
		nice = typeof args[ 0 ] ;
	}

	eventName = args[ argStart - 1 ] ;
	args = args.slice( argStart , argEnd ) ;

	emitters.forEach( ( emitter ) => {
		NextGenEvents.emitEvent( {
			emitter: emitter ,
			name: eventName ,
			args: args ,
			nice: nice ,
			callback: callbackWrapper
		} ) ;
	} ) ;
} ;



NextGenEvents.groupWaitForEmit = function( emitters , ... args ) {
	return new Promise( resolve => {
		NextGenEvents.groupEmit( emitters , ... args , ( interrupt ) => resolve( interrupt ) ) ;
	} ) ;
} ;



NextGenEvents.groupDefineStates = function( emitters , ... args ) {
	emitters.forEach( ( emitter ) => {
		emitter.defineStates( ... args ) ;
	} ) ;
} ;



// Bad names, but since they make their way through the API documentation,
// it should be kept for backward compatibility, but they are DEPRECATED.
NextGenEvents.groupGlobalOnce = NextGenEvents.groupOnceFirst ;
NextGenEvents.groupGlobalOnceAll = NextGenEvents.groupOnceLast ;





/* Next Gen feature: contexts! */



NextGenEvents.CONTEXT_ENABLED = 0 ;
NextGenEvents.CONTEXT_DISABLED = 1 ;
NextGenEvents.CONTEXT_QUEUED = 2 ;



NextGenEvents.prototype.addListenerContext = function( contextName , options ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".addListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var context = this.__ngev.contexts[ contextName ] ;

	if ( ! context ) {
		context = this.__ngev.contexts[ contextName ] = {
			nice: NextGenEvents.SYNC ,
			ready: true ,
			status: NextGenEvents.CONTEXT_ENABLED ,
			serial: false ,
			scopes: {}
		} ;
	}

	if ( options.nice !== undefined ) { context.nice = Math.floor( options.nice ) ; }
	if ( options.status !== undefined ) { context.status = options.status ; }
	if ( options.serial !== undefined ) { context.serial = !! options.serial ; }

	return context ;
} ;



NextGenEvents.prototype.getListenerContext = function( contextName ) {
	return this.__ngev.contexts[ contextName ] ;
} ;



NextGenEvents.getContextScope = function( context , scopeName ) {
	var scope = context.scopes[ scopeName ] ;

	if ( ! scope ) {
		scope = context.scopes[ scopeName ] = {
			ready: true ,
			queue: []
		} ;
	}

	return scope ;
} ;



NextGenEvents.prototype.disableListenerContext = function( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_DISABLED ;

	return this ;
} ;



NextGenEvents.prototype.enableListenerContext = function( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".enableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	var context = this.__ngev.contexts[ contextName ] ;

	context.status = NextGenEvents.CONTEXT_ENABLED ;

	Object.values( context.scopes ).forEach( contextScope => {
		if ( contextScope.queue.length > 0 ) { NextGenEvents.processScopeQueue( contextScope , context.serial ) ; }
	} ) ;

	return this ;
} ;



NextGenEvents.prototype.queueListenerContext = function( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".queueListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_QUEUED ;

	return this ;
} ;



NextGenEvents.prototype.serializeListenerContext = function( contextName , value ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".serializeListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].serial = value === undefined ? true : !! value ;

	return this ;
} ;



NextGenEvents.prototype.setListenerContextNice = function( contextName , nice ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".setListenerContextNice(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].nice = Math.floor( nice ) ;

	return this ;
} ;



NextGenEvents.prototype.destroyListenerContext = function( contextName ) {
	var i , length , context , eventName , newListeners , removedListeners = [] ;

	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	context = this.__ngev.contexts[ contextName ] ;
	if ( ! context ) { return ; }

	for ( eventName in this.__ngev.listeners ) {
		newListeners = null ;
		length = this.__ngev.listeners[ eventName ].length ;

		for ( i = 0 ; i < length ; i ++ ) {
			if ( this.__ngev.listeners[ eventName ][ i ].context === context ) {
				newListeners = [] ;
				removedListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
			else if ( newListeners ) {
				newListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
		}

		if ( newListeners ) { this.__ngev.listeners[ eventName ] = newListeners ; }
	}

	delete this.__ngev.contexts[ contextName ] ;

	if ( removedListeners.length && this.__ngev.listeners.removeListener.length ) {
		this.emit( 'removeListener' , removedListeners ) ;
	}

	return this ;
} ;



NextGenEvents.processScopeQueue = function( contextScope , serial , isCompletionCallback ) {
	var job , event , eventMaster , emitter ;

	if ( isCompletionCallback ) { contextScope.ready = true ; }

	// Increment recursion
	globalData.recursions ++ ;

	while ( contextScope.ready && contextScope.queue.length ) {
		job = contextScope.queue.shift() ;
		event = job.event ;
		eventMaster = event.master || event ;
		emitter = event.emitter ;

		// This event has been interrupted, drop it now!
		if ( eventMaster.interrupt ) { continue ; }

		NextGenEvents.listenerWrapper( job.listener , event , contextScope , serial , job.nice ) ;
	}

	// Decrement recursion
	globalData.recursions -- ;
} ;



// Backup for the AsyncTryCatch
NextGenEvents.on = NextGenEvents.prototype.on ;
NextGenEvents.once = NextGenEvents.prototype.once ;
NextGenEvents.off = NextGenEvents.prototype.off ;



if ( global.AsyncTryCatch ) {
	NextGenEvents.prototype.asyncTryCatchId = global.AsyncTryCatch.NextGenEvents.length ;
	global.AsyncTryCatch.NextGenEvents.push( NextGenEvents ) ;

	if ( global.AsyncTryCatch.substituted ) {
		global.AsyncTryCatch.substitute() ;
	}
}



// Load Proxy AT THE END (circular require)
NextGenEvents.Proxy = require( './Proxy.js' ) ;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"../package.json":31,"./Proxy.js":29,"_process":33,"timers":44}],29:[function(require,module,exports){
/*
	Next-Gen Events

	Copyright (c) 2015 - 2019 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



function Proxy() {
	this.localServices = {} ;
	this.remoteServices = {} ;
	this.nextAckId = 1 ;
}

module.exports = Proxy ;

var NextGenEvents = require( './NextGenEvents.js' ) ;
var MESSAGE_TYPE = 'NextGenEvents/message' ;

function noop() {}



// Backward compatibility
Proxy.create = ( ... args ) => new Proxy( ... args ) ;



// Add a local service accessible remotely
Proxy.prototype.addLocalService = function( id , emitter , options ) {
	this.localServices[ id ] = LocalService.create( this , id , emitter , options ) ;
	return this.localServices[ id ] ;
} ;



// Add a remote service accessible locally
Proxy.prototype.addRemoteService = function( id ) {
	this.remoteServices[ id ] = RemoteService.create( this , id ) ;
	return this.remoteServices[ id ] ;
} ;



// Destroy the proxy
Proxy.prototype.destroy = function() {
	Object.keys( this.localServices ).forEach( ( id ) => {
		this.localServices[ id ].destroy() ;
		delete this.localServices[ id ] ;
	} ) ;

	Object.keys( this.remoteServices ).forEach( ( id ) => {
		this.remoteServices[ id ].destroy() ;
		delete this.remoteServices[ id ] ;
	} ) ;

	this.receive = this.send = noop ;
} ;



// Push an event message.
Proxy.prototype.push = function( message ) {
	if (
		message.__type !== MESSAGE_TYPE ||
		! message.service || typeof message.service !== 'string' ||
		! message.event || typeof message.event !== 'string' ||
		! message.method
	) {
		return ;
	}

	switch ( message.method ) {
		// Those methods target a remote service
		case 'event' :
			return this.remoteServices[ message.service ] && this.remoteServices[ message.service ].receiveEvent( message ) ;
		case 'ackEmit' :
			return this.remoteServices[ message.service ] && this.remoteServices[ message.service ].receiveAckEmit( message ) ;

		// Those methods target a local service
		case 'emit' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveEmit( message ) ;
		case 'listen' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveListen( message ) ;
		case 'ignore' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveIgnore( message ) ;
		case 'ackEvent' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveAckEvent( message ) ;

		default :
			return ;
	}
} ;



// This is the method to receive and decode data from the other side of the communication channel, most of time another proxy.
// In most case, this should be overwritten.
Proxy.prototype.receive = function( raw ) {
	this.push( raw ) ;
} ;



// This is the method used to send data to the other side of the communication channel, most of time another proxy.
// This MUST be overwritten in any case.
Proxy.prototype.send = function() {
	throw new Error( 'The send() method of the Proxy MUST be extended/overwritten' ) ;
} ;



/* Local Service */



function LocalService( proxy , id , emitter , options ) { return LocalService.create( proxy , id , emitter , options ) ; }
Proxy.LocalService = LocalService ;



LocalService.create = function( proxy , id , emitter , options ) {
	var self = Object.create( LocalService.prototype , {
		proxy: { value: proxy , enumerable: true } ,
		id: { value: id , enumerable: true } ,
		emitter: { value: emitter , writable: true , enumerable: true } ,
		internalEvents: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		events: { value: {} , enumerable: true } ,
		canListen: { value: !! options.listen , writable: true , enumerable: true } ,
		canEmit: { value: !! options.emit , writable: true , enumerable: true } ,
		canAck: { value: !! options.ack , writable: true , enumerable: true } ,
		canRpc: { value: !! options.rpc , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true }
	} ) ;

	return self ;
} ;



// Destroy a service
LocalService.prototype.destroy = function() {
	Object.keys( this.events ).forEach( ( eventName ) => {
		this.emitter.off( eventName , this.events[ eventName ] ) ;
		delete this.events[ eventName ] ;
	} ) ;

	this.emitter = null ;
	this.destroyed = true ;
} ;



// Remote want to emit on the local service
LocalService.prototype.receiveEmit = function( message ) {
	if ( this.destroyed || ! this.canEmit || ( message.ack && ! this.canAck ) ) { return ; }

	var event = {
		emitter: this.emitter ,
		name: message.event ,
		args: message.args || []
	} ;

	if ( message.ack ) {
		event.callback = ( interruption ) => {

			this.proxy.send( {
				__type: MESSAGE_TYPE ,
				service: this.id ,
				method: 'ackEmit' ,
				ack: message.ack ,
				event: message.event ,
				interruption: interruption
			} ) ;
		} ;
	}

	NextGenEvents.emitEvent( event ) ;
} ;



// Remote want to listen to an event of the local service
LocalService.prototype.receiveListen = function( message ) {
	if ( this.destroyed || ! this.canListen || ( message.ack && ! this.canAck ) ) { return ; }

	if ( message.ack ) {
		if ( this.events[ message.event ] ) {
			if ( this.events[ message.event ].ack ) { return ; }

			// There is already an event, but not featuring ack, remove that listener now
			this.emitter.off( message.event , this.events[ message.event ] ) ;
		}

		this.events[ message.event ] = LocalService.forwardWithAck.bind( this ) ;
		this.events[ message.event ].ack = true ;
		this.emitter.on( message.event , this.events[ message.event ] , { eventObject: true , async: true } ) ;
	}
	else {
		if ( this.events[ message.event ] ) {
			if ( ! this.events[ message.event ].ack ) { return ; }

			// Remote want to downgrade:
			// there is already an event, but featuring ack so we remove that listener now
			this.emitter.off( message.event , this.events[ message.event ] ) ;
		}

		this.events[ message.event ] = LocalService.forward.bind( this ) ;
		this.events[ message.event ].ack = false ;
		this.emitter.on( message.event , this.events[ message.event ] , { eventObject: true } ) ;
	}
} ;



// Remote do not want to listen to that event of the local service anymore
LocalService.prototype.receiveIgnore = function( message ) {
	if ( this.destroyed || ! this.canListen ) { return ; }

	if ( ! this.events[ message.event ] ) { return ; }

	this.emitter.off( message.event , this.events[ message.event ] ) ;
	this.events[ message.event ] = null ;
} ;



//
LocalService.prototype.receiveAckEvent = function( message ) {
	if (
		this.destroyed || ! this.canListen || ! this.canAck || ! message.ack ||
		! this.events[ message.event ] || ! this.events[ message.event ].ack
	) {
		return ;
	}

	this.internalEvents.emit( 'ack' , message ) ;
} ;



// Send an event from the local service to remote
LocalService.forward = function( event ) {
	if ( this.destroyed ) { return ; }

	this.proxy.send( {
		__type: MESSAGE_TYPE ,
		service: this.id ,
		method: 'event' ,
		event: event.name ,
		args: event.args
	} ) ;
} ;

LocalService.forward.ack = false ;



// Send an event from the local service to remote, with ACK
LocalService.forwardWithAck = function( event , callback ) {
	if ( this.destroyed ) { return ; }

	if ( ! event.callback ) {
		// There is no emit callback, no need to ack this one
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'event' ,
			event: event.name ,
			args: event.args
		} ) ;

		callback() ;
		return ;
	}

	var triggered = false ;
	var ackId = this.proxy.nextAckId ++ ;

	var onAck = ( message ) => {
		if ( triggered || message.ack !== ackId ) { return ; }	// Not our ack...
		//if ( message.event !== event ) { return ; }	// Do we care?
		triggered = true ;
		this.internalEvents.off( 'ack' , onAck ) ;
		callback() ;
	} ;

	this.internalEvents.on( 'ack' , onAck ) ;

	this.proxy.send( {
		__type: MESSAGE_TYPE ,
		service: this.id ,
		method: 'event' ,
		event: event.name ,
		ack: ackId ,
		args: event.args
	} ) ;
} ;

LocalService.forwardWithAck.ack = true ;



/* Remote Service */



function RemoteService( proxy , id ) { return RemoteService.create( proxy , id ) ; }
//RemoteService.prototype = Object.create( NextGenEvents.prototype ) ;
//RemoteService.prototype.constructor = RemoteService ;
Proxy.RemoteService = RemoteService ;



var EVENT_NO_ACK = 1 ;
var EVENT_ACK = 2 ;



RemoteService.create = function( proxy , id ) {
	var self = Object.create( RemoteService.prototype , {
		proxy: { value: proxy , enumerable: true } ,
		id: { value: id , enumerable: true } ,
		// This is the emitter where everything is routed to
		emitter: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		internalEvents: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		events: { value: {} , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true }

		/*	Useless for instance, unless some kind of service capabilities discovery mechanism exists
		canListen: { value: !! options.listen , writable: true , enumerable: true } ,
		canEmit: { value: !! options.emit , writable: true , enumerable: true } ,
		canAck: { value: !! options.ack , writable: true , enumerable: true } ,
		canRpc: { value: !! options.rpc , writable: true , enumerable: true } ,
		*/
	} ) ;

	return self ;
} ;



// Destroy a service
RemoteService.prototype.destroy = function() {
	this.emitter.removeAllListeners() ;
	this.emitter = null ;
	Object.keys( this.events ).forEach( ( eventName ) => { delete this.events[ eventName ] ; } ) ;
	this.destroyed = true ;
} ;



// Local code want to emit to remote service
RemoteService.prototype.emit = function( eventName , ... args ) {
	if ( this.destroyed ) { return ; }

	var callback , ackId , triggered ;

	if ( typeof eventName === 'number' ) { throw new TypeError( 'Cannot emit with a nice value on a remote service' ) ; }

	if ( typeof args[ args.length - 1 ] !== 'function' ) {
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'emit' ,
			event: eventName ,
			args: args
		} ) ;

		return ;
	}

	callback = args.pop() ;
	ackId = this.proxy.nextAckId ++ ;
	triggered = false ;

	var onAck = ( message ) => {
		if ( triggered || message.ack !== ackId ) { return ; }	// Not our ack...
		//if ( message.event !== event ) { return ; }	// Do we care?
		triggered = true ;
		this.internalEvents.off( 'ack' , onAck ) ;
		callback( message.interruption ) ;
	} ;

	this.internalEvents.on( 'ack' , onAck ) ;

	this.proxy.send( {
		__type: MESSAGE_TYPE ,
		service: this.id ,
		method: 'emit' ,
		ack: ackId ,
		event: eventName ,
		args: args
	} ) ;
} ;



// Local code want to listen to an event of remote service
RemoteService.prototype.addListener = function( eventName , fn , options ) {
	if ( this.destroyed ) { return ; }

	// Manage arguments the same way NextGenEvents#addListener() does
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	options.fn = fn || options.fn ;

	this.emitter.addListener( eventName , options ) ;

	// No event was added...
	if ( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) { return ; }

	// If the event is successfully listened to and was not remotely listened...
	if ( options.async && this.events[ eventName ] !== EVENT_ACK ) {
		// We need to listen to or upgrade this event
		this.events[ eventName ] = EVENT_ACK ;

		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'listen' ,
			ack: true ,
			event: eventName
		} ) ;
	}
	else if ( ! options.async && ! this.events[ eventName ] ) {
		// We need to listen to this event
		this.events[ eventName ] = EVENT_NO_ACK ;

		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'listen' ,
			event: eventName
		} ) ;
	}
} ;

RemoteService.prototype.on = RemoteService.prototype.addListener ;

// This is a shortcut to this.addListener()
RemoteService.prototype.once = NextGenEvents.prototype.once ;



// Local code want to ignore an event of remote service
RemoteService.prototype.removeListener = function( eventName , id ) {
	if ( this.destroyed ) { return ; }

	this.emitter.removeListener( eventName , id ) ;

	// If no more listener are locally tied to with event and the event was remotely listened...
	if (
		( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) &&
		this.events[ eventName ]
	) {
		this.events[ eventName ] = 0 ;

		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'ignore' ,
			event: eventName
		} ) ;
	}
} ;

RemoteService.prototype.off = RemoteService.prototype.removeListener ;



// A remote service sent an event we are listening to, emit on the service representing the remote
RemoteService.prototype.receiveEvent = function( message ) {
	if ( this.destroyed || ! this.events[ message.event ] ) { return ; }

	var event = {
		emitter: this.emitter ,
		name: message.event ,
		args: message.args || []
	} ;

	if ( message.ack ) {
		event.callback = () => {

			this.proxy.send( {
				__type: MESSAGE_TYPE ,
				service: this.id ,
				method: 'ackEvent' ,
				ack: message.ack ,
				event: message.event
			} ) ;
		} ;
	}

	NextGenEvents.emitEvent( event ) ;

	var eventName = event.name ;

	// Here we should catch if the event is still listened to ('once' type listeners)
	//if ( this.events[ eventName ]	) // not needed, already checked at the begining of the function
	if ( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) {
		this.events[ eventName ] = 0 ;

		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'ignore' ,
			event: eventName
		} ) ;
	}
} ;



//
RemoteService.prototype.receiveAckEmit = function( message ) {
	if ( this.destroyed || ! message.ack || this.events[ message.event ] !== EVENT_ACK ) {
		return ;
	}

	this.internalEvents.emit( 'ack' , message ) ;
} ;


},{"./NextGenEvents.js":28}],30:[function(require,module,exports){
(function (process){
/*
	Next-Gen Events

	Copyright (c) 2015 - 2019 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



if ( typeof window.setImmediate !== 'function' ) {
	window.setImmediate = fn => setTimeout( fn , 0 ) ;
}

if ( ! process.emitWarning ) {
	// Looks like browserify don't have this
	process.emitWarning = () => undefined ;
}

module.exports = require( './NextGenEvents.js' ) ;
module.exports.isBrowser = true ;


}).call(this,require('_process'))
},{"./NextGenEvents.js":28,"_process":33}],31:[function(require,module,exports){
module.exports={
  "name": "nextgen-events",
  "version": "1.4.0",
  "description": "The next generation of events handling for javascript! New: abstract away the network!",
  "main": "lib/NextGenEvents.js",
  "engines": {
    "node": ">=6.0.0"
  },
  "directories": {
    "test": "test"
  },
  "dependencies": {},
  "devDependencies": {
    "browserify": "^16.2.2",
    "uglify-js-es6": "^2.8.9",
    "ws": "^5.1.1"
  },
  "scripts": {
    "test": "tea-time -R dot"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/cronvel/nextgen-events.git"
  },
  "keywords": [
    "events",
    "async",
    "emit",
    "listener",
    "context",
    "series",
    "serialize",
    "namespace",
    "proxy",
    "network"
  ],
  "author": "Cédric Ronvel",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/cronvel/nextgen-events/issues"
  },
  "config": {
    "tea-time": {
      "coverDir": [
        "lib"
      ]
    }
  },
  "copyright": {
    "title": "Next-Gen Events",
    "years": [
      2015,
      2019
    ],
    "owner": "Cédric Ronvel"
  }
}

},{}],32:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":33}],33:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],34:[function(require,module,exports){
(function (process,global){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":33}],35:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



function Queue( jobRunner , concurrency = 4 ) {
	this.jobRunner = jobRunner ;
	this.jobs = new Map() ;			// all jobs
	this.pendingJobs = new Map() ;	// only pending jobs (not run)
	this.runningJobs = new Map() ;	// only running jobs (not done)
	this.errorJobs = new Map() ;	// jobs that have failed
	this.jobsDone = new Map() ;		// jobs that finished successfully
	this.concurrency = + concurrency || 1 ;

	// Internal
	this.isQueueRunning = true ;
	this.isLoopRunning = false ;
	this.canLoopAgain = false ;
	this.ready = Promise.resolved ;

	// Misc
	this.startTime = null ;		// timestamp at the first time the loop is run
	this.endTime = null ;		// timestamp at the last time the loop exited

	// External API, resolved when there is no jobs anymore in the queue, a new Promise is created when new element are injected
	this.drained = Promise.resolved ;

	// External API, resolved when the Queue has nothing to do: either it's drained or the pending jobs have dependencies that cannot be solved
	this.idle = Promise.resolved ;
}

Promise.Queue = Queue ;



function Job( id , dependencies = null , data = undefined ) {
	this.id = id ;
	this.dependencies = dependencies === null ? null : [ ... dependencies ] ;
	this.data = data === undefined ? id : data ;
	this.error = null ;
	this.startTime = null ;
	this.endTime = null ;
}

Queue.Job = Job ;



Queue.prototype.setConcurrency = function( concurrency ) { this.concurrency = + concurrency || 1 ; } ;
Queue.prototype.stop = Queue.prototype.pause = function() { this.isQueueRunning = false ; } ;
Queue.prototype.has = function( id ) { return this.jobs.has( id ) ; } ;



Queue.prototype.add = Queue.prototype.addJob = function( id , data , dependencies = null ) {
	// Don't add it twice!
	if ( this.jobs.has( id ) ) { return false ; }

	var job = new Job( id , dependencies , data ) ;
	this.jobs.set( id , job ) ;
	this.pendingJobs.set( id , job ) ;
	this.canLoopAgain = true ;
	if ( this.isQueueRunning && ! this.isLoopRunning ) { this.run() ; }
	if ( this.drained.isSettled() ) { this.drained = new Promise() ; }
	return job ;
} ;



// Add a batch of jobs, with only id (data=id) and no dependencies
Queue.prototype.addBatch = Queue.prototype.addJobBatch = function( ids ) {
	var id , job ;

	for ( id of ids ) {
		// Don't add it twice!
		if ( this.jobs.has( id ) ) { return false ; }
		job = new Job( id ) ;
		this.jobs.set( id , job ) ;
		this.pendingJobs.set( id , job ) ;
	}

	this.canLoopAgain = true ;
	if ( this.isQueueRunning && ! this.isLoopRunning ) { this.run() ; }
	if ( this.drained.isSettled() ) { this.drained = new Promise() ; }
} ;



Queue.prototype.run = Queue.prototype.resume = async function() {
	var job ;

	this.isQueueRunning = true ;

	if ( this.isLoopRunning ) { return ; }
	this.isLoopRunning = true ;

	if ( ! this.startTime ) { this.startTime = Date.now() ; }

	do {
		this.canLoopAgain = false ;

		for ( job of this.pendingJobs.values() ) {
			if ( job.dependencies && job.dependencies.some( dependencyId => ! this.jobsDone.has( dependencyId ) ) ) { continue ; }
			// This should be done synchronously:
			if ( this.idle.isSettled() ) { this.idle = new Promise() ; }
			this.canLoopAgain = true ;

			await this.ready ;

			// Something has stopped the queue while we were awaiting.
			// This check MUST be done only after "await", before is potentially synchronous, and things only change concurrently during an "await"
			if ( ! this.isQueueRunning ) { this.finishRun() ; return ; }

			this.runJob( job ) ;
		}
	} while ( this.canLoopAgain ) ;

	this.finishRun() ;
} ;



// Finish current run
Queue.prototype.finishRun = function() {
	this.isLoopRunning = false ;

	if ( ! this.pendingJobs.size ) { this.drained.resolve() ; }

	if ( ! this.runningJobs.size ) {
		this.endTime = Date.now() ;
		this.idle.resolve() ;
	}
} ;



Queue.prototype.runJob = async function( job ) {
	// Immediately remove it synchronously from the pending queue and add it to the running one
	this.pendingJobs.delete( job.id ) ;
	this.runningJobs.set( job.id , job ) ;

	if ( this.runningJobs.size >= this.concurrency ) { this.ready = new Promise() ; }

	// Async part
	try {
		job.startTime = Date.now() ;
		await this.jobRunner( job.data ) ;
		job.endTime = Date.now() ;
		this.jobsDone.set( job.id , job ) ;
		this.canLoopAgain = true ;
	}
	catch ( error ) {
		job.endTime = Date.now() ;
		job.error = error ;
		this.errorJobs.set( job.id , job ) ;
	}

	this.runningJobs.delete( job.id ) ;
	if ( this.runningJobs.size < this.concurrency ) { this.ready.resolve() ; }

	// This MUST come last, because it retry the loop: dependencies may have been unlocked!
	if ( ! this.isLoopRunning ) {
		if ( this.isQueueRunning && this.pendingJobs.size ) { this.run() ; }
		else { this.finishRun() ; }
	}
} ;



Queue.prototype.getJobTimes = function() {
	var job , stats = {} ;
	for ( job of this.jobsDone.values() ) { stats[ job.id ] = job.endTime - job.startTime ; }
	return stats ;
} ;



Queue.prototype.getStats = function() {
	var job , sum = 0 ,
		stats = {
			pending: this.pendingJobs.size ,
			running: this.runningJobs.size ,
			failed: this.errorJobs.size ,
			done: this.jobsDone.size ,
			averageJobTime: null ,
			queueTime: null
		} ;

	if ( this.jobsDone.size ) {
		for ( job of this.jobsDone.values() ) { sum += job.endTime - job.startTime ; }
		stats.averageJobTime = sum / this.jobsDone.size ;
	}

	if ( this.endTime ) { stats.queueTime = this.endTime - this.startTime ; }

	return stats ;
} ;


},{"./seventh.js":42}],36:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



Promise.promisifyNodeApi = ( api , suffix , multiSuffix , filter , anything ) => {
	var keys ;

	suffix = suffix || 'Async' ;
	multiSuffix = multiSuffix || 'AsyncAll' ;
	filter = filter || ( key => key[ 0 ] !== '_' && ! key.endsWith( 'Sync' ) ) ;

	if ( anything ) {
		keys = [] ;

		for ( let key in api ) {
			if ( typeof api[ key ] === 'function' ) { keys.push( key ) ; }
		}
	}
	else {
		keys = Object.keys( api ) ;
	}

	keys.filter( key => {
		if ( typeof api[ key ] !== 'function' ) { return false ; }

		// If it has any enumerable properties on its prototype, it's a constructor
		for ( let trash in api[ key ].prototype ) { return false ; }

		return filter( key , api ) ;
	} )
		.forEach( key => {
			const targetKey = key + suffix ;
			const multiTargetKey = key + multiSuffix ;

			// Do nothing if it already exists
			if ( ! api[ targetKey ] ) {
				api[ targetKey ] = Promise.promisify( api[ key ] , api ) ;
			}

			if ( ! api[ multiTargetKey ] ) {
				api[ multiTargetKey ] = Promise.promisifyAll( api[ key ] , api ) ;
			}
		} ) ;
} ;



Promise.promisifyAnyNodeApi = ( api , suffix , multiSuffix , filter ) => {
	Promise.promisifyNodeApi( api , suffix , multiSuffix , filter , true ) ;
} ;



},{"./seventh.js":42}],37:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



// This object is used as a special unique value for array hole (see Promise.filter())
const HOLE = {} ;

function noop() {}



Promise.all = ( iterable ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then(
					value_ => {
						if ( settled ) { return ; }

						values[ promiseIndex ] = value_ ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							allPromise._resolveValue( values ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						allPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		allPromise._resolveValue( values ) ;
	}

	return allPromise ;
} ;



// Maybe faster, but can't find any reasonable grounds for that ATM
//Promise.all =
Promise._allArray = ( iterable ) => {
	var length = iterable.length ;

	if ( ! length ) { Promise._resolveValue( [] ) ; }

	var index ,
		runtime = {
			settled: false ,
			count: 0 ,
			length: length ,
			values: [] ,
			allPromise: new Promise()
		} ;

	for ( index = 0 ; ! runtime.settled && index < length ; index ++ ) {
		Promise._allArrayOne( iterable[ index ] , index , runtime ) ;
	}

	return runtime.allPromise ;
} ;



// internal for allArray
Promise._allArrayOne = ( value , index , runtime ) => {
	Promise._bareThen( value ,
		value_ => {
			if ( runtime.settled ) { return ; }

			runtime.values[ index ] = value_ ;
			runtime.count ++ ;

			if ( runtime.count >= runtime.length ) {
				runtime.settled = true ;
				runtime.allPromise._resolveValue( runtime.values ) ;
			}
		} ,
		error => {
			if ( runtime.settled ) { return ; }
			runtime.settled = true ;
			runtime.allPromise.reject( error ) ;
		}
	) ;
} ;


// Promise.all() with an iterator
Promise.every =
Promise.map = ( iterable , iterator ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					return iterator( value_ , promiseIndex ) ;
				} )
				.then(
					value_ => {
						if ( settled ) { return ; }

						values[ promiseIndex ] = value_ ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							allPromise._resolveValue( values ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						allPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		allPromise._resolveValue( values ) ;
	}

	return allPromise ;
} ;



/*
	It works symmetrically with Promise.all(), the resolve and reject logic are switched.
	Therefore, it resolves to the first resolving promise OR reject if all promises are rejected
	with, as a reason, the array of all promise rejection reasons.
*/
Promise.any = ( iterable ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value ,
		errors = [] ,
		anyPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then(
					value_ => {
						if ( settled ) { return ; }

						settled = true ;
						anyPromise._resolveValue( value_ ) ;
					} ,
					error => {
						if ( settled ) { return ; }

						errors[ promiseIndex ] = error ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							anyPromise.reject( errors ) ;
						}
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ;
	}

	return anyPromise ;
} ;



// Like Promise.any() but with an iterator
Promise.some = ( iterable , iterator ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value ,
		errors = [] ,
		anyPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					return iterator( value_ , promiseIndex ) ;
				} )
				.then(
					value_ => {
						if ( settled ) { return ; }

						settled = true ;
						anyPromise._resolveValue( value_ ) ;
					} ,
					error => {
						if ( settled ) { return ; }

						errors[ promiseIndex ] = error ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							anyPromise.reject( errors ) ;
						}
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ;
	}

	return anyPromise ;
} ;



/*
	More closed to Array#filter().
	The iterator should return truthy if the array element should be kept,
	or falsy if the element should be filtered out.
	Any rejection reject the whole promise.
*/
Promise.filter = ( iterable , iterator ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		filterPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					values[ promiseIndex ] = value_ ;
					return iterator( value_ , promiseIndex ) ;
				} )
				.then(
					iteratorValue => {
						if ( settled ) { return ; }

						count ++ ;

						if ( ! iteratorValue ) { values[ promiseIndex ] = HOLE ; }

						if ( count >= length ) {
							settled = true ;
							values = values.filter( e => e !== HOLE ) ;
							filterPromise._resolveValue( values ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						filterPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		filterPromise._resolveValue( values ) ;
	}
	else if ( count >= length ) {
		settled = true ;
		values = values.filter( e => e !== HOLE ) ;
		filterPromise._resolveValue( values ) ;
	}

	return filterPromise ;
} ;



// forEach performs reduce as well, if a third argument is supplied
// Force a function statement because we are using arguments.length, so we can support accumulator equals to undefined
Promise.foreach =
Promise.forEach = function( iterable , iterator , accumulator ) {
	var index = -1 ,
		isReduce = arguments.length >= 3 ,
		it = iterable[Symbol.iterator]() ,
		forEachPromise = new Promise() ,
		lastPromise = Promise.resolve( accumulator ) ;

	// The array-like may contains promises that could be rejected before being handled
	if ( Promise.warnUnhandledRejection ) { Promise._handleAll( iterable ) ; }

	var nextElement = () => {
		lastPromise.then(
			accumulator_ => {
				let { value , done } = it.next() ;
				index ++ ;

				if ( done ) {
					forEachPromise.resolve( accumulator_ ) ;
				}
				else {
					lastPromise = Promise.resolve( value ).then(
						isReduce ?
							value_ => iterator( accumulator_ , value_ , index ) :
							value_ => iterator( value_ , index )
					) ;

					nextElement() ;
				}
			} ,
			error => {
				forEachPromise.reject( error ) ;

				// We have to eat all remaining promise errors
				for ( ;; ) {
					let { value , done } = it.next() ;
					if ( done ) { break ; }

					//if ( ( value instanceof Promise ) || ( value instanceof NativePromise ) )
					if ( Promise.isThenable( value ) ) {
						value.then( noop , noop ) ;
					}
				}
			}
		) ;
	} ;

	nextElement() ;

	return forEachPromise ;
} ;



Promise.reduce = ( iterable , iterator , accumulator ) => {
	// Force 3 arguments
	return Promise.forEach( iterable , iterator , accumulator ) ;
} ;



/*
	Same than map, but iterate over an object and produce an object.
	Think of it as a kind of Object#map() (which of course does not exist).
*/
Promise.mapObject = ( inputObject , iterator ) => {
	var settled = false ,
		count = 0 ,
		i , key , keys = Object.keys( inputObject ) ,
		length = keys.length ,
		value , outputObject = {} ,
		mapPromise = new Promise() ;

	for ( i = 0 ; ! settled && i < length ; i ++ ) {
		key = keys[ i ] ;
		value = inputObject[ key ] ;

		// Create a scope to keep track of the promise's own key
		( () => {
			const promiseKey = key ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					return iterator( value_ , promiseKey ) ;
				} )
				.then(
					value_ => {
						if ( settled ) { return ; }

						outputObject[ promiseKey ] = value_ ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							mapPromise._resolveValue( outputObject ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						mapPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	if ( ! length ) {
		mapPromise._resolveValue( outputObject ) ;
	}

	return mapPromise ;
} ;



// Like map, but with a concurrency limit
Promise.concurrent = ( limit , iterable , iterator ) => {
	var index = -1 , settled = false ,
		running = 0 ,
		count = 0 , length = Infinity ,
		value , done = false ,
		values = [] ,
		it = iterable[Symbol.iterator]() ,
		concurrentPromise = new Promise() ;

	// The array-like may contains promises that could be rejected before being handled
	if ( Promise.warnUnhandledRejection ) { Promise._handleAll( iterable ) ; }

	limit = + limit || 1 ;

	const runBatch = () => {
		while ( ! done && running < limit ) {

			//console.log( "Pre" , index ) ;
			( { value , done } = it.next() ) ;

			if ( done ) {
				length = index + 1 ;

				if ( count >= length ) {
					settled = true ;
					concurrentPromise._resolveValue( values ) ;
					return ;
				}
				break ;
			}

			if ( settled ) { break ; }

			index ++ ;

			// Create a scope to keep track of the promise's own index
			( () => {
				const promiseIndex = index ;

				running ++ ;
				//console.log( "Launch" , promiseIndex ) ;

				Promise.resolve( value )
					.then( value_ => {
						if ( settled ) { return ; }
						return iterator( value_ , promiseIndex ) ;
					} )
					.then(
						value_ => {
						//console.log( "Done" , promiseIndex , value_ ) ;
							if ( settled ) { return ; }

							values[ promiseIndex ] = value_ ;
							count ++ ;
							running -- ;

							//console.log( "count/length" , count , length ) ;
							if ( count >= length ) {
								settled = true ;
								concurrentPromise._resolveValue( values ) ;
								return ;
							}

							if ( running < limit ) {
								runBatch() ;
								return ;
							}
						} ,
						error => {
							if ( settled ) { return ; }
							settled = true ;
							concurrentPromise.reject( error ) ;
						}
					) ;
			} )() ;
		}
	} ;

	runBatch() ;

	if ( index < 0 ) {
		concurrentPromise._resolveValue( values ) ;
	}

	return concurrentPromise ;
} ;



/*
	Like native Promise.race(), it is hanging forever if the array is empty.
	It resolves or rejects to the first resolved/rejected promise.
*/
Promise.race = ( iterable ) => {
	var settled = false ,
		value ,
		racePromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		Promise.resolve( value )
			.then(
				value_ => {
					if ( settled ) { return ; }

					settled = true ;
					racePromise._resolveValue( value_ ) ;
				} ,
				error => {
					if ( settled ) { return ; }

					settled = true ;
					racePromise.reject( error ) ;
				}
			) ;
	}

	return racePromise ;
} ;


},{"./seventh.js":42}],38:[function(require,module,exports){
(function (process,global,setImmediate){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	Prerequisite.
*/



const NativePromise = global.Promise ;

// Cross-platform next tick function
var nextTick ;

if ( ! process.browser ) {
	nextTick = process.nextTick ;
}
else {
	// Browsers suck, they don't have setImmediate() except IE/Edge.
	// A module is needed to emulate it.
	require( 'setimmediate' ) ;
	nextTick = setImmediate ;
}



/*
	Constructor.
*/



function Promise( fn ) {
	this.fn = fn ;
	this._then = Promise._dormantThen ;
	this.value = null ;
	this.thenHandlers = null ;
	this.handledRejection = null ;

	if ( this.fn ) {
		this._exec() ;
	}
}

module.exports = Promise ;



Promise.Native = NativePromise ;
Promise.warnUnhandledRejection = true ;



Promise.prototype._exec = function() {
	this._then = Promise._pendingThen ;

	try {
		this.fn(
			// Don't return anything, it would create nasty bugs! E.g.:
			// bad: error => this.reject( error_ )
			// good: error_ => { this.reject( error_ ) ; }
			result_ => { this.resolve( result_ ) ; } ,
			error_ => { this.reject( error_ ) ; }
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;



/*
	Resolve/reject and then-handlers management.
*/



Promise.prototype.resolve = Promise.prototype.fulfill = function( value ) {
	// Throw an error?
	if ( this._then.settled ) { return this ; }

	if ( Promise.isThenable( value ) ) {
		this._execThenPromise( value ) ;
		return this ;
	}

	return this._resolveValue( value ) ;
} ;



Promise.prototype._resolveValue = function( value ) {
	this._then = Promise._fulfilledThen ;
	this.value = value ;
	if ( this.thenHandlers && this.thenHandlers.length ) { this._execFulfillHandlers() ; }

	return this ;
} ;



// Faster on node v8.x
Promise.prototype._execThenPromise = function( thenPromise ) {
	try {
		thenPromise.then(
			result_ => { this.resolve( result_ ) ; } ,
			error_ => { this.reject( error_ ) ; }
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;



Promise.prototype.reject = function( error ) {
	// Throw an error?
	if ( this._then.settled ) { return this ; }

	this._then = Promise._rejectedThen ;
	this.value = error ;

	if ( this.thenHandlers && this.thenHandlers.length ) {
		this._execRejectionHandlers() ;
	}
	else if ( Promise.warnUnhandledRejection && ! this.handledRejection ) {
		this._unhandledRejection() ;
	}

	return this ;
} ;



Promise.prototype._execFulfillHandlers = function() {
	var i ,
		length = this.thenHandlers.length ;

	// Do cache the length, if a handler is synchronously added, it will be called on next tick
	for ( i = 0 ; i < length ; i += 3 ) {
		if ( this.thenHandlers[ i + 1 ] ) {
			this._execOneFulfillHandler( this.thenHandlers[ i ] , this.thenHandlers[ i + 1 ] ) ;
		}
		else {
			this.thenHandlers[ i ].resolve( this.value ) ;
		}
	}
} ;



// Faster on node v8.x?
//*
Promise.prototype._execOneFulfillHandler = function( promise , onFulfill ) {
	try {
		promise.resolve( onFulfill( this.value ) ) ;
	}
	catch ( error_ ) {
		promise.reject( error_ ) ;
	}
} ;
//*/



Promise.prototype._execRejectionHandlers = function() {
	var i ,
		length = this.thenHandlers.length ;

	// Do cache the length, if a handler is synchronously added, it will be called on next tick
	for ( i = 0 ; i < length ; i += 3 ) {
		if ( this.thenHandlers[ i + 2 ] ) {
			this._execOneRejectHandler( this.thenHandlers[ i ] , this.thenHandlers[ i + 2 ] ) ;
		}
		else {
			this.thenHandlers[ i ].reject( this.value ) ;
		}
	}
} ;



// Faster on node v8.x?
//*
Promise.prototype._execOneRejectHandler = function( promise , onReject ) {
	try {
		promise.resolve( onReject( this.value ) ) ;
	}
	catch ( error_ ) {
		promise.reject( error_ ) ;
	}
} ;
//*/



Promise.prototype.resolveTimeout = Promise.prototype.fulfillTimeout = function( time , result ) {
	setTimeout( () => this.resolve( result ) , time ) ;
} ;



Promise.prototype.rejectTimeout = function( time , error ) {
	setTimeout( () => this.reject( error ) , time ) ;
} ;



/*
	.then() variants depending on the state
*/



// .then() variant when the promise is dormant
Promise._dormantThen = function( onFulfill , onReject ) {
	if ( this.fn ) {
		// If this is a dormant promise, wake it up now!
		this._exec() ;

		// Return now, some sync stuff can change the status
		return this._then( onFulfill , onReject ) ;
	}

	var promise = new Promise() ;

	if ( ! this.thenHandlers ) {
		this.thenHandlers = [ promise , onFulfill , onReject ] ;
	}
	else {
		//this.thenHandlers.push( onFulfill ) ;
		this.thenHandlers[ this.thenHandlers.length ] = promise ;
		this.thenHandlers[ this.thenHandlers.length ] = onFulfill ;
		this.thenHandlers[ this.thenHandlers.length ] = onReject ;
	}

	return promise ;
} ;

Promise._dormantThen.settled = false ;



// .then() variant when the promise is pending
Promise._pendingThen = function( onFulfill , onReject ) {
	var promise = new Promise() ;

	if ( ! this.thenHandlers ) {
		this.thenHandlers = [ promise , onFulfill , onReject ] ;
	}
	else {
		//this.thenHandlers.push( onFulfill ) ;
		this.thenHandlers[ this.thenHandlers.length ] = promise ;
		this.thenHandlers[ this.thenHandlers.length ] = onFulfill ;
		this.thenHandlers[ this.thenHandlers.length ] = onReject ;
	}

	return promise ;
} ;

Promise._pendingThen.settled = false ;



// .then() variant when the promise is fulfilled
Promise._fulfilledThen = function( onFulfill ) {
	if ( ! onFulfill ) { return this ; }

	var promise = new Promise() ;

	// This handler should not fire in this code sync flow
	nextTick( () => {
		try {
			promise.resolve( onFulfill( this.value ) ) ;
		}
		catch ( error ) {
			promise.reject( error ) ;
		}
	} ) ;

	return promise ;
} ;

Promise._fulfilledThen.settled = true ;



// .then() variant when the promise is rejected
Promise._rejectedThen = function( onFulfill , onReject ) {
	if ( ! onReject ) { return this ; }

	this.handledRejection = true ;
	var promise = new Promise() ;

	// This handler should not fire in this code sync flow
	nextTick( () => {
		try {
			promise.resolve( onReject( this.value ) ) ;
		}
		catch ( error ) {
			promise.reject( error ) ;
		}
	} ) ;

	return promise ;
} ;

Promise._rejectedThen.settled = true ;



/*
	.then() and short-hands.
*/



Promise.prototype.then = function( onFulfill , onReject ) {
	return this._then( onFulfill , onReject ) ;
} ;



Promise.prototype.catch = function( onReject = () => undefined ) {
	return this._then( undefined , onReject ) ;
} ;



Promise.prototype.finally = function( onSettled ) {
	return this._then( onSettled , onSettled ) ;
} ;



Promise.prototype.tap = Promise.prototype.tapThen = function( onFulfill ) {
	this._then( onFulfill , undefined ) ;
	return this ;
} ;



Promise.prototype.tapCatch = function( onReject ) {
	this._then( undefined , onReject ) ;
	return this ;
} ;



Promise.prototype.tapFinally = function( onSettled ) {
	this._then( onSettled , onSettled ) ;
	return this ;
} ;



// Any unhandled error throw ASAP
Promise.prototype.fatal = function() {
	this._then( undefined , error => {
		// Throw async, otherwise it would be catched by .then()
		nextTick( () => { throw error ; } ) ;
	} ) ;
} ;



Promise.prototype.done = function( onFulfill , onReject ) {
	this._then( onFulfill , onReject ).fatal() ;
	return this ;
} ;



Promise.prototype.callback = function( cb ) {
	this._then(
		value => { cb( undefined , value ) ; } ,
		error => { cb( error ) ; }
	).fatal() ;

	return this ;
} ;



Promise.prototype.callbackAll = function( cb ) {
	this._then(
		values => {
			if ( Array.isArray( values ) ) { cb( undefined , ... values ) ; }
			else { cb( undefined , values ) ; }
		} ,
		error => { cb( error ) ; }
	).fatal() ;

	return this ;
} ;



/*
	The reverse of .callback(), it calls the function with a callback argument and return a promise that resolve or reject depending on that callback invocation.
	Usage:
		await Promise.callback( callback => myFunctionRelyingOnCallback( [arg1] , [arg2] , [...] , callback ) ;
*/
Promise.callback = function( fn ) {
	return new Promise( ( resolve , reject ) => {
		fn( ( error , arg ) => {
			if ( error ) { reject( error ) ; }
			else { resolve( arg ) ; }
		} ) ;
	} ) ;
} ;



Promise.callbackAll = function( fn ) {
	return new Promise( ( resolve , reject ) => {
		fn( ( error , ... args ) => {
			if ( error ) { reject( error ) ; }
			else { resolve( args ) ; }
		} ) ;
	} ) ;
} ;



Promise.prototype.toPromise =	// <-- DEPRECATED, use .propagate
Promise.prototype.propagate = function( promise ) {
	this._then(
		value => { promise.resolve( value ) ; } ,
		error => { promise.reject( error ) ; }
	) ;

	return this ;
} ;





/*
	Foreign promises facilities
*/



Promise.propagate = function( foreignPromise , promise ) {
	foreignPromise.then(
		value => { promise.resolve( value ) ; } ,
		error => { promise.reject( error ) ; }
	) ;

	return foreignPromise ;
} ;



Promise.finally = function( foreignPromise , onSettled ) {
	return foreignPromise.then( onSettled , onSettled ) ;
} ;





/*
	Static factories.
*/



Promise.resolve = Promise.fulfill = function( value ) {
	if ( Promise.isThenable( value ) ) { return Promise.fromThenable( value ) ; }
	return Promise._resolveValue( value ) ;
} ;



Promise._resolveValue = function( value ) {
	var promise = new Promise() ;
	promise._then = Promise._fulfilledThen ;
	promise.value = value ;
	return promise ;
} ;



Promise.reject = function( error ) {
	//return new Promise().reject( error ) ;
	var promise = new Promise() ;
	promise._then = Promise._rejectedThen ;
	promise.value = error ;
	return promise ;
} ;



Promise.resolveTimeout = Promise.fulfillTimeout = function( timeout , value ) {
	return new Promise( resolve => setTimeout( () => resolve( value ) , timeout ) ) ;
} ;



Promise.rejectTimeout = function( timeout , error ) {
	return new Promise( ( resolve , reject ) => setTimeout( () => reject( error ) , timeout ) ) ;
} ;



Promise.resolveNextTick = Promise.fulfillNextTick = function( value ) {
	return new Promise( resolve => nextTick( () => resolve( value ) ) ) ;
} ;



Promise.rejectNextTick = function( error ) {
	return new Promise( ( resolve , reject ) => nextTick( () => reject( error ) ) ) ;
} ;



// A dormant promise is activated the first time a then handler is assigned
Promise.dormant = function( fn ) {
	var promise = new Promise() ;
	promise.fn = fn ;
	return promise ;
} ;



// Try-catched Promise.resolve( fn() )
Promise.try = function( fn ) {
	try {
		return Promise.resolve( fn() ) ;
	}
	catch ( error ) {
		return Promise.reject( error ) ;
	}
} ;



/*
	Thenables.
*/



Promise.isThenable = function( value ) {
	return value && typeof value === 'object' && typeof value.then === 'function' ;
} ;



// We assume a thenable object here
Promise.fromThenable = function( thenable ) {
	if ( thenable instanceof Promise ) { return thenable ; }

	return new Promise( ( resolve , reject ) => {
		thenable.then(
			value => { resolve( value ) ; } ,
			error => { reject( error ) ; }
		) ;
	} ) ;
} ;



// When you just want a fast then() function out of anything, without any desync and unchainable
Promise._bareThen = function( value , onFulfill , onReject ) {
	//if ( Promise.isThenable( value ) )
	if( value && typeof value === 'object' ) {
		if ( value instanceof Promise ) {
			if ( value._then === Promise._fulfilledThen ) { onFulfill( value.value ) ; }
			else if ( value._then === Promise._rejectedThen ) { onReject( value.value ) ; }
			else { value._then( onFulfill , onReject ) ; }
		}
		else if ( typeof value.then === 'function' ) {
			value.then( onFulfill , onReject ) ;
		}
		else {
			onFulfill( value ) ;
		}
	}
	else {
		onFulfill( value ) ;
	}
} ;



/*
	Misc.
*/



// Internal usage, mark all promises as handled ahead of time, useful for series,
// because a warning would be displayed for unhandled rejection for promises that are not yet processed.
Promise._handleAll = function( iterable ) {
	var value ;

	for ( value of iterable ) {
		//if ( ( value instanceof Promise ) || ( value instanceof NativePromise ) )
		if ( Promise.isThenable( value ) ) {
			value.handledRejection = true ;
		}
	}
} ;



Promise.prototype._unhandledRejection = function() {
	// This promise is currently unhandled
	// If still unhandled at the end of the synchronous block of code,
	// output an error message.

	this.handledRejection = false ;

	// Don't know what is the correct way to inform node.js about that.
	// There is no doc about that, and emitting unhandledRejection,
	// does not produce what is expected.

	//process.emit( 'unhandledRejection' , this.value , this ) ;

	/*
	nextTick( () => {
		if ( this.handledRejection === false )
		{
			process.emit( 'unhandledRejection' , this.value , this ) ;
		}
	} ) ;
	*/

	// It looks like 'await' inside a 'try-catch' does not handle the promise soon enough -_-'
	//const nextTick_ = nextTick ;
	const nextTick_ = cb => setTimeout( cb , 0 ) ;

	//*
	if ( this.value instanceof Error ) {
		nextTick_( () => {
			if ( this.handledRejection === false ) {
				this.value.message = 'Unhandled promise rejection: ' + this.value.message ;
				console.error( this.value ) ;
			}
		} ) ;
	}
	else {
		// Avoid starting the stack trace in the nextTick()...
		let error_ = new Error( 'Unhandled promise rejection' ) ;
		nextTick_( () => {
			if ( this.handledRejection === false ) {
				console.error( error_ ) ;
				console.error( 'Rejection reason:' , this.value ) ;
			}
		} ) ;
	}
	//*/
} ;



Promise.prototype.isSettled = function() { return this._then.settled ; } ;



Promise.prototype.getStatus = function() {
	switch ( this._then ) {
		case Promise._dormantThen :
			return 'dormant' ;
		case Promise._pendingThen :
			return 'pending' ;
		case Promise._fulfilledThen :
			return 'fulfilled' ;
		case Promise._rejectedThen :
			return 'rejected' ;
	}
} ;



Promise.prototype.inspect = function() {
	switch ( this._then ) {
		case Promise._dormantThen :
			return 'Promise { <DORMANT> }' ;
		case Promise._pendingThen :
			return 'Promise { <PENDING> }' ;
		case Promise._fulfilledThen :
			return 'Promise { <FULFILLED> ' + this.value + ' }' ;
		case Promise._rejectedThen :
			return 'Promise { <REJECTED> ' + this.value + ' }' ;
	}
} ;



// A shared dummy promise, when you just want to return an immediately thenable
Promise.resolved = Promise.dummy = Promise.resolve() ;





/*
	Browser specific.
*/



if ( process.browser ) {
	Promise.prototype.resolveAtAnimationFrame = function( value ) {
		window.requestAnimationFrame( () => this.resolve( value ) ) ;
	} ;

	Promise.prototype.rejectAtAnimationFrame = function( error ) {
		window.requestAnimationFrame( () => this.reject( error ) ) ;
	} ;

	Promise.resolveAtAnimationFrame = function( value ) {
		return new Promise( resolve => window.requestAnimationFrame( () => resolve( value ) ) ) ;
	} ;

	Promise.rejectAtAnimationFrame = function( error ) {
		return new Promise( ( resolve , reject ) => window.requestAnimationFrame( () => reject( error ) ) ) ;
	} ;
}


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"_process":33,"setimmediate":34,"timers":44}],39:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



Promise.promisifyAll = ( nodeAsyncFn , thisBinding ) => {
	// Little optimization here to have a promisified function as fast as possible
	if ( thisBinding ) {
		return ( ... args ) => {
			return new Promise( ( resolve , reject ) => {
				nodeAsyncFn.call( thisBinding , ... args , ( error , ... cbArgs ) => {
					if ( error ) {
						if ( cbArgs.length && error instanceof Error ) { error.args = cbArgs ; }
						reject( error ) ;
					}
					else {
						resolve( cbArgs ) ;
					}
				} ) ;
			} ) ;
		} ;
	}

	return function( ... args ) {
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( this , ... args , ( error , ... cbArgs ) => {
				if ( error ) {
					if ( cbArgs.length && error instanceof Error ) { error.args = cbArgs ; }
					reject( error ) ;
				}
				else {
					resolve( cbArgs ) ;
				}
			} ) ;
		} ) ;
	} ;

} ;



// Same than .promisifyAll() but only return the callback args #1 instead of an array of args from #1 to #n
Promise.promisify = ( nodeAsyncFn , thisBinding ) => {
	// Little optimization here to have a promisified function as fast as possible
	if ( thisBinding ) {
		return ( ... args ) => {
			return new Promise( ( resolve , reject ) => {
				nodeAsyncFn.call( thisBinding , ... args , ( error , cbArg ) => {
					if ( error ) {
						if ( cbArg !== undefined && error instanceof Error ) { error.arg = cbArg ; }
						reject( error ) ;
					}
					else {
						resolve( cbArg ) ;
					}
				} ) ;
			} ) ;
		} ;
	}

	return function( ... args ) {
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( this , ... args , ( error , cbArg ) => {
				if ( error ) {
					if ( cbArg !== undefined && error instanceof Error ) { error.arg = cbArg ; }
					reject( error ) ;
				}
				else {
					resolve( cbArg ) ;
				}
			} ) ;
		} ) ;
	} ;
} ;



/*
	Pass a function that will be called every time the decoratee return something.
*/
Promise.returnValueInterceptor = ( interceptor , asyncFn , thisBinding ) => {
	return function( ... args ) {
		var returnVal = asyncFn.call( thisBinding || this , ... args ) ;
		interceptor( returnVal ) ;
		return returnVal ;
	} ;
} ;



/*
	Run only once, return always the same promise.
*/
Promise.once = ( asyncFn , thisBinding ) => {
	var triggered = false ;
	var result ;

	return function( ... args ) {
		if ( ! triggered ) {
			triggered = true ;
			result = asyncFn.call( thisBinding || this , ... args ) ;
		}

		return result ;
	} ;
} ;



/*
	The decoratee execution does not overlap, multiple calls are serialized.
*/
Promise.serialize = ( asyncFn , thisBinding ) => {
	var lastPromise = new Promise.resolve() ;

	return function( ... args ) {
		var promise = new Promise() ;

		lastPromise.finally( () => {
			Promise.propagate( asyncFn.call( thisBinding || this , ... args ) , promise ) ;
		} ) ;

		lastPromise = promise ;

		return promise ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress, but return the promise of the action in progress.
*/
Promise.debounce = ( asyncFn , thisBinding ) => {
	var inProgress = null ;

	const outWrapper = () => {
		inProgress = null ;
	} ;

	return function( ... args ) {
		if ( inProgress ) { return inProgress ; }

		inProgress = asyncFn.call( thisBinding || this , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	Like .debouce(), but the last promise is returned for some extra time after it resolved
*/
Promise.debounceDelay = ( delay , asyncFn , thisBinding ) => {
	var inProgress = null ;

	const outWrapper = () => {
		setTimeout( () => inProgress = null , delay ) ;
	} ;

	return function( ... args ) {
		if ( inProgress ) { return inProgress ; }

		inProgress = asyncFn.call( thisBinding || this , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress.
	Instead, the decoratee is called when finished once and only once, if it was tried one or more time during its progress.
	In case of multiple calls, the arguments of the last call will be used.
	The use case is .update()/.refresh()/.redraw() functions.
*/
Promise.debounceUpdate = ( asyncFn , thisBinding ) => {
	var inProgress = null ;
	var nextUpdateWith = null ;
	var nextUpdatePromise = null ;

	const outWrapper = () => {
		var args , sharedPromise ;

		inProgress = null ;

		if ( nextUpdateWith ) {
			args = nextUpdateWith ;
			nextUpdateWith = null ;
			sharedPromise = nextUpdatePromise ;
			nextUpdatePromise = null ;

			// Call the asyncFn again
			inProgress = asyncFn.call( ... args ) ;

			// Forward the result to the pending promise
			Promise.propagate( inProgress , sharedPromise ) ;

			// BTW, trigger again the outWrapper
			Promise.finally( inProgress , outWrapper ) ;

			return inProgress ;
		}
	} ;

	return function( ... args ) {
		var localThis = thisBinding || this ;

		if ( inProgress ) {
			if ( ! nextUpdatePromise ) { nextUpdatePromise = new Promise() ; }
			nextUpdateWith = [ localThis , ... args ] ;
			return nextUpdatePromise ;
		}

		inProgress = asyncFn.call( localThis , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



// Used to ensure that the sync is done immediately if not busy
Promise.NO_DELAY = {} ;

// Used to ensure that the sync is done immediately if not busy, but for the first of a batch
Promise.BATCH_NO_DELAY = {} ;

/*
	Debounce for synchronization algorithm.
	Get two functions, one for getting from upstream, one for a full sync with upstream (getting AND updating).
	No operation overlap for a given resourceId.
	Depending on the configuration, it is either like .debounce() or like .debounceUpdate().

	*Params:
		fn: the function
		thisBinding: the this binding, if any
		delay: the minimum delay between to call
			for get: nothing is done is the delay is not met, simply return the last promise
			for update/fullSync, it waits for that delay before synchronizing again
		onDebounce: *ONLY* for GET ATM, a callback called when debounced
*/
Promise.debounceSync = ( getParams , fullSyncParams ) => {
	var perResourceData = new Map() ;

	const getResourceData = resourceId => {
		var resourceData = perResourceData.get( resourceId ) ;

		if ( ! resourceData ) {
			resourceData = {
				inProgress: null ,
				inProgressIsFull: null ,
				last: null ,				// Get or full sync promise
				lastTime: null ,			// Get or full sync time
				lastFullSync: null ,		// last full sync promise
				lastFullSyncTime: null ,	// last full sync time
				nextFullSyncPromise: null ,	// the promise for the next fullSync iteration
				nextFullSyncWith: null , 	// the 'this' and arguments for the next fullSync iteration
				noDelayBatches: new Set()		// only the first of the batch has no delay
			} ;

			perResourceData.set( resourceId , resourceData ) ;
		}

		return resourceData ;
	} ;


	const outWrapper = ( resourceData , level ) => {
		// level 2: fullSync, 1: get, 0: nothing but a delay
		var delta , args , sharedPromise , now = new Date() ;
		//lastTime = resourceData.lastTime , lastFullSyncTime = resourceData.lastFullSyncTime ;

		resourceData.inProgress = null ;

		if ( level >= 2 ) { resourceData.lastFullSyncTime = resourceData.lastTime = now ; }
		else if ( level >= 1 ) { resourceData.lastTime = now ; }

		if ( resourceData.nextFullSyncWith ) {
			if ( fullSyncParams.delay && resourceData.lastFullSyncTime && ( delta = now - resourceData.lastFullSyncTime - fullSyncParams.delay ) < 0 ) {
				resourceData.inProgress = Promise.resolveTimeout( -delta + 1 ) ;	// Strangely, sometime it is trigerred 1ms too soon
				resourceData.inProgress.finally( () => outWrapper( resourceData , 0 ) ) ;
				return resourceData.nextFullSyncPromise ;
			}

			args = resourceData.nextFullSyncWith ;
			resourceData.nextFullSyncWith = null ;
			sharedPromise = resourceData.nextFullSyncPromise ;
			resourceData.nextFullSyncPromise = null ;

			// Call the fullSyncParams.fn again
			resourceData.lastFullSync = resourceData.last = resourceData.inProgress = fullSyncParams.fn.call( ... args ) ;

			// Forward the result to the pending promise
			Promise.propagate( resourceData.inProgress , sharedPromise ) ;

			// BTW, trigger again the outWrapper
			Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 2 ) ) ;

			return resourceData.inProgress ;
		}
	} ;

	const getInWrapper = function( resourceId , ... args ) {
		var noDelay = false ,
			localThis = getParams.thisBinding || this ,
			resourceData = getResourceData( resourceId ) ;

		if ( args[ 0 ] === Promise.NO_DELAY ) {
			noDelay = true ;
			args.shift() ;
		}
		else if ( args[ 0 ] === Promise.BATCH_NO_DELAY ) {
			args.shift() ;
			let batchId = args.shift() ;
			if ( ! resourceData.noDelayBatches.has( batchId ) ) {
				resourceData.noDelayBatches.add( batchId ) ;
				noDelay = true ;
			}
		}

		if ( resourceData.inProgress ) { return resourceData.inProgress ; }

		if ( ! noDelay && getParams.delay && resourceData.lastTime && new Date() - resourceData.lastTime < getParams.delay ) {
			if ( typeof getParams.onDebounce === 'function' ) { getParams.onDebounce( resourceId , ... args ) ; }
			return resourceData.last ;
		}

		resourceData.last = resourceData.inProgress = getParams.fn.call( localThis , resourceId , ... args ) ;
		resourceData.inProgressIsFull = false ;
		Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 1 ) ) ;
		return resourceData.inProgress ;
	} ;

	const fullSyncInWrapper = function( resourceId , ... args ) {
		var delta ,
			noDelay = false ,
			localThis = fullSyncParams.thisBinding || this ,
			resourceData = getResourceData( resourceId ) ;

		if ( args[ 0 ] === Promise.NO_DELAY ) {
			noDelay = true ;
			args.shift() ;
		}
		else if ( args[ 0 ] === Promise.BATCH_NO_DELAY ) {
			args.shift() ;
			let batchId = args.shift() ;
			if ( ! resourceData.noDelayBatches.has( batchId ) ) {
				resourceData.noDelayBatches.add( batchId ) ;
				noDelay = true ;
			}
		}

		if ( ! resourceData.inProgress && ! noDelay && fullSyncParams.delay && resourceData.lastFullSyncTime && ( delta = new Date() - resourceData.lastFullSyncTime - fullSyncParams.delay ) < 0 ) {
			resourceData.inProgress = Promise.resolveTimeout( -delta + 1 ) ;	// Strangely, sometime it is trigerred 1ms too soon
			Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 0 ) ) ;
		}

		if ( resourceData.inProgress ) {
			// No difference between in-progress is 'get' or 'fullSync'
			if ( ! resourceData.nextFullSyncPromise ) { resourceData.nextFullSyncPromise = new Promise() ; }
			resourceData.nextFullSyncWith = [ localThis , resourceId , ... args ] ;
			return resourceData.nextFullSyncPromise ;
		}

		resourceData.lastFullSync = resourceData.last = resourceData.inProgress = fullSyncParams.fn.call( localThis , resourceId , ... args ) ;
		Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 2 ) ) ;
		return resourceData.inProgress ;
	} ;

	return [ getInWrapper , fullSyncInWrapper ] ;
} ;



Promise.timeout = ( timeout , asyncFn , thisBinding ) => {
	return function( ... args ) {
		var promise = asyncFn.call( thisBinding || this , ... args ) ;
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		return promise ;
	} ;

} ;



// Like .timeout(), but here the timeout value is not passed at creation, but as the first arg of each call
Promise.variableTimeout = ( asyncFn , thisBinding ) => {
	return function( timeout , ... args ) {
		var promise = asyncFn.call( thisBinding || this , ... args ) ;
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		return promise ;
	} ;

} ;



/*
Promise.retry = ( retryCount , retryTimeout , timeoutMultiplier , asyncFn , thisBinding ) => {

	return ( ... args ) => {

		var lastError ,
			count = retryCount ,
			timeout = retryTimeout ,
			globalPromise = new Promise() ;

		const callAgain = () => {
			if ( count -- < 0 ) {
				globalPromise.reject( lastError ) ;
				return ;
			}

			var promise = asyncFn.call( thisBinding , ... args ) ;

			promise.then(
				//( value ) => globalPromise.resolve( value ) ,
				( value ) => {
					globalPromise.resolve( value ) ;
				} ,
				( error ) => {
					lastError = error ;
					setTimeout( callAgain , timeout ) ;
					timeout *= timeoutMultiplier ;
				}
			) ;
		} ;

		callAgain() ;

		return globalPromise ;
	} ;
} ;



Promise.variableRetry = ( asyncFn , thisBinding ) => {

	return ( retryCount , retryTimeout , timeoutMultiplier , ... args ) => {

		var lastError ,
			count = retryCount ,
			timeout = retryTimeout ,
			globalPromise = new Promise() ;

		const callAgain = () => {
			if ( count -- < 0 ) {
				globalPromise.reject( lastError ) ;
				return ;
			}

			var promise = asyncFn.call( thisBinding , ... args ) ;

			promise.then(
				( value ) => globalPromise.resolve( value ) ,
				( error ) => {
					lastError = error ;
					setTimeout( callAgain , timeout ) ;
					timeout *= timeoutMultiplier ;
				}
			) ;
		} ;

		callAgain() ;

		return globalPromise ;
	} ;
} ;
*/


},{"./seventh.js":42}],40:[function(require,module,exports){
(function (process){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



/*
	Asynchronously exit.

	Wait for all listeners of the 'asyncExit' event (on the 'process' object) to have called their callback.
	The listeners receive the exit code about to be produced and a completion callback.
*/

var exitInProgress = false ;

Promise.asyncExit = function( exitCode , timeout ) {
	// Already exiting? no need to call it twice!
	if ( exitInProgress ) { return ; }

	exitInProgress = true ;

	var listeners = process.listeners( 'asyncExit' ) ;

	if ( ! listeners.length ) { process.exit( exitCode ) ; return ; }

	if ( timeout === undefined ) { timeout = 1000 ; }

	const callListener = listener => {

		if ( listener.length < 3 ) {
			// This listener does not have a callback, it is interested in the event but does not need to perform critical stuff.
			// E.g. a server will not accept connection or data anymore, but doesn't need cleanup.
			listener( exitCode , timeout ) ;
			return Promise.dummy ;
		}

		// This listener have a callback, it probably has critical stuff to perform before exiting.
		// E.g. a server that needs to gracefully exit will not accept connection or data anymore,
		// but still want to deliver request in progress.
		return new Promise( resolve => {
			listener( exitCode , timeout , () => { resolve() ; } ) ;
		} ) ;

	} ;

	// We don't care about errors here... We are exiting!
	Promise.map( listeners , callListener )
		.finally( () => process.exit( exitCode ) ) ;

	// Quit anyway if it's too long
	setTimeout( () => process.exit( exitCode ) , timeout ) ;
} ;



// A timeout that ensure a task get the time to perform its action (when there are CPU-bound tasks)
Promise.resolveSafeTimeout = function( timeout , value ) {
	return new Promise( resolve => {
		setTimeout( () => {
			setTimeout( () => {
				setTimeout( () => {
					setTimeout( () => resolve( value ) , 0 ) ;
				} , timeout / 2 ) ;
			} , timeout / 2 ) ;
		} , 0 ) ;
	} ) ;
} ;


}).call(this,require('_process'))
},{"./seventh.js":42,"_process":33}],41:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



/*
	This parasite the native promise, bringing some of seventh features into them.
*/

Promise.parasite = () => {

	var compatibleProtoFn = [
		'tap' , 'tapCatch' , 'finally' ,
		'fatal' , 'done' ,
		'callback' , 'callbackAll'
	] ;

	compatibleProtoFn.forEach( fn => Promise.Native.prototype[ fn ] = Promise.prototype[ fn ] ) ;
	Promise.Native.prototype._then = Promise.Native.prototype.then ;
} ;


},{"./seventh.js":42}],42:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const seventh = require( './core.js' ) ;
module.exports = seventh ;

// The order matters
require( './batch.js' ) ;
require( './wrapper.js' ) ;
require( './decorators.js' ) ;
require( './Queue.js' ) ;
require( './api.js' ) ;
require( './parasite.js' ) ;
require( './misc.js' ) ;


},{"./Queue.js":35,"./api.js":36,"./batch.js":37,"./core.js":38,"./decorators.js":39,"./misc.js":40,"./parasite.js":41,"./wrapper.js":43}],43:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



Promise.timeLimit = ( timeout , asyncFnOrPromise ) => {
	return new Promise( ( resolve , reject ) => {
		if ( typeof asyncFnOrPromise === 'function' ) { asyncFnOrPromise = asyncFnOrPromise() ; }
		Promise.resolve( asyncFnOrPromise ).then( resolve , reject ) ;
		setTimeout( () => reject( new Error( "Timeout" ) ) , timeout ) ;
	} ) ;
} ;



/*
	options:
		retries: number of retry
		coolDown: time before retrying
		raiseFactor: time multiplier for each successive cool down
		maxCoolDown: maximum cool-down, the raising time is capped to this value
		timeout: time before assuming it has failed, 0 = no time limit
		catch: `function` (optional) if absent, the function is always retried until it reaches the limit,
			if present, that catch-function is used like a normal promise catch block, the function is retry
			only if the catch-function does not throw or return a rejecting promise
*/
Promise.retry = ( options , asyncFn ) => {
	var count = options.retries || 1 ,
		coolDown = options.coolDown || 0 ,
		raiseFactor = options.raiseFactor || 1 ,
		maxCoolDown = options.maxCoolDown || Infinity ,
		timeout = options.timeout || 0 ,
		catchFn = options.catch || null ;

	const oneTry = () => {
		return ( timeout ? Promise.timeLimit( timeout , asyncFn ) : asyncFn() ).catch( error => {
			if ( ! count -- ) { throw error ; }

			var currentCoolDown = coolDown ;
			coolDown = Math.min( coolDown * raiseFactor , maxCoolDown ) ;

			if ( catchFn ) {
				// Call the custom catch function
				// Let it crash, if it throw we are already in a .catch() block
				return Promise.resolve( catchFn( error ) ).then( () => Promise.resolveTimeout( currentCoolDown ).then( oneTry ) ) ;
			}

			return Promise.resolveTimeout( currentCoolDown ).then( oneTry ) ;
		} ) ;
	} ;

	return oneTry() ;
} ;



// Resolve once an event is fired
Promise.onceEvent = ( emitter , eventName ) => {
	return new Promise( resolve => emitter.once( eventName , resolve ) ) ;
} ;



// Resolve once an event is fired, resolve with an array of arguments
Promise.onceEventAll = ( emitter , eventName ) => {
	return new Promise( resolve => emitter.once( eventName , ( ... args ) => resolve( args ) ) ) ;
} ;



// Resolve once an event is fired, or reject on error
Promise.onceEventOrError = ( emitter , eventName , excludeEvents , _internalAllArgs = false ) => {
	return new Promise( ( resolve , reject ) => {
		var altRejects ;

		// We care about removing listener, especially 'error', because if an error kick in after, it should throw because there is no listener
		var resolve_ = ( ... args ) => {
			emitter.removeListener( 'error' , reject_ ) ;

			if ( altRejects ) {
				for ( let event in altRejects ) {
					emitter.removeListener( event , altRejects[ event ] ) ;
				}
			}

			resolve( _internalAllArgs ? args : args[ 0 ] ) ;
		} ;

		var reject_ = arg => {
			emitter.removeListener( eventName , resolve_ ) ;

			if ( altRejects ) {
				for ( let event in altRejects ) {
					emitter.removeListener( event , altRejects[ event ] ) ;
				}
			}

			reject( arg ) ;
		} ;

		emitter.once( eventName , resolve_ ) ;
		emitter.once( 'error' , reject_ ) ;

		if ( excludeEvents ) {
			if ( ! Array.isArray( excludeEvents ) ) { excludeEvents = [ excludeEvents ] ; }

			altRejects = {} ;

			excludeEvents.forEach( event => {
				var altReject = ( ... args ) => {
					emitter.removeListener( 'error' , reject_ ) ;
					emitter.removeListener( eventName , resolve_ ) ;

					var error = new Error( "Received an excluded event: " + event ) ;
					error.event = event ;
					error.eventArgs = args ;
					reject( error ) ;
				} ;

				emitter.once( event , altReject ) ;

				altRejects[ event ] = altReject ;
			} ) ;
		}
	} ) ;
} ;



// Resolve once an event is fired, or reject on error, resolve with an array of arguments, reject with the first argument
Promise.onceEventAllOrError = ( emitter , eventName , excludeEvents ) => {
	return Promise.onceEventOrError( emitter , eventName , excludeEvents , true ) ;
} ;


},{"./seventh.js":42}],44:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":33,"timers":44}]},{},[18]);
