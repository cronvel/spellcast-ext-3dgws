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
} ;

