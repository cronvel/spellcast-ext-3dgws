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
}

GEntityParticleSystem.prototype = Object.create( GEntity.prototype ) ;
GEntityParticleSystem.prototype.constructor = GEntityParticleSystem ;

module.exports = GEntityParticleSystem ;



GEntityParticleSystem.prototype.updateMaterial = function() {
	var texture ,
		oldTexture = this.babylon.texture ,
		scene = this.gScene.babylon.scene ,
		particleSystem = this.babylon.mesh ;

	console.warn( "3D GEntityParticleSystem.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	var url = this.variantObject.frames[ 0 ].url ;
	this.babylon.texture = texture = new BABYLON.Texture( this.dom.cleanUrl( url ) , scene ) ;

	if ( ! particleSystem ) { particleSystem = this.updateMesh() ; }

	particleSystem.particleTexture = texture ;

	if ( oldTexture ) {
		oldTexture.dispose() ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityParticleSystem.prototype.updateMesh = function() {
	var particleSystem ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	// Create a particle system
	this.babylon.mesh = particleSystem = new BABYLON.ParticleSystem( "particles" , 3000 ) ;

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
	particleSystem.updateSpeed = 0.6 ;

	particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD ;
	particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD ;

    particleSystem.targetStopDuration = 0 ;	// fade out time?

	// Sprite scaling
	particleSystem.minSize = 1 ;
	particleSystem.maxSize = 1 ;
	particleSystem.minScaleX = 0.25 ;
	particleSystem.maxScaleX = 0.25 ;
    particleSystem.minScaleY = 0.6 ;
    particleSystem.maxScaleY = 0.6 ;

	particleSystem.start() ;

	this.updateMeshNeeded = false ;

	return particleSystem ;
} ;



GEntityParticleSystem.prototype.updateThings = function() {
	// Rain particle system
	
	// Create a particle system
	var particleSystem = new BABYLON.ParticleSystem( "particles" , 3000 ) ;

	//Texture of each particle
	particleSystem.particleTexture = new BABYLON.Texture( "textures/flare.png" ) ;

	// Position where the particles are emitted from
	particleSystem.emitter = new BABYLON.Vector3( 0 , 0 , 0 ) ;
	//particleSystem.emitter = camera;

	particleSystem.minEmitBox = new BABYLON.Vector3( -20 , 5 , -20 ) ;
	particleSystem.maxEmitBox = new BABYLON.Vector3( 20 , 4 , 20 ) ;
	particleSystem.direction1 = new BABYLON.Vector3( 0 , -1 , 0 ) ;
	particleSystem.direction2 = new BABYLON.Vector3( 0 , -1 , 0 ) ;
	particleSystem.emitRate = 500 ;
	particleSystem.minLifeTime = 6 ;
	particleSystem.maxLifeTime = 6 ;
	particleSystem.updateSpeed = 0.04 ;

	particleSystem.start() ;
} ;

