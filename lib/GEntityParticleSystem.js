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
	this.special.particleSystem = {} ;
}

GEntityParticleSystem.prototype = Object.create( GEntity.prototype ) ;
GEntityParticleSystem.prototype.constructor = GEntityParticleSystem ;

module.exports = GEntityParticleSystem ;



GEntityParticleSystem.prototype.updateSpecialStage2 = function( data ) {
	GEntity.prototype.updateSpecialStage2.call( this , data ) ;

	if ( data.special.particleSystem && typeof data.special.particleSystem === 'object' ) {
		console.warn( "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ data.special.particleSystem" , data.special.particleSystem ) ;
		let pData = data.special.particleSystem ;

		// Fix/manage
		if ( pData.duration && typeof pData.duration !== 'object' ) { pData.duration = { min: + pData.duration , max: + pData.duration } ; }
		if ( pData.rotation && typeof pData.rotation !== 'object' ) { pData.rotation = { min: + pData.rotation , max: + pData.rotation } ; }
		if ( pData.rotationSpeed && typeof pData.rotationSpeed !== 'object' ) { pData.rotationSpeed = { min: + pData.rotationSpeed , max: + pData.rotationSpeed } ; }

		Object.assign( this.special.particleSystem , pData ) ;
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



GEntityParticleSystem.prototype.updateParticleSystem = function() {
	var texture , particleSystem ,
		pData = this.special.particleSystem ,
		scene = this.gScene.babylon.scene ;

	console.warn( "3D GEntityParticleSystem.updateParticleSystem()" , this.texturePackObject , this.variantObject ) ;

	if ( this.babylon.texture ) { this.babylon.texture.dispose() ; }
	if ( this.babylon.particleSystem ) { this.babylon.particleSystem.dispose() ; }

	var url = this.variantObject.frames[ 0 ].url ;
	this.babylon.texture = texture = new BABYLON.Texture( this.dom.cleanUrl( url ) , scene ) ;

	// Create a particle system
	this.babylon.particleSystem = particleSystem = new BABYLON.ParticleSystem( "particles" , pData.capacity || 100 ) ;

	//Texture of each particle
	//particleSystem.particleTexture = new BABYLON.Texture( "textures/flare.png" ) ;

	// Position where the particles are emitted from
	particleSystem.emitter = new BABYLON.Vector3( 0 , 0 , 0 ) ;
	//particleSystem.emitter = camera;

	particleSystem.minEmitBox = new BABYLON.Vector3( pData.emitBox?.xmin || 0 , pData.emitBox?.ymin || 0 , pData.emitBox?.zmin || 0 ) ;
	particleSystem.maxEmitBox = new BABYLON.Vector3( pData.emitBox?.xmax || 0 , pData.emitBox?.ymax || 0 , pData.emitBox?.zmax || 0 ) ;
	
	// Global speed multiplier
	particleSystem.updateSpeed = ( pData.updateRate || 1 ) * 0.01 ;

	particleSystem.emitRate = pData.emitRate || 100 ;
	particleSystem.minLifeTime = pData.duration?.min || 10 ;
	particleSystem.maxLifeTime = pData.duration?.max || 10 ;
	//particleSystem.minEmitPower / particleSystem.maxEmitPower seems to multiply the speed vector

	particleSystem.blendMode = pData.blendMode && BLENDMODE[ pData.blendMode ] ? BLENDMODE[ pData.blendMode ] : BLENDMODE.default ;

	//particleSystem.targetStopDuration = 0 ;	// Duration of the particle system

	// Particle speed
	particleSystem.direction1 = 
		pData.speed1 && typeof pData.speed1 === 'object' ? new BABYLON.Vector3( + pData.speed1.x || 0 , + pData.speed1.y || 0 , + pData.speed1.z || 0 ) :
		pData.speed && typeof pData.speed === 'object' ? new BABYLON.Vector3( + pData.speed.x || 0 , + pData.speed.y || 0 , + pData.speed.z || 0 ) :
		new BABYLON.Vector3( 0 , -1 , 0 ) ;
	particleSystem.direction2 = 
		pData.speed2 && typeof pData.speed2 === 'object' ? new BABYLON.Vector3( + pData.speed2.x || 0 , + pData.speed2.y || 0 , + pData.speed2.z || 0 ) :
		pData.speed && typeof pData.speed === 'object' ? new BABYLON.Vector3( + pData.speed.x || 0 , + pData.speed.y || 0 , + pData.speed.z || 0 ) :
		new BABYLON.Vector3( 0 , -1 , 0 ) ;
	particleSystem.minInitialRotation = pData.rotation?.min || 0 ;
	particleSystem.maxInitialRotation = pData.rotation?.max || 0 ;
	particleSystem.minAngularSpeed = pData.rotationSpeed?.min || 0 ;
	particleSystem.maxAngularSpeed = pData.rotationSpeed?.max || 0 ;
	if ( pData.gravity && typeof pData.gravity === 'object' ) {
		particleSystem.gravity = new BABYLON.Vector3( + pData.gravity.x || 0 , + pData.gravity.y || 0 , + pData.gravity.z || 0 ) ;
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

	particleSystem.particleTexture = texture ;
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

