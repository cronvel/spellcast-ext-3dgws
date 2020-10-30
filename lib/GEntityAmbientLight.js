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



function GEntityAmbientLight( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityAmbientLight.prototype = Object.create( GEntity.prototype ) ;
GEntityAmbientLight.prototype.constructor = GEntityAmbientLight ;

module.exports = GEntityAmbientLight ;



// Light color
GEntityAmbientLight.prototype.updateLight = function( data ) {
	console.warn( "3D GEntityAmbientLight.updateColor()" , data ) ;
	if ( ! data.special.light || typeof data.special.light !== 'object' ) { return ; }

	var scene = this.gScene.babylon.scene ;

	if ( data.special.light.diffuse && typeof data.special.light.diffuse === 'object' ) {
		this.special.light.diffuse = data.special.light.diffuse ;

		if ( data.transition ) {
			data.transition.createAnimation(
				scene ,
				scene ,
				'ambientColor' ,
				Babylon.Animation.ANIMATIONTYPE_COLOR3 ,
				new Babylon.Color3( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b )
			) ;
		}
		else {
			scene.ambientColor.set( this.special.light.diffuse.r , this.special.light.diffuse.g , this.special.light.diffuse.b ) ;
		}
	}
} ;

