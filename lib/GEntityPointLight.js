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

