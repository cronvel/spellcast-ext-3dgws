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



const Babylon = require( 'babylonjs' ) ;
const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityDirectionalLight( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityDirectionalLight.prototype = Object.create( GEntity.prototype ) ;
GEntityDirectionalLight.prototype.constructor = GEntityDirectionalLight ;

module.exports = GEntityDirectionalLight ;



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
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.special.light.direction.x , this.special.light.direction.y , this.special.light.direction.z )
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
			direction: new Babylon.Vector3( 0 , -1 , 0 ) ,
			diffuse: new Babylon.Color3( 1 , 1 , 1 ) ,
			specular: new Babylon.Color3( 0 , 0 , 0 ) ,
			intensity: 0.2
		} ;
	}

	this.babylon.light = new Babylon.DirectionalLight(
		"directionalLight" ,
		this.special.light.direction ,
		scene
	) ;

	this.babylon.light.diffuse = this.special.light.diffuse ;
	this.babylon.light.specular = this.special.light.specular ;
	this.babylon.light.intensity = this.special.light.intensity ;
} ;

