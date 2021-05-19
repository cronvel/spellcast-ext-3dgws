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

