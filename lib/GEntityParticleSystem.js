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

	if ( data.special.particleSystem ) {
		console.warn( "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ data.special.particleSystem" , data.special.particleSystem ) ;
		Object.assign( this.special.particleSystem , data.special.particleSystem ) ;
		this.updateParticleSystem() ;
	}
} ;



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
	this.babylon.particleSystem = particleSystem = new BABYLON.ParticleSystem( "particles" , 3000 ) ;

	//Texture of each particle
	//particleSystem.particleTexture = new BABYLON.Texture( "textures/flare.png" ) ;

	// Position where the particles are emitted from
	particleSystem.emitter = new BABYLON.Vector3( 0 , 0 , 0 ) ;
	//particleSystem.emitter = camera;

	particleSystem.minEmitBox = new BABYLON.Vector3( -80 , 50 , -80 ) ;
	particleSystem.maxEmitBox = new BABYLON.Vector3( 80 , 40 , 80 ) ;
	particleSystem.direction1 = new BABYLON.Vector3( 0 , -1 , 0 ) ;
	particleSystem.direction2 = new BABYLON.Vector3( 0 , -1 , 0 ) ;
	particleSystem.emitRate = 40 ;
	particleSystem.minLifeTime = 50 ;
	particleSystem.maxLifeTime = 50 ;
	particleSystem.updateSpeed = pData.velocity || 0.2 ;

	particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD ;
	particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD ;

    particleSystem.targetStopDuration = 0 ;	// fade out time?

	// Sprite scaling
	particleSystem.minSize = particleSystem.maxSize = 1 ;
	particleSystem.minScaleX = particleSystem.maxScaleX = pData.size.x || 0.1 ;
    particleSystem.minScaleY = particleSystem.maxScaleY = pData.size.y || 0.1 ;

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

