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
			maxRadius: 0 ,
		} ,
		emitRate: 100 ,
		duration: { min: 10 , max: 10 } ,
		blendMode: BLENDMODE.default ,
		speed: { x: 0 , y: 0 , z: 0 , xyzmin: 1 , xyzmax: 1 } ,
		altSpeed: { x: 0 , y: 0 , z: 0 } ,
		rotation: { min: 10 , max: 10 } ,
		rotationSpeed: { min: 10 , max: 10 } ,
		acceleration: { x: 0 , y: 0 , z: 0 } ,
		size: { x: 0 , y: 0 , xymin: 1 , xymax: 1 } ,
		color: { r: 1 , g: 1 , b: 1 , a: 1 } ,
		altColor: { r: 1 , g: 1 , b: 1 , a: 1 } ,
		endColor: { r: 1 , g: 1 , b: 1 , a: 1 } ,
		autoFacing: 'all'
	} ;

	this.emitterShape = 'box' ;
}

GEntityParticleSystem.prototype = Object.create( GEntity.prototype ) ;
GEntityParticleSystem.prototype.constructor = GEntityParticleSystem ;

module.exports = GEntityParticleSystem ;



GEntityParticleSystem.prototype.updateSpecialStage2 = function( data ) {
	var pData , newPData ;

	GEntity.prototype.updateSpecialStage2.call( this , data ) ;

	if ( data.special.particleSystem && typeof data.special.particleSystem === 'object' ) {
		console.warn( "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ data.special.particleSystem" , data.special.particleSystem ) ;
		
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

		if ( newPData.duration ) {
			if ( typeof newPData.duration !== 'object' ) {
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

		if ( newPData.altSpeed && typeof newPData.altSpeed === 'object' ) {
			if ( Number.isFinite( newPData.altSpeed.x ) ) { pData.altSpeed.x = newPData.altSpeed.x ; }
			if ( Number.isFinite( newPData.altSpeed.y ) ) { pData.altSpeed.y = newPData.altSpeed.y ; }
			if ( Number.isFinite( newPData.altSpeed.z ) ) { pData.altSpeed.z = newPData.altSpeed.z ; }
		}

		if ( newPData.acceleration && typeof newPData.acceleration === 'object' ) {
			if ( Number.isFinite( newPData.acceleration.x ) ) { pData.acceleration.x = newPData.acceleration.x ; }
			if ( Number.isFinite( newPData.acceleration.y ) ) { pData.acceleration.y = newPData.acceleration.y ; }
			if ( Number.isFinite( newPData.acceleration.z ) ) { pData.acceleration.z = newPData.acceleration.z ; }
		}

		if ( newPData.rotation ) {
			if ( typeof newPData.rotation !== 'object' ) {
				if ( Number.isFinite( newPData.rotation.min ) ) { pData.rotation.min = newPData.rotation.min ; }
				if ( Number.isFinite( newPData.rotation.max ) ) { pData.rotation.max = newPData.rotation.max ; }
			}
			else if ( Number.isFinite( newPData.rotation ) ) {
				pData.rotation.min = pData.rotation.max = newPData.rotation ;
			}
		}

		if ( newPData.rotationSpeed ) {
			if ( typeof newPData.rotationSpeed !== 'object' ) {
				if ( Number.isFinite( newPData.rotationSpeed.min ) ) { pData.rotationSpeed.min = newPData.rotationSpeed.min ; }
				if ( Number.isFinite( newPData.rotationSpeed.max ) ) { pData.rotationSpeed.max = newPData.rotationSpeed.max ; }
			}
			else if ( Number.isFinite( newPData.rotationSpeed ) ) {
				pData.rotationSpeed.min = pData.rotationSpeed.max = newPData.rotationSpeed ;
			}
		}

		if ( newPData.rotation && typeof newPData.rotation !== 'object' ) { newPData.rotation = { min: + newPData.rotation , max: + newPData.rotation } ; }
		if ( newPData.rotationSpeed && typeof newPData.rotationSpeed !== 'object' ) { newPData.rotationSpeed = { min: + newPData.rotationSpeed , max: + newPData.rotationSpeed } ; }

		this.updateParticleSystem() ;
	}
} ;



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
		//BABYLON.GPUParticleSystem.IsSupported ? new BABYLON.GPUParticleSystem( "particles" , pData.capacity || 100 ) :
		new BABYLON.ParticleSystem( "particles" , pData.capacity || 100 ) ;

	// Global speed multiplier
	particleSystem.updateSpeed = ( pData.updateRate || 1 ) * 0.01 ;

	// Texture of each particle
	particleSystem.particleTexture = texture ;

	// Position where the particles are emitted from
	if ( pData.attachToCamera ) {
		particleSystem.emitter = this.gScene.globalCamera.babylon.camera ;
	}
	else {
		// Should used origin
		particleSystem.emitter = new BABYLON.Vector3( 0 , 0 , 0 ) ;
		particleSystem.emitter = new BABYLON.Vector3( 0 , 5 , 0 ) ;
	}
	
	this.emitterShape = EMITTER_SHAPE[ pData.shape?.type ] || 'box' ;

	switch ( this.emitterShape ) {
		case 'box' :
			particleSystem.minEmitBox = new BABYLON.Vector3( pData.shape?.xmin || 0 , pData.shape?.ymin || 0 , pData.shape?.zmin || 0 ) ;
			particleSystem.maxEmitBox = new BABYLON.Vector3( pData.shape?.xmax || 0 , pData.shape?.ymax || 0 , pData.shape?.zmax || 0 ) ;
			break ;
		case 'sphere' :
			fixedDirection = true ;
			emitter = particleSystem.createSphereEmitter() ;
			emitter.radius =
				pData.shape?.maxRadius !== undefined ? + pData.shape.maxRadius :
				pData.shape?.radius !== undefined ? + pData.shape.radius :
				0 ;
			emitter.radiusRange = pData.shape?.minRadius !== undefined ? + 1 - ( pData.shape.minRadius / emitter.radius ) : 1 ;
			break ;
	}
	
	particleSystem.emitRate = pData.emitRate || 100 ;
	particleSystem.minLifeTime = pData.duration?.min || 10 ;
	particleSystem.maxLifeTime = pData.duration?.max || 10 ;
	//particleSystem.minEmitPower / particleSystem.maxEmitPower seems to multiply the speed vector

	particleSystem.blendMode = pData.blendMode && BLENDMODE[ pData.blendMode ] ? BLENDMODE[ pData.blendMode ] : BLENDMODE.default ;

	//particleSystem.targetStopDuration = 0 ;	// Duration of the particle system

	// Particle movement
	if ( ! fixedDirection ) {
		particleSystem.direction1 = 
			pData.speed1 && typeof pData.speed1 === 'object' ? new BABYLON.Vector3( + pData.speed1.x || 0 , + pData.speed1.y || 0 , + pData.speed1.z || 0 ) :
			pData.speed && typeof pData.speed === 'object' ? new BABYLON.Vector3( + pData.speed.x || 0 , + pData.speed.y || 0 , + pData.speed.z || 0 ) :
			new BABYLON.Vector3( 0 , -1 , 0 ) ;
		particleSystem.direction2 = 
			pData.speed2 && typeof pData.speed2 === 'object' ? new BABYLON.Vector3( + pData.speed2.x || 0 , + pData.speed2.y || 0 , + pData.speed2.z || 0 ) :
			pData.speed && typeof pData.speed === 'object' ? new BABYLON.Vector3( + pData.speed.x || 0 , + pData.speed.y || 0 , + pData.speed.z || 0 ) :
			new BABYLON.Vector3( 0 , -1 , 0 ) ;
	}

	particleSystem.minEmitPower = pData.speed?.xyzmin !== undefined ? pData.speed.xyzmin : 1 ;
	particleSystem.maxEmitPower = pData.speed?.xyzmax !== undefined ? pData.speed.xyzmax : 1 ;
	particleSystem.minInitialRotation = pData.rotation?.min || 0 ;
	particleSystem.maxInitialRotation = pData.rotation?.max || 0 ;
	particleSystem.minAngularSpeed = pData.rotationSpeed?.min || 0 ;
	particleSystem.maxAngularSpeed = pData.rotationSpeed?.max || 0 ;

	if ( pData.acceleration && typeof pData.acceleration === 'object' ) {
		particleSystem.gravity = new BABYLON.Vector3( + pData.acceleration.x || 0 , + pData.acceleration.y || 0 , + pData.acceleration.z || 0 ) ;
	}

	// Sprite scaling
	particleSystem.minSize =
		pData.size.xymin !== undefined ? + pData.size.xymin :
		pData.size.xy !== undefined ? + pData.size.xy :
		1 ;
	particleSystem.maxSize =
		pData.size.xymax !== undefined ? + pData.size.xymax :
		pData.size.xy !== undefined ? + pData.size.xy :
		1 ;
	particleSystem.minScaleX =
		pData.size.xmin !== undefined ? + pData.size.xmin :
		pData.size.x !== undefined ? + pData.size.x :
		1 ;
	particleSystem.maxScaleX =
		pData.size.xmax !== undefined ? + pData.size.xmax :
		pData.size.x !== undefined ? + pData.size.x :
		1 ;
	particleSystem.minScaleY =
		pData.size.ymin !== undefined ? + pData.size.ymin :
		pData.size.y !== undefined ? + pData.size.y :
		1 ;
	particleSystem.maxScaleY =
		pData.size.ymax !== undefined ? + pData.size.ymax :
		pData.size.y !== undefined ? + pData.size.y :
		1 ;

	// Color tinting
	particleSystem.color1 = 
		pData.color1 && typeof pData.color1 === 'object' ? new BABYLON.Color4( + pData.color1.r || 0 , + pData.color1.g || 0 , + pData.color1.b || 0 , + pData.color1.a || 0 ) :
		pData.color && typeof pData.color === 'object' ? new BABYLON.Color4( + pData.color.r || 0 , + pData.color.g || 0 , + pData.color.b || 0 , + pData.color.a || 0 ) :
		new BABYLON.Color4( 1 , 1 , 1 , 1 ) ;
	particleSystem.color2 = 
		pData.color2 && typeof pData.color2 === 'object' ? new BABYLON.Color4( + pData.color2.r || 0 , + pData.color2.g || 0 , + pData.color2.b || 0 , + pData.color2.a || 0 ) :
		pData.color && typeof pData.color === 'object' ? new BABYLON.Color4( + pData.color.r || 0 , + pData.color.g || 0 , + pData.color.b || 0 , + pData.color.a || 0 ) :
		new BABYLON.Color4( 1 , 1 , 1 , 1 ) ;
	particleSystem.colorDead = 
		pData.endColor && typeof pData.endColor === 'object' ? new BABYLON.Color4( + pData.endColor.r || 0 , + pData.endColor.g || 0 , + pData.endColor.b || 0 , + pData.endColor.a || 0 ) :
		pData.color && typeof pData.color === 'object' ? new BABYLON.Color4( + pData.color.r || 0 , + pData.color.g || 0 , + pData.color.b || 0 , + pData.color.a || 0 ) :
		new BABYLON.Color4( 1 , 1 , 1 , 0 ) ;

	if ( pData.autoFacing === false ) {
		particleSystem.isBillboardBased = false ;
	}
	else if ( pData.autoFacing === true ) {
		particleSystem.isBillboardBased = true ;
		particleSystem.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_ALL ;
	}
	else if ( pData.autoFacing ) {
		switch ( pData.autoFacing.toLowerCase() ) {
			case 'none' : 
				particleSystem.isBillboardBased = false ;
				break ;
			case 'y' : 
			case 'y-axis' : 
				particleSystem.isBillboardBased = true ;
				particleSystem.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_Y ;
				break ;
			case 'all' : 
			case 'all-axis' : 
			default :
				particleSystem.isBillboardBased = true ;
				particleSystem.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_ALL ;
				break ;
		}
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
} ;



GEntityParticleSystem.prototype.updateRotation = function( data , volatile = false ) {
} ;



GEntityParticleSystem.prototype.updateSize = function( size , volatile = false , isClientMod = false ) {
} ;

