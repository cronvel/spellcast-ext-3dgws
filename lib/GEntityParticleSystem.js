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
	
	// Use rendering group 1 instead of 0, so it is rendered AFTER alpha-blended mesh like GEntityShadow
	particleSystem.renderingGroupId = 1 ;

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
			particleSystem ,
			'emitter' ,
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

